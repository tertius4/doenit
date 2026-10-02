/**
 * The stored title/body are an English fallback (also usable as push text later).
 * The inbox renders translated text from `type` + `data` in the recipient's language
 * (see $display/notifications/text.ts), so keep `data` complete.
 */

import firestore from "$services/firestore";
import DB from "$domain/db";
import { patchSyncCursors, withClockSkew } from "$domain/sync/cursors";
import { context } from "$logic/context.svelte";

type CreateNotificationInput = {
  user_id: string;
  type: DB.NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function myFirebaseUid(): string | null {
  return context.user?.firebase_uid ?? null;
}

function myLocalId(): string | null {
  return context.user?.id ?? null;
}

export const NotificationService = {
  async create(input: CreateNotificationInput): AsyncResult<DB.Notification> {
    try {
      const now = new Date().toISOString();
      const notification: DB.Notification = {
        id: crypto.randomUUID(),
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        body: input.body,
        read_at: null,
        data: input.data ?? {},
        created_at: now,
        updated_at: now,
      };

      await firestore.upsertNotification(input.user_id, notification);

      if (input.user_id === myFirebaseUid()) {
        await DB.notification.upsert(notification);
      }

      return { ok: true, value: notification };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  },

  async createInviteReceived(invite: DB.ContactInvite): AsyncResult<DB.Notification> {
    return this.create({
      user_id: invite.to_firebase_uid,
      type: "invite_received",
      title: "New contact invite",
      body: `${invite.from_email} wants to connect with you.`,
      data: {
        invite_id: invite.id,
        from_user_id: invite.from_firebase_uid,
        email: invite.from_email,
      },
    });
  },

  async createInviteAccepted(invite: DB.ContactInvite): AsyncResult<DB.Notification> {
    return this.create({
      user_id: invite.from_firebase_uid,
      type: "invite_accepted",
      title: "Contact invite accepted",
      body: `${invite.to_email} accepted your invite.`,
      data: {
        invite_id: invite.id,
        from_user_id: invite.to_firebase_uid,
        email: invite.to_email,
      },
    });
  },

  async createAddedToGroup(user_id: string, group: DB.Group): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "group_added",
      title: "Added to group",
      body: `You were added to ${group.name}.`,
      data: {
        group_id: group.id,
        group_name: group.name,
      },
    });
  },

  async createRemovedFromGroup(user_id: string, group: DB.Group): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "group_removed",
      title: "Removed from group",
      body: `You were removed from ${group.name}.`,
      data: {
        group_id: group.id,
        group_name: group.name,
      },
    });
  },

  async createGroupDeleted(user_id: string, group: DB.Group): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "group_deleted",
      title: "Group deleted",
      body: `${group.name} was deleted.`,
      data: {
        group_id: group.id,
        group_name: group.name,
      },
    });
  },

  async createUserLeftGroup(user_id: string, group: DB.Group, user_name: string): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "user_left_group",
      title: "Member left group",
      body: `${user_name} left ${group.name}.`,
      data: {
        group_id: group.id,
        group_name: group.name,
        user_name,
      },
    });
  },

  async createTaskAssigned(user_id: string, task: DB.Task): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "task_assigned",
      title: "New task assigned",
      body: `Task "${task.name}" was assigned to you.`,
      data: {
        task_id: task.id,
        task_name: task.name,
        ...(task.scope_id ? { group_id: task.scope_id } : {}),
      },
    });
  },

  async createTaskCompleted(
    user_id: string,
    task: DB.Task,
    group: DB.Group,
    user_name: string,
  ): AsyncResult<DB.Notification> {
    return this.create({
      user_id,
      type: "task_completed",
      title: "A task is done!",
      body: `${user_name} completed "${task.name}" in ${group.name}.`,
      data: {
        task_id: task.id,
        task_name: task.name,
        group_id: group.id,
        category_name: group.name,
        user_name,
      },
    });
  },

  async pull(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const state = await DB.user_state.get(my_local_id);
    const since = state.ok ? withClockSkew(state.value.sync_cursors?.["__notifications"]) : undefined;
    const remote = await firestore.fetchNotifications(my_uid, since);
    if (!remote.length) return;

    for (const notification of remote) {
      // Our own markAsRead writes come back on the next pull; skip what is already up to date locally.
      const local = await DB.notification.findById(notification.id);
      if (local.ok && local.value && local.value.updated_at >= notification.updated_at) continue;

      await DB.notification.upsert(notification);
    }

    const latest = remote[remote.length - 1].updated_at;
    await patchSyncCursors(my_local_id, { __notifications: latest });
  },

  async markAsRead(notification: DB.Notification): AsyncResult<DB.Notification> {
    const my_uid = myFirebaseUid();
    if (!my_uid || notification.user_id !== my_uid) return { ok: false, error: "Not your notification" };

    const read_at = notification.read_at ?? new Date().toISOString();
    const updated: DB.Notification = {
      ...notification,
      read_at,
      updated_at: read_at,
    };

    try {
      // Local first so reading works offline; the remote write is best-effort.
      await DB.notification.upsert(updated);
      firestore
        .upsertNotification(my_uid, updated)
        .catch((error) => console.warn("[notifications] failed to sync read state:", error));
      return { ok: true, value: updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  },
};
