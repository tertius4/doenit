/**
 * TODO: Afrikaanse weergawes!!!
 */

import firestore from "$services/firestore";
import DB from "$domain/db";
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

  async pull(): Promise<void> {
    const my_uid = myFirebaseUid();
    const my_local_id = myLocalId();
    if (!my_uid || !my_local_id) return;

    const state = await DB.user_state.get(my_local_id);
    const since = state.ok ? state.value.sync_cursors?.["__notifications"] : undefined;
    const remote = await firestore.fetchNotifications(my_uid, since);
    if (!remote.length) return;

    for (const notification of remote) {
      await DB.notification.upsert(notification);
    }

    const latest = remote[remote.length - 1].updated_at;
    await DB.user_state.update(my_local_id, {
      sync_cursors: {
        ...(state.ok ? state.value.sync_cursors : {}),
        __notifications: latest,
      },
    });
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
      await firestore.upsertNotification(my_uid, updated);
      await DB.notification.upsert(updated);
      return { ok: true, value: updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  },
};
