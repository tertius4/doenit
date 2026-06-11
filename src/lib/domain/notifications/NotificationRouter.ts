import { goto } from "$app/navigation";

export const NotificationRouter = {
  async open(notification: DB.Notification): Promise<void> {
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
      case "group_removed":
        await goto("/groups");
        break;
      case "task_assigned":
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
};
