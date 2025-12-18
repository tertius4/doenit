import { Capacitor } from "@capacitor/core";
import { Logger } from "$lib/core/logger";

export interface TaskWidgetPlugin {
  updateTasks({ tasks, categories }: { tasks: Task[]; categories: Category[] }): Promise<{ success: boolean }>;
  updateLanguage({ language }: { language: Language }): Promise<{ success: boolean }>;
  updateTheme({ theme }: { theme: Theme }): Promise<{ success: boolean }>;
}

const TaskWidget = Capacitor.registerPlugin<TaskWidgetPlugin>("TaskWidget");

export class Widget {
  static async updateLanguage(language: Language) {
    try {
      if (!Capacitor.isNativePlatform()) return;

      const result = await TaskWidget.updateLanguage({ language });
      Logger.widget("Language updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Logger.error("Widget updateLanguage failed", error);
      alert(`Kon nie widget se 'updateLanguage' bywerk nie: ${error_message}`);
    }
  }

  static async updateTheme(theme: Theme) {
    try {
      if (!Capacitor.isNativePlatform()) return;

      const result = await TaskWidget.updateTheme({ theme });
      Logger.widget("Theme updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Logger.error("Widget updateTheme failed", error);
      alert(`Kon nie widget se 'updateTheme' bywerk nie: ${error_message}`);
    }
  }

  /**
   * Update the widget display
   */
  static async updateTasks(tasks: Task[], categories: Category[]) {
    try {
      if (!Capacitor.isNativePlatform()) return;

      const result = await TaskWidget.updateTasks({ tasks, categories });
      Logger.widget("Tasks updated", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Logger.error("Widget updateTasks failed", error);
      alert(`Kon nie widget se 'updateTasks' bywerk nie: ${error_message}`);
    }
  }
}
