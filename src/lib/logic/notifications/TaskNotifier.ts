/**
 * Inbox (and therefore push) notifications for the two task events that matter to other people:
 * a task being assigned to them, and a shared task being completed. Plain edits never notify.
 * Best-effort: failures are logged and never fail the user action.
 */

import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import { NotificationService } from "$logic/notifications/NotificationService";

function actorName(): string {
  return context.user?.name || context.user?.email_address || "";
}

export const TaskNotifier = {
  /** Call after a task is created or updated. Notifies only when the assignee is someone else and just changed. */
  async assigned(task: DB.Task, previous_assignee?: string | null): Promise<void> {
    try {
      const assignee = task.assigned_firebase_uid;
      if (!assignee || assignee === previous_assignee || assignee === context.user?.firebase_uid) return;

      const result = await NotificationService.createTaskAssigned(assignee, task);
      if (!result.ok) console.warn("[notifications] failed to notify task assignment:", result.error);
    } catch (error) {
      console.warn("[notifications] failed to notify task assignment:", error);
    }
  },

  /** Call when a task goes from open to completed. Notifies the other members of the task's group. */
  async completed(task: DB.Task): Promise<void> {
    try {
      if (!task.scope_id) return;

      const my_uid = context.user?.firebase_uid;
      const [group, members] = await Promise.all([
        DB.group.findById(task.scope_id),
        DB.member.findMany({ selector: { scope_id: task.scope_id, soft_deleted: { $ne: true } } }),
      ]);
      if (!group.ok || !group.value || !members.ok) return;

      const recipients = members.value.filter((member) => member.firebase_uid && member.firebase_uid !== my_uid);
      const results = await Promise.all(
        recipients.map((member) =>
          NotificationService.createTaskCompleted(member.firebase_uid, task, group.value!, actorName()),
        ),
      );
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) console.warn("[notifications] failed to notify task completion:", failed.error);
    } catch (error) {
      console.warn("[notifications] failed to notify task completion:", error);
    }
  },
};
