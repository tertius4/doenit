// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  namespace Domain {
    interface User {
      email_address: string;
      google_id: string;
      name: string;
      avatar?: string;
    }

    interface Settings {
      user_id: string;

      theme: "light" | "dark" | "system";
      notifications_enabled: boolean;
      present_task_reminder_enabled: boolean;
      present_task_reminder_time: string; // e.g. "09:00"
      past_task_reminder_enabled: boolean;
      past_task_reminder_time: string; // e.g. "09:00"

      automatic_backup: boolean;

      text_size: "sm" | "md" | "lg";
      language: "af" | "en";
    }

    interface Permissions {
      user_id: string;

      share_tasks: boolean;
      backup_data: boolean;
    }

    interface Task {
      name: string;
      archived: boolean;
      description?: string;
      completed: number;
      completed_at: string | null;
      due_date: string | null;
      start_date: string | null;
      repeat_interval: string;
      repeat_specific_days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
      repeat_interval_number: number;
      important: boolean;
      assigned_user_email?: string;
      photo_ids?: string[];

      category_id?: string;
      group_id?: string;
    }

    interface Category {
      name: string;
    }

    interface Group {
      name: string;
      description?: string;
    }

    interface Member {
      user_id: string;
      group_id: string;

      role: "admin" | "member";
    }

    interface Contact {
      name: string;
      avatar?: string;
      user_id: string;
    }

    interface Invite {
      from_email_address: string;
      to_email_address: string;

      to_user_id?: string;
      status: "pending" | "accepted" | "rejected";
    }
  }

  namespace DB {
    interface Session {
      id: "current";
      user_id: string | null;
    }

    interface AppState {
      id: "current";
      device_id: string;
      last_opened_at: string;
      open_count: number;
      app_version: string;
      updated_at: string;
    }

    interface UserState {
      user_id: string;
      last_opened_at: string;
      open_count: number;
      last_rate_prompt_at: string;
      last_backed_up: string;
      rate_prompt_count: number;
      has_rated: boolean;
      updated_at: string;
    }

    interface SharedMetaData {
      id: string;
      created_at: string;
      updated_at: string;
      version: number;
      soft_deleted?: boolean;
      dirty: boolean;
      owner_user_id: string;
    }

    interface PrivateMetaData {
      id: string;
      created_at: string;
      updated_at: string;
    }

    type Task = DB.SharedMetaData & Domain.Task;
    type Category = DB.SharedMetaData & Domain.Category;
    type Group = DB.SharedMetaData & Domain.Group;
    type Member = DB.SharedMetaData & Domain.Member;
    type Contact = DB.SharedMetaData & Domain.Contact;
    type Invite = DB.SharedMetaData & Domain.Invite;
    // Basic User info - could be the device (before any logins).
    type User = DB.PrivateMetaData & Domain.User;
    // User preferences
    type Settings = DB.PrivateMetaData & Domain.Settings;
    // Server controlled - private data
    type Permissions = DB.PrivateMetaData & Domain.Permissions;
  }

  type Result<T = void> = T extends void
    ? { ok: true } | { ok: false; error: string }
    : { ok: true; value: T } | { ok: false; error: string };
  type AsyncResult<T = void> = Promise<Result<T>>;

  namespace AL {
    // App Logic
    type TaskPhoto = {
      id: string; // Primary key (UUID).
      filepath: string; // Path to the photo file.
      webview_path?: string; // Optional webview path for displaying the photo.
    };

    interface CategoryListItem {
      id: string;
      name: string;
      task_count: number;
    }

    interface MainPageTask {
      id: string;
      name: string;
      is_ongoing: boolean;
      is_past: boolean;
      onclick: () => void;
      onlongpress: () => void;
      pills: { type: "round" | "square"; label: string; pre_icon?: string; post_icon?: string }[];
      top_right_icons?: { name: string }[];
    }

    interface DonePageTask {
      id: string;
      name: string;
      completed_count: number;
      pills: { type: "round" | "square"; label: string; pre_icon?: string; post_icon?: string }[];
    }

    interface TaskPhoto {
      id: string;
      filepath: string;
      webview_path?: string;
    }
  }
}

export {};
