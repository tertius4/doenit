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

  async init() {
    if (this.is_initialized) return;

    const db = await initDB();

    this._task = new tables.task(db.collections.task);
    this._category = new tables.category(db.collections.category);
    this._user = new tables.user(db.collections.user);
    this._permissions = new tables.permissions(db.collections.permission);
    this._settings = new tables.settings(db.collections.settings);
    this._session = new tables.session(db.collections.session);
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
