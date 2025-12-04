import type { RxCollection } from "$lib/chunk/rxdb";
import { DateUtil } from "$lib/core/date_util";
import { Secure } from "$lib/core/secure";
import { user } from "$lib/base/user.svelte";

import { SyncService } from "$lib/services/syncService";
import { Photos } from "$lib/services/photos.svelte";
import { t } from "$lib/services/language.svelte";

import { Table } from "./_Table";
import { DB } from "$lib/DB";
import { OnlineDB } from "$lib/OnlineDB";

export class TaskTable extends Table<Task> {
  constructor(collection: RxCollection<Task>) {
    super(collection);
  }

  async create(
    task: Omit<Task, "id" | "created_at" | "updated_at"> & { id?: string; updated_at?: string; created_at?: string }
  ): Promise<Task> {
    if (!task) throw Error(t("no_task_found"));
    if (!task.name?.trim()) throw Error(t("what_must_be_done"));

    if (!!task.start_date && !!task.due_date && task.start_date > task.due_date) {
      throw Error(t("start_date_before_end"));
    }

    if (task.id) {
      const existing_task = await super.get(task.id);
      if (existing_task) {
        // Check updated_at
        if (task.updated_at && existing_task.updated_at > task.updated_at) {
          return this.update(task.id, task);
        } else {
          return existing_task;
        }
      }
    }

    task.completed = 0;
    task.archived = false;

    task.name = task.name.trim();
    // task.description = task.description?.trim() ?? "";

    if (task.archived && !task.completed) {
      task.archived = false;
    }

    if (!!task.completed && !task.repeat_interval) {
      if (!task.completed_at) task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
      if (!task.archived) task.archived = true;
    }

    const db_task = await super.create(task);

    // Handle online sync asynchronously and only if online
    if (db_task.category_id && !!user.is_friends_enabled) {
      // Don't await this - let it run in background
      this.syncTaskToOnline(db_task);
    }

    return db_task;
  }

  async update(id: string, task: Task): Promise<Task | null> {
    if (!task) throw Error(t("no_task_found"));
    if (!task.name?.trim()) throw Error(t("what_must_be_done"));

    if (!!task.start_date && !!task.due_date && task.start_date > task.due_date) {
      throw Error(t("start_date_before_end"));
    }

    task.name = task.name.trim();

    if (task.archived && !task.completed) {
      task.archived = false;
    }

    if (!!task.completed && !task.repeat_interval) {
      if (!task.completed_at) task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
      if (!task.archived) task.archived = true;
    }

    const db_task = await super.update(id, task);

    // Handle online sync asynchronously and only if online
    if (db_task?.category_id && !!user.is_friends_enabled) {
      // Don't await this - let it run in background
      this.syncTaskUpdateToOnline(db_task);
    }

    return db_task;
  }

  /**
   * Override delete to cleanup photos
   */
  async delete(ids: string | string[]): Promise<void> {
    if (!Array.isArray(ids)) ids = [ids];

    // Get all tasks to be deleted and their photos
    const tasks = await Promise.all(ids.map((id) => this.get(id)));

    // Collect all photo IDs to delete
    const photo_ids: string[] = [];
    for (const task of tasks) {
      if (task?.photo_ids?.length) {
        photo_ids.push(...task.photo_ids);
      }
    }

    // Delete the tasks
    await super.delete(ids);

    // Delete the photos
    if (photo_ids.length > 0) {
      await Photos.deletePhotos(photo_ids);
    }

    // Handle online sync asynchronously and only if online
    if (!!user.is_friends_enabled) {
      // Don't await this - let it run in background
      this.syncTaskDeleteToOnline({ ids, delete: true });
    }
  }

  async completeId(task_id: string) {
    const task = await this.get(task_id);
    if (!task) throw new Error("Task not found");

    return this.complete(task);
  }

  async complete(task: Task) {
    const is_repeat_task = task.repeat_interval && task.start_date;
    if (is_repeat_task) {
      task.completed++;
      task.start_date = getNextStartDate(task);
      task.due_date = getNextDueDate(task);
    } else {
      task.completed = 1;
      task.archived = true;
    }

    task.completed_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
    return this.update(task.id, task);
  }

  uncomplete(task: Task) {
    task.completed = 0;
    task.archived = false;
    return this.update(task.id, task);
  }

  /**
   * Sync online tasks to local DB
   * @param online_tasks
   */
  async sync(online_tasks: OnlineTask[]) {
    try {
      const promises = online_tasks.map((online_task) => {
        if (online_task.deleted) {
          return super.delete(online_task.task_id).then(() => null);
        }

        return Secure.decryptAndDecompress(online_task.data) as Promise<Task>;
      });

      const all_tasks = await Promise.all(promises);

      for (const task of all_tasks) {
        if (!task) continue;

        const existing_task = await super.get(task.id).catch(() => null);
        if (existing_task) {
          // Check updated_at
          const online_updated = task.updated_at ? new Date(task.updated_at) : null;
          const local_updated = existing_task.updated_at ? new Date(existing_task.updated_at) : null;
          if (online_updated && local_updated && online_updated > local_updated) {
            await super.update(task.id, task);
          }
        } else {
          await super.create(task);
        }
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`[sync] Fout gedurende sinkronisasie: ${error_message}`);
    }
  }

  /**
   * Sync task to online database in the background
   * @private
   */
  async syncTaskToOnline(db_task: Task): Promise<void> {
    try {
      // Check if online first
      if (!navigator.onLine) {
        throw new Error("Offline - will sync later");
      }

      const category = await DB.Category.get(db_task.category_id!);
      if (!category) return;

      const email_addresses = DB.Category.getNotificationEmails(category);
      if (!email_addresses.length) return;

      const encrypted_data = await Secure.compressAndEncrypt(db_task);
      await OnlineDB.Task.createWithNotification(
        {
          task_id: db_task.id,
          category_id: db_task.category_id || "",
          data: encrypted_data || "",
        },
        db_task
      );
    } catch (error: any) {
      // Mark task for later sync when online
      this.markForSync(db_task.id);
      throw error;
    }
  }

  /**
   * Sync task update to online database in the background
   * @private
   */
  private async syncTaskUpdateToOnline(db_task: Task): Promise<void> {
    try {
      // Check if online first
      if (!navigator.onLine) {
        throw new Error("Offline - will sync later");
      }

      const [encrypted_data, [online_task_encrypted]] = await Promise.all([
        Secure.compressAndEncrypt(db_task),
        OnlineDB.Task.readMany({ filters: [{ field: "task_id", operator: "==", value: db_task.id }] }),
      ]);

      if (online_task_encrypted) {
        const online_task = (await Secure.decryptAndDecompress(online_task_encrypted.data)) as Task;
        if (online_task.completed < db_task.completed) {
          await OnlineDB.Task.completeWithNotification(
            online_task_encrypted.id,
            {
              id: online_task_encrypted.id,
              task_id: db_task.id,
              category_id: db_task.category_id || "",
              data: encrypted_data || "",
            },
            db_task
          );
        } else {
          await OnlineDB.Task.updateWithNotification(
            online_task_encrypted.id,
            {
              id: online_task_encrypted.id,
              task_id: db_task.id,
              category_id: db_task.category_id || "",
              data: encrypted_data || "",
            },
            db_task
          );
        }
      } else {
        await OnlineDB.Task.createWithNotification(
          {
            task_id: db_task.id,
            category_id: db_task.category_id || "",
            data: encrypted_data || "",
          },
          db_task
        );
      }
    } catch (error: any) {
      // Mark task for later sync when online
      this.markForSync(db_task.id);
      throw error;
    }
  }

  private async syncTaskDeleteToOnline(params: { ids: string[]; delete: true }): Promise<void> {
    try {
      // Check if online first
      if (!navigator.onLine) {
        throw new Error("Offline - will sync later");
      }

      const online_tasks = await OnlineDB.Task.readMany({
        filters: [{ field: "task_id", operator: "in", value: params.ids }],
      });

      const delete_promises = online_tasks.map(async (online_task) => {
        const db_task = await Secure.decryptAndDecompress(online_task.data);
        await OnlineDB.Task.deleteWithNotification(online_task.id, online_task, db_task);
      });

      await Promise.all(delete_promises);
    } catch (error: any) {
      // Mark tasks for later sync when online
      for (const id of params.ids) {
        this.markForSync(id);
      }
      throw error;
    }
  }

  /**
   * Mark task that needs syncing later
   * @private
   */
  private markForSync(task_id: string): void {
    try {
      SyncService.getInstance().addPendingTaskId(task_id);
    } catch (error) {
      console.warn("Could not mark task for sync:", error);
    }
  }
}

const REPEAT_INTERVALS: Record<string, (arg0: { date: Date; num?: number; specific_days?: number[] }) => number> = {
  daily: ({ date, num = 1 }) => date.setDate(date.getDate() + 1 * num),
  workdaily: ({ date }) => {
    const new_date = new Date(date);

    const day_of_week = new_date.getDay();
    if (day_of_week === 5) return date.setDate(date.getDate() + 3);
    if (day_of_week === 6) return date.setDate(date.getDate() + 2);

    return date.setDate(date.getDate() + 1);
  },
  weekly: ({ date, num = 1 }) => date.setDate(date.getDate() + 7 * num),
  weekly_custom_days: ({ date, specific_days = [] }) => {
    if (!specific_days.length) return date.setDate(date.getDate() + 7);

    const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let daysToAdd = 7; // Default to next week if no day found this week

    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7; // Stay between 0 and 6.

      if (specific_days.includes(checkDay)) {
        daysToAdd = i;
        break;
      }
    }

    return date.setDate(date.getDate() + daysToAdd);
  },
  monthly: ({ date, num = 1 }) => date.setMonth(date.getMonth() + 1 * num),
  yearly: ({ date, num = 1 }) => date.setFullYear(date.getFullYear() + 1 * num),
};

function getNextDueDate(task: Task) {
  if (!task.repeat_interval || !task.due_date) return null;

  const has_time = task.due_date.includes(" ");
  const calcNextDay = REPEAT_INTERVALS[task.repeat_interval];
  const new_day = new Date(
    calcNextDay({
      date: new Date(task.due_date),
      num: task.repeat_interval_number,
      specific_days: task.repeat_specific_days,
    })
  );

  return DateUtil.format(new_day, has_time ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
}

function getNextStartDate(task: Task) {
  if (!task.repeat_interval || !task.start_date) return null;

  const has_time = task.start_date.includes(" ");
  const calcNextDay = REPEAT_INTERVALS[task.repeat_interval];
  const new_day = new Date(
    calcNextDay({
      date: new Date(task.start_date),
      num: task.repeat_interval_number,
      specific_days: task.repeat_specific_days,
    })
  );

  return DateUtil.format(new_day, has_time ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
}
