import { DB } from "$lib/DB";
import { DateUtil } from "$lib/core/date_util";

export class DailySummary {
  /**
   * Get comprehensive data for a specific date
   */
  static async getDataForDate(date: Date): Promise<DailySummaryData> {
    const start_of_day = new Date(date);
    start_of_day.setHours(0, 0, 0, 0);
    const end_of_day = new Date(date);
    end_of_day.setHours(23, 59, 59, 999);

    const start_of_tomorrow = new Date(date);
    start_of_tomorrow.setDate(start_of_tomorrow.getDate() + 1);
    start_of_tomorrow.setHours(0, 0, 0, 0);
    const end_of_tomorrow = new Date(start_of_tomorrow);
    end_of_tomorrow.setHours(23, 59, 59, 999);

    // Get all non-archived tasks
    const all_tasks = await DB.Task.getAll({});

    // Filter tasks by different criteria
    const completed_today = all_tasks.filter((task) => {
      if (!task.completed_at) return false;
      const completed_date = new Date(task.completed_at);
      return DateUtil.isSameDay(completed_date, start_of_day);
    });

    const created_today = all_tasks.filter((task) => {
      const created_date = new Date(task.created_at);
      return DateUtil.isSameDay(created_date, start_of_day);
    });

    const incomplete_due_today = all_tasks.filter((task) => {
      if (!task.start_date) return false;
      if (task.completed > 0 && !task.repeat_interval) return false;

      const task_date = new Date(task.start_date);
      return DateUtil.isSameDay(task_date, start_of_day);
    });

    const due_tomorrow = all_tasks.filter((task) => {
      if (!task.start_date) return false;
      if (task.completed > 0 && !task.repeat_interval) return false;

      const task_date = new Date(task.start_date);
      return DateUtil.isSameDay(task_date, start_of_tomorrow);
    });

    const overdue_tasks = all_tasks.filter((task) => {
      if (!task.start_date) return false;
      if (task.completed > 0 && !task.repeat_interval) return false;

      const task_date = new Date(task.start_date);
      return task_date < start_of_day;
    });

    const total_due = completed_today.length + incomplete_due_today.length;
    const completion_rate = total_due > 0 ? completed_today.length / total_due : 0;

    // Calculate streak
    const consecutive_productive_days = await this.calculateStreak(date);

    // Get summary record if it exists (don't create)
    const summary_record = await DB.DailySummary.getForDate(date);

    return {
      completed_today,
      incomplete_due_today,
      created_today,
      due_tomorrow,
      overdue_tasks,
      completion_rate,
      consecutive_productive_days,
      summary_record,
    };
  }

  /**
   * Calculate consecutive days with app opens (streak)
   */
  static async calculateStreak(end_date: Date): Promise<number> {
    let streak = 0;
    const current_date = new Date(end_date);
    current_date.setHours(0, 0, 0, 0);

    // Safety limit to prevent infinite loops
    const MAX_STREAK_DAYS = 365;

    for (let i = 0; i < MAX_STREAK_DAYS; i++) {
      const date_str = this.formatDateForId(current_date);
      const summary = await DB.DailySummary.get(`summary_${date_str}`).catch(() => null);

      // If no summary exists for this day, streak is broken
      if (!summary || !summary.last_app_open) {
        break;
      }

      // Check if it's a real app open (not the default epoch date)
      const last_open = new Date(summary.last_app_open);
      const epoch = new Date(0);
      if (last_open.getTime() === epoch.getTime()) {
        break;
      }

      streak++;
      current_date.setDate(current_date.getDate() - 1);
    }

    return streak;
  }

  /**
   * Save/update summary for a specific date
   */
  static async saveSummary(date: Date, data: DailySummaryData): Promise<void> {
    await DB.DailySummary.updateSummary(date, {
      completed_count: data.completed_today.length,
      incomplete_count: data.incomplete_due_today.length,
      completion_rate: data.completion_rate,
      consecutive_days: data.consecutive_productive_days,
      task_ids_completed: data.completed_today.map((t) => t.id),
      task_ids_incomplete: data.incomplete_due_today.map((t) => t.id),
    });
  }

  /**
   * Record app open (for streak tracking)
   */
  static async recordAppOpen(): Promise<void> {
    await DB.DailySummary.recordAppOpen();
  }

  /**
   * Get weekly summary data
   */
  static async getWeeklySummary(end_date: Date): Promise<{
    total_completed: number;
    total_incomplete: number;
    average_completion_rate: number;
    most_productive_day: string;
    summaries: DailySummary[];
  }> {
    const start_date = new Date(end_date);
    start_date.setDate(start_date.getDate() - 6);
    start_date.setHours(0, 0, 0, 0);

    const summaries = await DB.DailySummary.getSummariesInRange(start_date, end_date);

    const total_completed = summaries.reduce((sum, s) => sum + s.completed_count, 0);
    const total_incomplete = summaries.reduce((sum, s) => sum + s.incomplete_count, 0);
    const average_completion_rate =
      summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.completion_rate, 0) / summaries.length : 0;

    // Find most productive day
    const most_productive = summaries.reduce(
      (max, s) => (s.completed_count > max.completed_count ? s : max),
      summaries[0] || { completed_count: 0, date: "" }
    );

    const day_of_week = most_productive.date
      ? new Date(most_productive.date).toLocaleDateString("af-ZA", { weekday: "long" })
      : "";

    return {
      total_completed,
      total_incomplete,
      average_completion_rate,
      most_productive_day: day_of_week,
      summaries,
    };
  }

  private static formatDateForId(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
