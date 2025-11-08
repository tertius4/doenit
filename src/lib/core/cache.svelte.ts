import { Preferences } from "@capacitor/preferences";

class CacheHandler<T> {
  private key: string;
  private private_value: T | null = $state(null);

  constructor(key: string) {
    this.key = key;
    this.setInit();
  }

  get value(): T | null {
    return this.private_value;
  }

  set value(data: T) {
    // Do NOT: if (this.private_value === data) return;
    if (data == null) {
      this.private_value = null;
      this.remove();
    } else {
      this.private_value = data;
      this.set(data);
    }
  }

  private async setInit() {
    try {
      const { value } = await Preferences.get({ key: this.key });

      if (value === "undefined" || value == null) {
        this.private_value = null;
      } else {
        this.private_value = JSON.parse(value);
      }
    } catch (error) {
      if (Cached.language.value === "en") {
        alert(`Error initializing cache for key "${this.key}": ${(error as Error).message}`);
      } else {
        alert(`Fout met laai van kas vir sleutel "${this.key}": ${(error as Error).message}`);
      }
    }
  }

  private async set(data: T) {
    try {
      await Preferences.set({
        key: this.key,
        value: JSON.stringify(data),
      });
    } catch (error) {
      if (Cached.language.value === "en") {
        alert(`Error setting cache for key "${this.key}": ${(error as Error).message}`);
      } else {
        alert(`Fout met stel van kas vir sleutel "${this.key}": ${(error as Error).message}`);
      }
    }
  }

  private async remove() {
    try {
      Preferences.remove({ key: this.key });
    } catch (error) {
      if (Cached.language.value === "en") {
        alert(`Error removing cache for key "${this.key}": ${(error as Error).message}`);
      } else {
        alert(`Fout met verwydering van kas vir sleutel "${this.key}": ${(error as Error).message}`);
      }
    }
  }
}

export class Cached {
  static readonly defaultCategories = new CacheHandler<string[]>("selected_categories");
  static readonly theme = new CacheHandler<"light" | "dark" | null>("theme");
  static readonly notificationTime = new CacheHandler<string | null>("time");
  static readonly notificationPastTasks = new CacheHandler<boolean>("past_tasks");
  static readonly language = new CacheHandler<"af" | "en" | null>("language");
  static readonly textSettings = new CacheHandler<{ size: 16 | 20 | 24 }>("text_settings");
  static readonly lastBackup = new CacheHandler<string | null>("last_backup");
  static readonly automaticBackup = new CacheHandler<boolean>("automatic_backup");
  static readonly rateUs = new CacheHandler<RateUsSetting>("rate_us");
  static readonly favouriteCategories = new CacheHandler<Category['id']>("favourite_categories");
  static readonly pendingTaskSync = new CacheHandler<string[]>("pending_task_sync");
}
