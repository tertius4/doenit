import { goto } from "$app/navigation";

export const NotificationRouter = {
  async open(notification: Pick<DB.Notification, "type" | "data">): Promise<void> {
    switch (notification.type) {
      case "invite_received":
      case "invite_accepted":
        await goto("/contacts");
        break;
      case "group_added":
        if (typeof notification.data.group_id === "string") {
          await goto(`/groups/${notification.data.group_id}`);
        } else {
          await goto("/groups");
        }
        break;
      case "user_left_group":
        if (typeof notification.data.group_id === "string") {
          await goto(`/groups/${notification.data.group_id}`);
        } else {
          await goto("/groups");
        }
        break;
      case "group_removed":
      case "group_deleted":
        await goto("/groups");
        break;
      case "task_assigned":
      case "task_completed":
      case "mentioned":
        if (typeof notification.data.task_id === "string") {
          await goto(`/${notification.data.task_id}`);
        } else {
          await goto("/");
        }
        break;
      default:
        await goto("/");
    }
  },

  /** Opens the screen for a tapped local reminder. */
  async openReminder(extra: AL.Notification["extra"]): Promise<void> {
    await goto(extra?.task_id ? `/${extra.task_id}` : "/");
  },
};
