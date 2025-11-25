import { Capacitor } from "@capacitor/core";

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
      console.log("[💬 Widget]: Language update result:", JSON.stringify(result));
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie widget se 'updateLanguage' bywerk nie: ${error_message}`);
    }
  }

  static async updateTheme(theme: Theme) {
    try {
      if (!Capacitor.isNativePlatform()) return;

      const result = await TaskWidget.updateTheme({ theme });
      console.log("[💬 Widget]: Theme update result:", JSON.stringify(result));
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
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
      console.log("[💬 Widget]:", result);
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      alert(`Kon nie widget se 'updateTasks' bywerk nie: ${error_message}`);
    }
  }
}
