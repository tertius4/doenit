import type { RxCollection } from "$lib/chunk/rxdb";
import { Table } from "./_Table";
import { OnlineDB } from "$lib/OnlineDB";
import user from "$lib/core/user.svelte";
import { DB } from "$lib/DB";
import { Alert } from "$lib/core/alert";

export class UserTable extends Table<User> {
  constructor(collection: RxCollection<User>) {
    super(collection);
  }

  async create(user: Omit<User, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<User> {
    // Email Address must be unique

    const existing_user = await DB.User.getOne({
      selector: { email_address: { $eq: user.email_address } },
    }).catch(() => null);
    if (existing_user) return existing_user;

    const updated_user = await super.create(user);
    return updated_user;
  }

  async delete(users: User | User[]): Promise<void> {
    if (!Array.isArray(users)) users = [users];
    if (!users.length) return;

    const my_email_address = user.value?.email;
    if (!my_email_address) return;

    const email_addresses = [];
    const ids = [];
    for (const user of users) {
      ids.push(user.id);
      email_addresses.push(user.email_address);
    }

    const promises = [
      super.delete(ids),
      OnlineDB.Invite.deleteMany({
        filters: [
          { field: "from_email_address", operator: "==", value: my_email_address },
          { field: "to_email_address", operator: "in", value: email_addresses },
        ],
      }),
    ];
    await Promise.all(promises.map((p) => p.catch((e) => alert(e.stack))));

    // Hierdie moet gebeur na die ander invites geskrap is.
    const leavePromises = email_addresses.map((email) =>
      OnlineDB.Invite.create({
        sender_name: user.value?.name ?? "",
        from_email_address: my_email_address,
        to_email_address: email,
        status: "left",
      })
    );
    await Promise.all(leavePromises);
  }

  async sync(online_users: OnlineUser[], users: User[]): Promise<void> {
    const online_user_hash = online_users.reduce(
      (acc, online_user) => {
        acc[online_user.email_address] = online_user;
        return acc;
      },
      {} as Record<string, OnlineUser>
    );

    const promises: Promise<void>[] = [];
    for (const user of users) {
      const online_user = online_user_hash[user.email_address];
      if (!online_user) continue;
      // Check whether there is any change, if there is update
      let is_updated = false;
      const fields: ("avatar" | "name")[] = ["avatar", "name"];
      for (const field of fields) {
        if (user[field] === online_user[field]) continue;

        is_updated = true;
        break;
      }
      if (!is_updated) continue;

      await DB.User.update(user.id, {
        avatar: online_user.avatar,
        name: online_user.name,
      }).catch((e) => Alert.error(`Fout met sinchronisering van gebruiker ${user.email_address}: ${e.message}`));
    }

    await Promise.all(promises);
  }
}
