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
      firebase_uid?: string;
      name: string;
      avatar?: string;
    }

    interface Settings {
      user_id: string;

      theme: "light" | "dark" | "system";
      notifications_enabled: boolean;
      present_task_reminder_enabled: boolean;
      present_task_reminder_time: string | null; // e.g. "09:00"
      past_task_reminder_enabled: boolean;
      past_task_reminder_time: string | null; // e.g. "09:00"

      automatic_backup: boolean;

      text_size: "sm" | "md" | "lg";
      language?: "af" | "en";
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
      due_date: string | null; // e.g. "2024-12-31 23:59"
      start_date: string | null; // e.g. "2024-12-01 09:00"
      repeat_interval: string;
      repeat_specific_days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
      repeat_interval_number: number;
      important: boolean;
      assigned_firebase_uid?: string;
      photo_ids?: string[];

      category_id?: string;
      // No group_id; Scope_id will be same as group_id
    }

    interface Category {
      name: string;
    }

    interface Group {
      name: string;
      description?: string;
    }

    interface Member {
      // Already exists to a scope_id (=group_id)
      firebase_uid: string;
      role: "admin" | "member";
    }

    interface SyncQueueItem {
      table_name: string;
      entity_id: string;
      scope_id: string;

      op: "upsert" | "delete";

      attempts: number;
      last_attempt_at?: number;
    }

    interface Contact {
      user_id: string;
      firebase_uid: string;
      relationship_id: string;
      name: string | null;
      avatar_url: string | null;
      email_address: string | null;
    }

    interface ContactInvite {
      relationship_id: string;
      from_firebase_uid: string;
      to_firebase_uid: string;
      status: "pending" | "accepted" | "rejected" | "cancelled";
      responded_at: string | null;
    }
  }

  namespace DB {
    // Indicates who is logged in.
    interface Session {
      id: "current";
      user_id: string | null;
    }

    // Device info and app usage stats - not user specific.
    interface AppState {
      id: "current";
      device_id: string;
      last_opened_at: string;
      open_count: number;
      app_version: string;
      updated_at: string;
    }

    // User-specific app state, like last opened category, last sync time, etc.
    interface UserState {
      id: string; // primary key — same value as user_id
      user_id: string;
      active_scopes: string[];
      sync_cursors: Record<string, string>; // scope_id → ISO timestamp
      last_opened_at: string;
      open_count: number;
      last_rate_prompt_at: string;
      last_backed_up: string;
      rate_prompt_count: number;
      has_rated: boolean;
      updated_at: string;
    }

    interface MetaDataShared {
      id: string;

      created_at: string;
      updated_at: string;

      version: number;
      device_id: string;

      owner_id: string;
      scope_id: string | null; // Will be same as group_id.

      soft_deleted?: boolean;
    }

    interface MetaDataPrivate {
      id: string;

      created_at: string;
      updated_at: string;

      owner_id: string;
    }

    type Group = DB.MetaDataShared & Domain.Group;
    type Task = DB.MetaDataShared & Domain.Task;
    type Category = DB.MetaDataShared & Domain.Category;

    // Join table between Group and Contact
    type Member = DB.MetaDataShared & Domain.Member;
    type Contact = DB.MetaDataPrivate & Domain.Contact;

    interface ContactInvite {
      id: string;
      relationship_id: string;
      from_firebase_uid: string;
      from_email: string;
      to_firebase_uid: string;
      to_email: string;
      status: "pending" | "accepted" | "rejected" | "cancelled";
      created_at: string;
      updated_at: string;
      responded_at: string | null;
    }
    // Basic User info - could be the device (before any logins).
    type User = DB.MetaDataShared & Domain.User;
    // User preferences - could be the device (before any logins).
    type Settings = DB.MetaDataPrivate & Domain.Settings;
    type SyncQueueItem = DB.MetaDataPrivate & Domain.SyncQueueItem;
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
      category_id?: string;
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

    interface GoogleUserProfile {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      id_token?: string;
      access_token?: string;
    }

    interface ContactListItem {
      id: string;
      firebase_uid: string;
      relationship_id: string;
      name: string | null;
      email_address: string | null;
      avatar_url: string | null;
    }

    interface ContactInviteListItem {
      id: string;
      relationship_id: string;
      from_firebase_uid: string;
      from_email: string;
      to_firebase_uid: string;
      to_email: string;
      status: "pending" | "accepted" | "rejected" | "cancelled";
      is_incoming: boolean;
      other_email: string;
    }

    interface GroupListItem {
      id: string;
      name: string;
      description?: string;
      owner_id: string;
      task_count: number;
      members: { name: string; is_admin?: boolean }[];
    }
  }
}

export {};
