import { addRxPlugin, createRxDatabase } from "$lib/chunk/rxdb";
import { getRxStorageDexie, RxDBMigrationSchemaPlugin } from "$lib/chunk/rxdb_helper";
import { CategoryTable } from "./DB/Category";
import { TaskTable } from "./DB/Task";
import { RoomTable } from "./DB/Room";
import { InviteTable } from "./DB/Invite.svelte";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";

async function initDB() {
  addRxPlugin(RxDBMigrationSchemaPlugin);
  addRxPlugin(RxDBUpdatePlugin);

  const DB = await createRxDatabase({
    name: "doenitDb",
    storage: getRxStorageDexie({
      allowEmptyDB: true,
    }),
    multiInstance: false,
  });

  const collections = await DB.addCollections({
    Task: {
      autoMigrate: false,
      migrationStrategies: {
        1: function (oldDoc) {
          return oldDoc;
        },
        2: function (oldDoc) {
          return oldDoc;
        },
        3: function (oldDoc) {
          return oldDoc;
        },
        4: function (oldDoc) {
          // migration from v3 to v4: add updated_at field
          return {
            ...oldDoc,
            updated_at: oldDoc.created_at,
          };
        },
        5: function (oldDoc) {
          // migration from v4 to v5: add photo_ids field
          return {
            ...oldDoc,
            photo_ids: [],
          };
        },
        6: function (oldDoc) {
          if (!oldDoc.start_date) {
            oldDoc.start_date = oldDoc.due_date;
            oldDoc.due_date = null;
          } else if (oldDoc.start_date === oldDoc.due_date) {
            oldDoc.due_date = null;
          }

          return oldDoc;
        },
      },
      schema: {
        title: "task",
        version: 6,
        description: "describes a task",
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 50,
          },
          name: { type: "string" },
          description: { type: "string" },
          completed: { type: "number" },
          completed_at: { type: ["string", "null"] },
          due_date: { type: ["string", "null"] },
          start_date: { type: ["string", "null"] },
          repeat_interval: { type: "string" },
          repeat_specific_days: { type: "array", items: { type: "number" } },
          repeat_interval_number: { type: "number" },
          important: { type: "boolean" },
          urgent: { type: "boolean" },
          category_id: { type: "string" },
          room_id: { type: ["string", "null"] },
          archived: { type: "boolean" },
          created_at: { type: "string" },
          updated_at: { type: "string" },
          photo_ids: { type: "array", items: { type: "string" } },
        },
        required: ["id", "name", "archived", "created_at", "updated_at"],
        primaryKey: "id",
      },
    },
    Category: {
      autoMigrate: false,
      migrationStrategies: {
        1: function (oldDoc) {
          // migration from v0 to v1: add updated_at field
          return {
            ...oldDoc,
            updated_at: oldDoc.created_at,
          };
        },
      },
      schema: {
        title: "category",
        version: 1,
        description: "describes a category",
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 50,
          },
          name: { type: "string" },
          is_default: { type: "boolean" },
          archived: { type: "boolean" },
          created_at: { type: "string" },
          updated_at: { type: "string" },
        },
        required: ["id", "name", "archived", "created_at"],
        primaryKey: "id",
      },
    },
    Room: {
      autoMigrate: false,
      migrationStrategies: {
        1: function (oldDoc) {
          // migration from v0 to v1: add updated_at field
          return {
            ...oldDoc,
            updated_at: oldDoc.created_at,
          };
        },
      },
      schema: {
        title: "room",
        version: 1,
        description: "describes a room for shared tasks",
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 50,
          },
          name: { type: "string" },
          users: { type: "array", items: { type: "string" } },
          archived: { type: "boolean" },
          created_at: { type: "string" },
          updated_at: { type: "string" },
        },
        required: ["id", "name", "users", "archived", "created_at"],
        primaryKey: "id",
      },
    },
  });

  const task_needed = await collections.Task.migrationNeeded();
  if (task_needed) {
    console.log("Task migration needed");
    await collections.Task.migratePromise(1000);
  }
  const cate_needed = await collections.Category.migrationNeeded();
  if (cate_needed) {
    console.log("Category migration needed");
    await collections.Category.migratePromise(1000);
  }

  const room_needed = await collections.Room.migrationNeeded();
  if (room_needed) {
    console.log("Room migration needed");
    await collections.Room.migratePromise(1000);
  }

  return DB;
}

class DBClass {
  #Task: TaskTable | undefined;
  #Category: CategoryTable | undefined;
  #Room: RoomTable | undefined;
  #Invite = new InviteTable();

  async init() {
    if (!!this.#Task && !!this.#Category && !!this.#Room && !!this.#Invite) return;

    const db = await initDB();
    this.#Task = new TaskTable(db.collections.Task);
    this.#Category = new CategoryTable(db.collections.Category);
    this.#Room = new RoomTable(db.collections.Room);
  }

  get Task(): TaskTable {
    if (!this.#Task) throw new Error("Task table not initialized");

    return this.#Task;
  }

  get Category(): CategoryTable {
    if (!this.#Category) throw new Error("Category table not initialized");

    return this.#Category;
  }

  get Room(): RoomTable {
    if (!this.#Room) throw new Error("Room table not initialized");

    return this.#Room;
  }

  get Invite(): InviteTable {
    return this.#Invite;
  }
}

export const DB = new DBClass();
