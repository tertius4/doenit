import type { RxCollection } from "$lib/chunk/rxdb";
import { DateUtil } from "$lib/core/date_util";
import { Table } from "./_Table";

export class DailySummaryTable extends Table<DailySummary> {
  constructor(collection: RxCollection<DailySummary>) {
    super(collection);
  }

  /**
   * Get summary for a specific date (returns null if doesn't exist)
   */
  async getForDate(date: Date): Promise<DailySummary | null> {
    const date_str = DateUtil.format(date, "YYYY-MM-DD");
    const id = `summary_${date_str}`;
    return this.get(id).catch(() => null);
  }

  /**
   * Get or create a summary for a specific date
   */
  async getOrCreateForDate(date: Date): Promise<DailySummary> {
    const date_str = DateUtil.format(date, "YYYY-MM-DD");
    const id = `summary_${date_str}`;

    const existing = await this.get(id).catch(() => null);
    if (existing) return existing;

    const summary: Omit<DailySummary, "created_at" | "updated_at"> = {
      id,
      date: date.toISOString(),
      completed_count: 0,
      incomplete_count: 0,
      completion_rate: 0,
      consecutive_days: 0,
      task_ids_completed: [],
      task_ids_incomplete: [],
      last_app_open: DateUtil.format(new Date(0), "YYYY-MM-DD HH:mm:ss"),
    };

    return this.create(summary);
  }

  /**
   * Update summary with task data
   */
  async updateSummary(date: Date, data: Partial<DailySummary>): Promise<DailySummary | null> {
    const date_str = DateUtil.format(date, "YYYY-MM-DD");
    const id = `summary_${date_str}`;

    const summary = await this.getOrCreateForDate(date);
    return this.update(id, { ...summary, ...data });
  }

  /**
   * Record app open for streak tracking
   */
  async recordAppOpen(): Promise<void> {
    const today = new Date();
    const summary = await this.getOrCreateForDate(today);
    await this.update(summary.id, {
      ...summary,
      last_app_open: DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
    });
  }

  /**
   * Get summaries within a date range
   */
  async getSummariesInRange(start_date: Date, end_date: Date): Promise<DailySummary[]> {
    const start_str = start_date.toISOString();
    const end_str = end_date.toISOString();

    return this.getAll({
      selector: {
        date: {
          $gte: start_str,
          $lte: end_str,
        },
      },
    });
  }
}
