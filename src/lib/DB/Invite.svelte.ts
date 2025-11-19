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
      const users = await DB.User.getAll();
      this.invites = [];

      const promises = [];
      for (const invite of invites) {
        const is_from_me = invite.from_email_address === email_address;
        const is_for_me = invite.to_email_address === email_address;

        if (is_for_me) {
          switch (invite.status) {
            case "pending":
              const created_at = new Date(invite.created_at);
              if (+created_at + 7 * 24 * 60 * 60 * 1000 < Date.now()) {
                // Invite expired, delete it
                promises.push(OnlineDB.Invite.delete(invite.id));
                continue;
              }

              this.invites.push(invite);

              break;
            case "left":
              for (let i = 0; i < users.length; i++) {
                const user = users[i];
                if (user.email_address !== invite.from_email_address) continue;

                promises.push(DB.User.delete(user));
              }

              promises.push(OnlineDB.Invite.delete(invite.id));

              break;
          }
        }

        if (is_from_me) {
          // Hierdie gebeur as terugvoer op 'n uitnodiging.
          switch (invite.status) {
            case "accepted":
              for (let i = 0; i < users.length; i++) {
                const user = users[i];
                if (user.email_address !== invite.to_email_address) continue;

                user.is_pending = false;

                promises.push(OnlineDB.Invite.delete(invite.id));
                promises.push(DB.User.update(user.id, user));
              }
              break;
            case "expired":
            case "declined":
              for (let i = 0; i < users.length; i++) {
                const user = users[i];
                if (user.email_address !== invite.to_email_address) continue;

                promises.push(DB.User.delete(user));
                promises.push(OnlineDB.Invite.delete(invite.id));
              }
              break;
          }
        }

        await Promise.all(
          promises.map((p) =>
            p.catch((e) => {
              throw e;
            })
          )
        );
        promises.length = 0;
      }
    } catch (error) {
      alert("Fout met verwerking van uitnodigingslys: " + error);
    }
  }

  getAll() {
    return this.invites;
  }
}
