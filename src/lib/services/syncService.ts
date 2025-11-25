import { DB } from "$lib/DB";
import { OnlineDB } from "$lib/OnlineDB";
import { Secure } from "$lib/core/secure";
import { user } from "$lib/base/user.svelte";
import { Cached } from "$lib/core/cache.svelte";

export class SyncService {
  private static instance: SyncService;
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  startBackgroundSync(): void {
    if (this.syncInterval) return;

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && user.is_friends_enabled) {
        this.syncPendingTasks().catch(console.warn);
      }
    }, 30000);

    // Also sync when coming back online
    window.addEventListener("online", this.handleOnline);
  }

  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove event listener
    window.removeEventListener("online", this.handleOnline);
  }

  private handleOnline = (): void => {
    if (user.is_friends_enabled) {
      this.syncPendingTasks().catch(console.warn);
    }
  };

  private async syncPendingTasks(): Promise<void> {
    try {
      const pending_task_ids = this.getPendingTaskIds();
      if (pending_task_ids.length === 0) return;

      // Get tasks that need syncing
      const tasks = await DB.Task.getAll({
        selector: { id: { $in: pending_task_ids }, category_id: { $exists: true } },
      });
      // Create hash with task IDs as keys and tasks as values (or null if not found)
      const TASK_HASH = pending_task_ids.reduce(
        (acc, id) => {
          acc[id] = null;
          return acc;
        },
        {} as Record<string, (typeof tasks)[number] | null>
      );

      // Populate hash with actual tasks
      for (const task of tasks) {
        TASK_HASH[task.id] = task;
      }

      const online_tasks = await OnlineDB.Task.readMany({
        filters: [{ field: "task_id", operator: "in", value: pending_task_ids }],
      });

      const ONLINE_TASK_HASH = online_tasks.reduce(
        (acc, task) => {
          acc[task.task_id] = task;
          return acc;
        },
        {} as Record<string, (typeof online_tasks)[number]>
      );

      for (const id of pending_task_ids) {
        const task = TASK_HASH[id];
        const online_task = ONLINE_TASK_HASH[id];
        if (!task && !!online_task) {
          try {
            online_task.deleted = true;
            const db_task = await Secure.decryptAndDecompress(online_task.data);
            await OnlineDB.Task.deleteWithNotification(online_task.id, online_task, db_task);
            this.removePendingTaskId(id);
            continue;
          } catch (error) {}
          continue;
        }

        if (!task?.category_id) continue;

        try {
          const encrypted_data = await Secure.compressAndEncrypt(task);

          if (online_task) {
            await OnlineDB.Task.updateWithNotification(
              online_task.id,
              {
                id: online_task.id,
                task_id: task.id,
                category_id: task.category_id || "",
                data: encrypted_data || "",
              },
              task
            );
          } else {
            await OnlineDB.Task.createWithNotification(
              {
                task_id: task.id,
                category_id: task.category_id || "",
                data: encrypted_data || "",
              },
              task
            );
          }

          // Remove from pending sync queue
          this.removePendingTaskId(task.id);
          console.log(`Successfully synced task ${task.id}`);
        } catch (error) {
          console.warn(`Failed to sync task ${task.id}:`, error);
          // Keep in queue for next attempt
        }
      }
    } catch (error) {
      console.warn("Background sync failed:", error);
    }
  }

  /**
   * Get tasks that need syncing from cache
   * @private
   */
  private getPendingTaskIds(): string[] {
    return Cached.pendingTaskSync.value || [];
  }

  /**
   * Add task to pending sync queue
   */
  addPendingTaskId(task_id: string): void {
    try {
      const pending_sync = this.getPendingTaskIds();
      if (!pending_sync.includes(task_id)) {
        pending_sync.push(task_id);
        Cached.pendingTaskSync.value = pending_sync;
      }
    } catch (error) {
      console.warn("Could not add task to pending sync:", error);
    }
  }

  /**
   * Remove task from pending sync queue
   * @private
   */
  private removePendingTaskId(task_id: string): void {
    try {
      const pending_sync = this.getPendingTaskIds();
      const updated = pending_sync.filter((id: string) => id !== task_id);
      Cached.pendingTaskSync.value = updated;
    } catch (error) {
      console.warn("Could not remove pending task:", error);
    }
  }
}
