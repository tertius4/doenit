import type { RxCollection } from "$lib/chunk/rxdb";
import user from "$lib/core/user.svelte";
import { Table } from "./_Table";

export class CategoryTable extends Table<Category> {
  constructor(collection: RxCollection<Category>) {
    super(collection);
  }

  async getDefault() {
    try {
      return await this.getOne({
        selector: { archived: { $ne: true }, is_default: { $eq: true } },
      });
    } catch (e) {
      console.log("[💬 Doenit]: Creating a default category.");
      return this.create({ name: "", is_default: true, users: [] });
    }
  }

  getNotificationEmails(category: Category): string[] {
    const my_email_address = user.value?.email;
    const emails: string[] = [];
    for (const email_address of category.users) {
      if (email_address && email_address !== my_email_address) {
        emails.push(email_address);
      }
    }
    return emails;
  }
}
