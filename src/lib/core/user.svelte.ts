import { PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import { APP_NAME, FIREBASE_CONFIG } from "$lib";
// import { User } from "$lib/tools/src/index";
import { Preferences } from "@capacitor/preferences";
import { getApp, initializeApp } from "firebase/app";
import { doc, setDoc, getFirestore, type Firestore, getDoc } from "firebase/firestore";
import { alert } from "./alert";

interface UserConfig {
  client_id: string;
  app: Firestore;
}

interface UserData {
  favourite_category_ids: string[];
  language_code: Language | null;
  text_size: TextSize;
  theme: Theme;
  notifications: { enabled?: boolean; time?: string | null; past_tasks?: boolean };
  daily_summary: { enabled?: boolean; time?: string };
  products: Product[];
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

class UserClass /* extends User */ {
  #app: Firestore;
  #favourite_category_ids: UserData["favourite_category_ids"] = $state([]);
  #language_code: UserData["language_code"] = $state(null);
  #text_size: UserData["text_size"] = $state(16);
  #theme: UserData["theme"] = $state("dark");
  #notifications: UserData["notifications"] = $state({ enabled: true, time: "08:00", past_tasks: true });
  #daily_summary: UserData["daily_summary"] = $state({ enabled: true, time: "20:00" });
  #products: UserData["products"] = $state([]);

  readonly is_plus_user = $derived(this.#products.some((p) => p.is_active && p.product_id === "doenit.plus"));
  readonly is_friends_enabled = $derived(this.is_plus_user);
  readonly is_backup_enabled = $derived(this.is_plus_user);

  constructor(config: UserConfig) {
    // super(config.client_id);
    this.#app = config.app;
  }

  async initialize(): Promise<void> {
    // this.is_initialized = false;
    const result = await Preferences.get({ key: "userData" });
    if (!result.value) return;

    const user_data = JSON.parse(result.value);
    // Update the fields
    this.#favourite_category_ids = user_data.favourite_category_ids;
    this.#language_code = user_data.language_code;
    this.#text_size = user_data.text_size;
    this.#theme = user_data.theme;
    this.#notifications = user_data.notifications;
    this.#daily_summary = user_data.daily_summary;
    this.#products = user_data.products;

    // this.is_initialized = true;
  }

  private async syncWithPreferences(): Promise<void> {
    const user_data: UserData = {
      favourite_category_ids: this.#favourite_category_ids,
      language_code: this.#language_code,
      text_size: this.#text_size,
      theme: this.#theme,
      notifications: this.#notifications,
      daily_summary: this.#daily_summary,
      products: this.#products,
    };

    await Preferences.set({ key: "userData", value: JSON.stringify(user_data) });
  }

  private async syncWithFirestore(): Promise<void> {
    if (!this.id) return;

    const docRef = doc(this.#app, "user", this.id);
    const user_data: UserData = {
      favourite_category_ids: this.#favourite_category_ids,
      language_code: this.#language_code,
      text_size: this.#text_size,
      theme: this.#theme,
      notifications: this.#notifications,
      daily_summary: this.#daily_summary,
      products: this.#products,
    };

    await setDoc(docRef, user_data);
  }

  get language_code(): UserData["language_code"] {
    return this.#language_code;
  }

  get favourite_category_ids(): UserData["favourite_category_ids"] {
    return this.#favourite_category_ids;
  }

  get text_size(): UserData["text_size"] {
    return this.#text_size;
  }

  get theme(): UserData["theme"] {
    return this.#theme;
  }

  get notifications(): UserData["notifications"] {
    return this.#notifications;
  }

  get daily_summary(): UserData["daily_summary"] {
    return this.#daily_summary;
  }

  get products(): UserData["products"] {
    return this.#products;
  }

  async update(data: DeepPartial<UserData>) {
    if (data.favourite_category_ids !== undefined) {
      const cats: string[] = [];
      for (let cat_id of data.favourite_category_ids) {
        if (typeof cat_id === "string" && cat_id.trim() !== "") {
          cats.push(cat_id);
        }
      }
      this.#favourite_category_ids = cats;
    }
    if (data.language_code !== undefined) {
      this.#language_code = data.language_code;
    }
    if (data.text_size !== undefined) {
      this.#text_size = data.text_size;
    }
    if (data.theme !== undefined) {
      this.#theme = data.theme;
    }

    if (data.notifications?.enabled !== undefined) {
      this.#notifications.enabled = data.notifications.enabled;
    }
    if (data.notifications?.past_tasks !== undefined) {
      this.#notifications.past_tasks = data.notifications.past_tasks;
    }
    if (data.notifications?.time !== undefined) {
      this.#notifications.time = data.notifications.time;
    }

    if (data.daily_summary !== undefined) {
      this.#daily_summary = data.daily_summary;
    }
    if (data.products !== undefined) {
      const prods: Product[] = [];
      for (const prod of data.products) {
        if (!prod) continue;

        prods.push(prod);
      }

      this.#products = prods;
    }

    const results = await Promise.allSettled([this.syncWithPreferences(), this.syncWithFirestore()]);
    const is_success = results.every((r) => r.status === "fulfilled");
    if (!is_success) {
      for (let r of results) {
        if (r.status === "rejected") {
          alert.error("Kon nie gebruikersdata sinkroniseer nie: " + (r.reason as Error).message);
        }
      }
    }

    return { success: true };
  }

  async signIn(): Promise<SimpleResult> {
    const result = await super.signIn();
    if (!result.success) return result;

    if (!this.id) throw new Error("User ID not available");
    const docRef = doc(this.#app, "user", this.id);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        await this.update(data);
      } else {
        await setDoc(docRef, {
          favourite_category_ids: [],
          language_code: null,
          text_size: 16,
          theme: "dark",
          notifications: null,
          daily_summary: null,
          products: [],
        });
      }
    } catch (error) {
      alert.error("Kon nie gebruikersdata laai nie: " + (error as Error).message);
    }

    return result;
  }

  async signOut(): Promise<SimpleResult> {
    const result = await super.signOut();
    if (!result.success) return result;

    return result;
  }
}

function getFirestoreInstance(): Firestore {
  let app;

  try {
    app = getApp(APP_NAME);
  } catch {
    app = initializeApp(FIREBASE_CONFIG, APP_NAME);
  }

  return getFirestore(app, "doenitdb");
}

const user = new UserClass({
  client_id: PUBLIC_GOOGLE_AUTH,
  app: getFirestoreInstance(),
});

export { user };
