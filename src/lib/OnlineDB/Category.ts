import { user } from "$lib/base/user.svelte";
import { Table } from "./_Table";

export class CategoryTable extends Table<OnlineCategory> {
  constructor() {
    super("categories");
  }

  async create(data: Omit<OnlineCategory, "id" | "archived" | "created_at">): Promise<SimpleResult> {
    if (!data.users || !Array.isArray(data.users)) {
      data.users = [];
    }
    const my_email_address = user.email_address;
    if (my_email_address && !data.users.includes(my_email_address)) {
      data.users.push(my_email_address);
    }

    // Ek kan nie alleen in die kategorie wees nie
    if (data.users.length === 1 && data.users[0] === my_email_address) {
      data.users = [];
    }

    // 'n Kategorie moet ten minste een gebruiker hê
    if (!data.users.length) {
      return {
        success: false,
        error_message: "Kategorie moet ten minste een gebruiker hê",
      };
    }

    return super.create(data);
  }

  async update(id: string, updates: Partial<OnlineCategory>): Promise<SimpleResult> {
    if (updates.users && Array.isArray(updates.users)) {
      const my_email_address = user.email_address;
      if (my_email_address && !updates.users.includes(my_email_address)) {
        updates.users.push(my_email_address);
      }

      // Ek kan nie alleen in die kategorie wees nie
      if (updates.users.length === 1 && updates.users[0] === my_email_address) {
        updates.users = [];
      }

      // 'n Kategorie moet ten minste een gebruiker hê
      if (!updates.users.length) {
        await super.delete(id);
        return { success: true };
      }
    }

    return super.update(id, updates);
  }
}
