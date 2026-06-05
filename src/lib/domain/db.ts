import { addRxPlugin, createRxDatabase } from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";

import * as schema from "./schema";
import * as tables from "./tables";

type tables =
  | tables.task
  | tables.category
  | tables.user
  // | tables.permissions
  | tables.settings
  // | tables.session
  // | tables.app_state
  // | tables.user_state
  | tables.contact
  | tables.contact_invite
  | tables.group
  | tables.member
  | tables.sync_queue;

class DBClass {
  private is_initialized = false;

  private _category: tables.category | undefined;
  private _user: tables.user | undefined;
  private _task: tables.task | undefined;
  private _permissions: tables.permissions | undefined;
  private _settings: tables.settings | undefined;
  private _session: tables.session | undefined;
  private _app_state: tables.app_state | undefined;
  private _user_state: tables.user_state | undefined;
  private _contact: tables.contact | undefined;
  private _contact_invite: tables.contact_invite | undefined;
  private _group: tables.group | undefined;
  private _member: tables.member | undefined;
  private _sync_queue: tables.sync_queue | undefined;

  async init() {
    if (this.is_initialized) return;

    const db = await initDB();

    this._task = new tables.task(db.collections.task);
    this._category = new tables.category(db.collections.category);
    this._user = new tables.user(db.collections.user);
    this._permissions = new tables.permissions(db.collections.permission);
    this._settings = new tables.settings(db.collections.settings);
    this._session = new tables.session(db.collections.session);
    this._app_state = new tables.app_state(db.collections.app_state);
    this._user_state = new tables.user_state(db.collections.user_state);
    this._contact = new tables.contact(db.collections.contact);
    this._contact_invite = new tables.contact_invite(db.collections.contact_invite);
    this._group = new tables.group(db.collections.group);
    this._member = new tables.member(db.collections.member);
    this._sync_queue = new tables.sync_queue(db.collections.sync_queue);
    this.is_initialized = true;
  }

  private get _collectionMap(): Record<string, any> {
    return {
      task: this._task,
      category: this._category,
      user: this._user,
      permissions: this._permissions,
      settings: this._settings,
      contact: this._contact,
      contact_invite: this._contact_invite,
      group: this._group,
      member: this._member,
      sync_queue: this._sync_queue,
    };
  }

  get collectionNames(): string[] {
    return Object.keys(this._collectionMap);
  }

  getCollection<T extends tables>(name: T["collection"]["name"]): T | undefined {
    return this._collectionMap[name];
  }

  get task() {
    if (!this._task) throw new Error("DB not initialized");
    return this._task;
  }

  get category() {
    if (!this._category) throw new Error("DB not initialized");
    return this._category;
  }

  get user() {
    if (!this._user) throw new Error("DB not initialized");
    return this._user;
  }

  get permissions() {
    if (!this._permissions) throw new Error("DB not initialized");
    return this._permissions;
  }

  get settings() {
    if (!this._settings) throw new Error("DB not initialized");
    return this._settings;
  }

  get session() {
    if (!this._session) throw new Error("DB not initialized");
    return this._session;
  }

  get app_state() {
    if (!this._app_state) throw new Error("DB not initialized");
    return this._app_state;
  }

  get user_state() {
    if (!this._user_state) throw new Error("DB not initialized");
    return this._user_state;
  }

  get contact() {
    if (!this._contact) throw new Error("DB not initialized");
    return this._contact;
  }

  get contact_invite() {
    if (!this._contact_invite) throw new Error("DB not initialized");
    return this._contact_invite;
  }

  get group() {
    if (!this._group) throw new Error("DB not initialized");
    return this._group;
  }

  get member() {
    if (!this._member) throw new Error("DB not initialized");
    return this._member;
  }

  get sync_queue() {
    if (!this._sync_queue) throw new Error("DB not initialized");
    return this._sync_queue;
  }
}

const DB = new DBClass();
export default DB;

async function initDB() {
  addRxPlugin(RxDBMigrationSchemaPlugin);
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBDevModePlugin);

  // TODO XXX: Migrate tasks and categories from "doenitDb".
  const DB = await createRxDatabase({
    name: "doenit-db",
    multiInstance: false,
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie({
        allowEmptyDB: true,
      }),
    }),
  });

  const collections = await DB.addCollections({
    user: { schema: schema.user },
    settings: { schema: schema.settings },
    permission: { schema: schema.permissions },
    task: {
      schema: schema.task,
      migrationStrategies: {
        1: (doc) => ({ ...doc, assigned_firebase_uid: doc.assigned_user_id ?? null }),
      },
    },
    category: { schema: schema.category },
    session: { schema: schema.session },
    app_state: { schema: schema.app_state },
    user_state: { schema: schema.user_state },

    contact: { schema: schema.contact },
    contact_invite: { schema: schema.contact_invite },
    group: { schema: schema.group },
    member: { schema: schema.member },
    sync_queue: { schema: schema.sync_queue },
  });

  for (const name of ["settings", "category", "task", "user", "contact", "contact_invite", "group", "member", "user_state"] as const) {
    const col = collections[name] as any;
    const needed = await col.migrationNeeded();
    if (needed) {
      console.log(`${name} migration needed - starting migration`);
      await col.migratePromise(1000);
      console.log(`${name} migration completed`);
    }
  }

  return DB;
}
