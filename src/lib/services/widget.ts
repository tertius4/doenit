import { Capacitor } from "@capacitor/core";
import { combineLatest, debounceTime, distinctUntilChanged, map, Subscription } from "rxjs";
import db from "$domain/db";
import logger from "$display/logger";
import toast from "$display/toast/toast.svelte";

export interface TaskWidgetPlugin {
  updateTasks({ tasks, categories }: { tasks: DB.Task[]; categories: DB.Category[] }): Promise<void>;
  updateLanguage({ language }: { language: Domain.Settings["language"] }): Promise<void>;
  updateTheme({ theme }: { theme: Domain.Settings["theme"] }): Promise<void>;
}

const TaskWidget = Capacitor.registerPlugin<TaskWidgetPlugin>("TaskWidget");

export class Widget {
  private static _subscription: Subscription | null = null;

  static init() {
    if (this._subscription) return;

    const tasks$ = db.task.subscribe$({ selector: { archived: { $eq: false }, soft_deleted: { $ne: true } } });
    const categories$ = db.category.subscribe$({ selector: { soft_deleted: { $ne: true } } });
    const settings$ = db.settings.subscribe$();

    this._subscription = new Subscription();

    this._subscription.add(
      combineLatest([tasks$, categories$])
        .pipe(debounceTime(500))
        .subscribe(([tasks, categories]) => Widget.updateTasks(tasks, categories)),
    );

    this._subscription.add(
      settings$
        .pipe(map((s) => s[0]?.language), distinctUntilChanged())
        .subscribe((language) => { if (language !== undefined) Widget.updateLanguage(language); }),
    );

    this._subscription.add(
      settings$
        .pipe(map((s) => s[0]?.theme), distinctUntilChanged())
        .subscribe((theme) => { if (theme !== undefined) Widget.updateTheme(theme); }),
    );
  }

  static async updateLanguage(language: Domain.Settings["language"]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await TaskWidget.updateLanguage({ language });
      logger.debug("Language updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : JSON.stringify(error);
      logger.error("Widget updateLanguage failed", error);
      toast.error(`Kon nie widget se 'updateLanguage' bywerk nie: ${error_message}`);
    }
  }

  static async updateTheme(theme: Domain.Settings["theme"]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      if (!Capacitor.isNativePlatform()) return;

      const result = await TaskWidget.updateTheme({ theme });
      logger.debug("Theme updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : JSON.stringify(error);
      logger.error("Widget updateTheme failed", error);
      toast.error(`Kon nie widget se 'updateTheme' bywerk nie: ${error_message}`);
    }
  }

  /**
   * Update the widget display
   */
  static async updateTasks(tasks: DB.Task[], categories: DB.Category[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const result = await TaskWidget.updateTasks({ tasks, categories });
      logger.debug("Tasks updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : JSON.stringify(error);
      logger.error("Widget updateTasks failed", error);
      toast.error(`Kon nie widget se 'updateTasks' bywerk nie: ${error_message}`);
    }
  }
}
