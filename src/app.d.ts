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
      reminders_enabled: boolean;
      reminder_time: string; // e.g. "09:00"
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

    interface MetaData {
      id: string;
      created_at: string;
      updated_at: string;
      archived: boolean;
      version: number;
      soft_deleted?: boolean;
      dirty: boolean;
      owner_user_id: string;
    }

    type Task = DB.MetaData & Domain.Task;
    type Category = DB.MetaData & Domain.Category;
    type Group = DB.MetaData & Domain.Group;
    type Member = DB.MetaData & Domain.Member;
    type Contact = DB.MetaData & Domain.Contact;
    type Invite = DB.MetaData & Domain.Invite;
    type User = DB.MetaData & Domain.User;
    type Settings = DB.MetaData & Domain.Settings;
    type Permissions = DB.MetaData & Domain.Permissions;
  }

  type Result<T = void> = T extends void
    ? { ok: true } | { ok: false; error: string }
    : { ok: true; value: T } | { ok: false; error: string };
  type AsyncResult<T = void> = Promise<Result<T>>;
}

export {};
