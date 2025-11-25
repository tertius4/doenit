import type { RxCollection } from "$lib/chunk/rxdb";
import { user } from "$lib/base/user.svelte";
import { Table } from "./_Table";
import { OnlineDB } from "$lib/OnlineDB";
import { DB } from "$lib/DB";
import { Secure } from "$lib/core/secure";

export class CategoryTable extends Table<Category> {
  constructor(collection: RxCollection<Category>) {
    super(collection);
  }

  async create(
    category: Omit<Category, "id" | "created_at" | "archived" | "updated_at"> & { id?: string }
  ): Promise<Category> {
    if (!category) throw new Error("Category is required");

    if (!category.users || !Array.isArray(category.users)) {
      category.users = [];
    }

    if (user.email_address && !category.users.includes(user.email_address)) {
      category.users.push(user.email_address);
    }

    // Ek kan nie alleen in die kategorie wees nie
    if (category.users.length === 1 && category.users[0] === user.email_address) {
      category.users = [];
    }

    return super.create(category);
  }

  async update(id: string, updates: Partial<Category>): Promise<Category | null> {
    const current_category = await this.get(id);

    let is_update = false;
    for (let key of Object.keys(updates)) {
      if ((current_category as any)[key] !== (updates as any)[key]) {
        is_update = true;
        break;
      }
    }

    // Vermy konflikte.
    if (!is_update) return current_category;

    if (updates.users && Array.isArray(updates.users)) {
      const my_email_address = user.email_address;
      if (my_email_address && !updates.users.includes(my_email_address)) {
        updates.users.push(my_email_address);
      }

      // Ek kan nie alleen in die kategorie wees nie
      if (updates.users.length === 1 && updates.users[0] === my_email_address) {
        updates.users = [];
      }
    }

    const result = await super.update(id, updates);
    if (!user.is_friends_enabled || !result) return result;

    const [online_category] = await OnlineDB.Category.getAll({
      filters: [{ field: "category_id", operator: "==", value: id }],
    });

    const is_shared = !!result.users?.length;

    if (!online_category) {
      if (!is_shared) return result;

      // Create new online category
      await OnlineDB.Category.create({
        name: result.name,
        category_id: result.id,
        users: result.users,
      });

      // Also create the tasks in the online DB
      const tasks = await DB.Task.getAll({
        selector: { category_id: result.id },
      });

      const promises = tasks.map(async (task) => {
        const encrypted_data = await Secure.compressAndEncrypt(task);
        await OnlineDB.Task.create({
          task_id: task.id,
          category_id: task.category_id || "",
          data: encrypted_data || "",
        });
      });
      
      await Promise.all(promises);
    } else {
      if (is_shared) {
        // Update existing online category
        await OnlineDB.Category.updateById(online_category.id, {
          name: result.name,
          users: result.users,
        });
      } else {
        // Delete online category
        await OnlineDB.Category.delete(online_category.id);

        // Also delete all online tasks assigned to this category
        const online_tasks = await OnlineDB.Task.getAll({
          filters: [{ field: "category_id", operator: "==", value: result.id }],
        });

        await Promise.all(online_tasks.map((task) => OnlineDB.Task.delete(task.id)));
      }
    }

    return result;
  }

  getNotificationEmails(category: Category): string[] {
    const my_email_address = user.email_address;

    const emails: string[] = [];
    for (const email_address of category.users) {
      if (email_address === my_email_address) continue;
      if (!email_address) continue;

      emails.push(email_address);
    }

    return emails;
  }
}
