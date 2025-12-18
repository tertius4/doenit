import { Preferences } from "@capacitor/preferences";

class Cached<T> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async get(): Promise<T | null> {
    const { value } = await Preferences.get({ key: this.key });

    if (value === "undefined" || value == null) {
      return null;
    }

    return JSON.parse(value);
  }

  async set(data: T): Promise<void> {
    await Preferences.set({
      key: this.key,
      value: JSON.stringify(data),
    });
  }

  async remove(): Promise<void> {
    await Preferences.remove({ key: this.key });
  }
}

export const cached_language = new Cached<"af" | "en" | null>("language");
export const cached_text_settings = new Cached<{ size: 16 | 20 | 24 }>("text_settings");

export const cached_notification_time = new Cached<string | null>("time");
export const selectedCategories = new Cached<string[]>("selected_categories");
export const cached_notification_past_tasks = new Cached<boolean>("past_tasks");
export const cached_last_backup = new Cached<string | null>("last_backup");
export const cached_automatic_backup = new Cached<boolean>("automatic_backup");
export const cached_rate_us_setting = new Cached<RateUsSetting>("rate_us_setting");