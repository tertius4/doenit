import type { RxCollection } from "$lib/chunk/rxdb";
import { Table } from "./_Table";
import { OnlineDB } from "$lib/OnlineDB";
import user from "$lib/core/user.svelte";

export class RoomTable extends Table<Room> {
  constructor(collection: RxCollection<Room>) {
    super(collection);
  }

  async delete(ids: string[] | string) {
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length) return;

    const promises = [
      super.delete(ids),
      OnlineDB.Invite.deleteMany({
        filters: [{ field: "room_id", operator: "in", value: ids }],
      }),
    ];
    await Promise.all(promises.map((p) => p.catch((e) => alert(e.stack))));
  }

  getNotificationEmails(room: Room): string[] {
    const excludingEmail = user.value?.email;
    const emails: string[] = [];
    for (const { email, pending } of room.users) {
      if (email && email !== excludingEmail && !pending) {
        emails.push(email);
      }
    }
    return emails;
  }
}
