import user from "$lib/core/user.svelte";
import { DB } from "$lib/DB";
import { Notify } from "$lib/services/notifications/notifications";
import { Table } from "./_Table";

export class TaskTable extends Table<OnlineTask> {
  constructor() {
    super("tasks");
  }

  async createWithNotification(task: Omit<OnlineTask, "id">, db_task: Task): Promise<SimpleResult> {
    const result = await super.create(task);
    if (!result.success) return result;

    // Send notification
    const room = await DB.Room.get(task.room_id);
    if (!room) return { success: true };

    await Notify.Push.sendTemplate({
      type: "new_task",
      data: {
        sender_name: user.value?.name,
        task_name: db_task.name,
        room_id: room.id,
      },
      email_address: DB.Room.getNotificationEmails(room),
    });

    return { success: true };
  }

  async updateWithNotification(id: string, task: OnlineTask, db_task: Task): Promise<SimpleResult> {
    const result = await super.updateById(id, task);
    if (!result.success) return result;

    // Send notification
    const room = await DB.Room.get(task.room_id);
    if (!room) return { success: true };

    await Notify.Push.sendTemplate({
      type: "task_updated",
      data: {
        sender_name: user.value?.name,
        task_name: db_task.name,
        room_id: room.id,
      },
      email_address: DB.Room.getNotificationEmails(room),
    });

    return { success: true };
  }

  async deleteWithNotification(id: string, task: OnlineTask, db_task: Task): Promise<SimpleResult> {
    task.deleted = true;
    const result = await super.updateById(id, task);
    if (!result.success) return result;

    // Send notification
    const room = await DB.Room.get(task.room_id);
    if (!room) return { success: true };

    await Notify.Push.sendTemplate({
      type: "task_deleted",
      data: {
        sender_name: user.value?.name,
        task_name: db_task.name,
        room_id: room.id,
      },
      email_address: DB.Room.getNotificationEmails(room),
    });

    return { success: true };
  }
}
