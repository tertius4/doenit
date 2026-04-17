import { addRxPlugin, createRxDatabase } from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";

import * as schema from "./schema";
import * as tables from "./tables";

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
  private _group: tables.group | undefined;
  private _group_contact: tables.group_contact | undefined;

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
    this._group = new tables.group(db.collections.group);
    this._group_contact = new tables.group_contact(db.collections.group_contact);
    this.is_initialized = true;
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

  get group() {
    if (!this._group) throw new Error("DB not initialized");
    return this._group;
  }

  get group_contact() {
    if (!this._group_contact) throw new Error("DB not initialized");
    return this._group_contact;
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
    task: { schema: schema.task },
    category: { schema: schema.category },
    session: { schema: schema.session },
    app_state: { schema: schema.app_state },
    user_state: { schema: schema.user_state },

    contact: { schema: schema.contact },
    group: { schema: schema.group },
    group_contact: { schema: schema.group_contact },
  });

  const task_needed = await collections.task.migrationNeeded();
  if (task_needed) {
    console.log("Task migration needed - starting migration");
    await collections.task.migratePromise(1000);
    console.log("Task migration completed");
  }

  const category_needed = await collections.category.migrationNeeded();
  if (category_needed) {
    console.log("Category migration needed - starting migration");
    await collections.category.migratePromise(1000);
    console.log("Category migration completed");
  }

  return DB;
}
