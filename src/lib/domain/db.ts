import { createSinkroDB } from "@tertius4/sinkro-db";
import { dexieStorage } from "@tertius4/sinkro-db/dexie";
import { firestoreBackend } from "@tertius4/sinkro-db/firestore";
import { toStore } from "svelte/store";
import { context } from "$logic/context.svelte";
import firestore from "$services/firestore";
import versionGate from "$services/version-gate.svelte";
import { tables as definitions } from "./sinkro/tables";
import * as tables from "./tables";

/** Requires firestore.init() to have been called. */
function openSinkroDB() {
  return createSinkroDB({
    name: "doenit-sinkro",
    tables: definitions,
    storage: dexieStorage(),
    backend: firestoreBackend({
      firestore: firestore.getDb(),
      layout: {
        docs: (channel) => `scopes/${channel}/items`,
        docId: (_table, id) => id,
        time: () => "sinkro_time",
        fields: { table: "collection", syncedAt: "synced_at", version: "_v" },
      },
    }),
    // `personal_{uid}` while Sync is on, plus the user's groups. Leaving a channel out keeps its data.
    channels: toStore(() => context.active_scopes),
    onPushRejected: (item, error) => console.warn(`[sinkro] ${item.table} ${item.docId} refused:`, error),
    onChannelRemoved: (channel, unsent) => {
      if (unsent.length) console.warn(`[sinkro] ${channel} left with ${unsent.length} unsent changes`);
    },
    context: () => ({ userId: context.user?.firebase_uid ?? null }),
    warnings: import.meta.env.DEV,
  });
}

class DBClass {
  private db: Awaited<ReturnType<typeof openSinkroDB>> | undefined;
  private _tables: ReturnType<typeof wrap> | undefined;

  async init() {
    if (this.db) return;

    this.db = await openSinkroDB();
    this._tables = wrap(this.db);

    // Old apps must not sync: nothing leaves this device until the gate says this version may.
    const { sync } = this.db;
    sync.pause();
    versionGate.isOutdated().then((outdated) => {
      if (!outdated) sync.resume();
    });
  }

  private get all() {
    if (!this._tables) throw new Error("DB not initialized");
    return this._tables;
  }

  get sync() {
    if (!this.db) throw new Error("DB not initialized");
    return this.db.sync;
  }

  get collectionNames(): string[] {
    return Object.keys(this.all);
  }

  getCollection(name: string) {
    return this.all[name as keyof ReturnType<typeof wrap>];
  }

  get task() {
    return this.all.task;
  }

  get category() {
    return this.all.category;
  }

  get group() {
    return this.all.group;
  }

  get member() {
    return this.all.member;
  }

  get user() {
    return this.all.user;
  }

  get settings() {
    return this.all.settings;
  }

  get session() {
    return this.all.session;
  }

  get app_state() {
    return this.all.app_state;
  }

  get user_state() {
    return this.all.user_state;
  }

  get contact() {
    return this.all.contact;
  }

  get contact_invite() {
    return this.all.contact_invite;
  }

  get notification() {
    return this.all.notification;
  }

  get membership_queue() {
    return this.all.membership_queue;
  }
}

function wrap(db: Awaited<ReturnType<typeof openSinkroDB>>) {
  return {
    task: new tables.task(db.task),
    category: new tables.category(db.category),
    group: new tables.SyncTable<DB.Group>(db.group),
    member: new tables.SyncTable<DB.Member>(db.member),
    user: new tables.LocalTable<DB.User>(db.user),
    settings: new tables.settings(db.settings),
    session: new tables.session(db.session),
    app_state: new tables.app_state(db.app_state),
    user_state: new tables.user_state(db.user_state),
    contact: new tables.contact(db.contact),
    contact_invite: new tables.contact_invite(db.contact_invite),
    notification: new tables.notification(db.notification),
    membership_queue: new tables.LocalTable<DB.MembershipOrder>(db.membership_queue),
  };
}

const DB = new DBClass();
export default DB;
