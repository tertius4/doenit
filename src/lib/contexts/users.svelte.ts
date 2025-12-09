import { createContext } from "svelte";
import { DB } from "$lib/DB";
import { SvelteMap } from "svelte/reactivity";
import { user } from "$lib/base/user.svelte";
import { OnlineDB } from "$lib/OnlineDB";

export class UsersContext {
  users = $state<User[]>([]);
  map = new SvelteMap<string, User>();

  private subscription: Subscription | null = null;

  async init() {
    if (this.subscription) return;

    this.subscription = DB.User.subscribe(
      (result) => {
        this.users = result;
        this.map.clear();
        for (const user of result) {
          this.map.set(user.email_address, user);
        }

      },
      { sort: [{ name: "asc" }] }
    );

    if (!user.is_friends_enabled) return;

    // Create own user if it doesn't exist (online and locally).
    const online_user = await this.ensureOnlineUserExists();
    if (online_user) {
      await this.ensureLocalUserExists(online_user.id);
    }
  }

  private async ensureOnlineUserExists() {
    const [existing_user] = await OnlineDB.User.getAll({
      filters: [{ field: "email_address", operator: "==", value: user.email_address }],
    }).catch(() => []);

    if (existing_user) {
      return existing_user;
    }

    const fcm_token = user.getToken ? await user.getToken() : null;
    const result = await OnlineDB.User.create({
      name: user.name || "Me",
      uid: user.uid || "",
      language_code: user.language_code!,
      fcm_token,
      email_address: user.email_address || "",
      avatar: user.avatar || undefined,
    }).catch(() => null);

    if (!result?.success) {
      return null;
    }

    const [created_user] = await OnlineDB.User.getAll({
      filters: [{ field: "email_address", operator: "==", value: user.email_address }],
    }).catch(() => []);

    return created_user || null;
  }

  private async ensureLocalUserExists(online_user_id: string) {
    const local_user = await DB.User.getOne({
      selector: { email_address: { $eq: user.email_address } },
    }).catch(() => null);

    if (local_user) {
      return;
    }

    await DB.User.create({
      name: user.name || "",
      email_address: user.email_address || "",
      avatar: user.avatar || undefined,
      uid: online_user_id,
    }).catch(() => {});
  }

  destroy() {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  getUserByEmail(email: string): User | undefined {
    return this.map.get(email);
  }
}

export const [getUsersContext, setUsersContext] = createContext<UsersContext>();
