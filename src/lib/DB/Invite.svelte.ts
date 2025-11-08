import user from "$lib/core/user.svelte";
import { DB } from "$lib/DB";
import { OnlineDB } from "$lib/OnlineDB";

export class InviteTable {
  invites: Invite[] = $state([]);
  constructor() {
    // Initialize the invite table
  }

  remove(invite_id: string) {
    this.invites = this.invites.filter((invite) => invite.id !== invite_id);
  }

  async set(invites: Invite[]) {
    try {
      const email_address = user.value?.email;
      const rooms = await DB.Room.getAll();
      this.invites = [];

      const promises = [];
      for (const invite of invites) {
        const is_from_me = invite.from_email_address === email_address;
        const is_for_me = invite.to_email_address === email_address;
        const room = rooms.find((r) => r.id === invite.room_id);

        if (is_for_me) {
          switch (invite.status) {
            case "pending":
              if (room) continue;

              const created_at = new Date(invite.created_at);
              if (+created_at + 7 * 24 * 60 * 60 * 1000 < Date.now()) {
                // Invite expired, delete it
                invite.status = "expired";
                promises.push(OnlineDB.Invite.updateById(invite.id, invite));
                continue;
              }

              this.invites = [...this.invites, invite];

              break;
            case "left":

              if (!room) {
                promises.push(OnlineDB.Invite.delete(invite.id));
                continue;
              }

              let is_update = false;
              let is_delete = false;

              for (let i = 0; i < room.users.length; i++) {
                const room_user = room.users[i];
                if (room_user.email !== invite.from_email_address) continue;

                room.users.splice(i, 1);
                is_update = true;

                // If only current user remains, archive the room
                if (room.users.length === 1 && room.users[0].email === email_address) {
                  is_delete = true;
                }
              }

              if (is_delete) {
                promises.push(OnlineDB.Invite.delete(invite.id));
                promises.push(DB.Room.delete(room.id));
              } else if (is_update) {
                promises.push(OnlineDB.Invite.delete(invite.id));
                promises.push(DB.Room.update(room.id, room));
              }

              break;
          }
        } else if (is_from_me) {
          const room = rooms.find((r) => r.id === invite.room_id);
          if (!room) continue;

          switch (invite.status) {
            case "accepted":
              for (let i = 0; i < room.users.length; i++) {
                const room_user = room.users[i];
                if (room_user.email !== invite.to_email_address) continue;

                room.users[i].pending = false;

                promises.push(OnlineDB.Invite.delete(invite.id));
                promises.push(DB.Room.update(room.id, room));
              }
              break;
            case "expired":
            case "declined":
              for (let i = 0; i < room.users.length; i++) {
                const room_user = room.users[i];
                if (room_user.email !== invite.to_email_address) continue;

                room.users.splice(i, 1);
                promises.push(OnlineDB.Invite.delete(invite.id));
                // If only current user remains, archive the room
                if (room.users.length === 1 && room.users[0].email === email_address) {
                  promises.push(DB.Room.delete(room.id));
                } else {
                  promises.push(DB.Room.update(room.id, room));
                }
              }
              break;
          }
        }
      }

      await Promise.all(
        promises.map((p) =>
          p.catch((e) => {
            throw e;
          })
        )
      );
    } catch (error) {
      alert("Fout met verwerking van uitnodigingslys: " + error);
    }
  }

  getAll() {
    return this.invites;
  }
}
