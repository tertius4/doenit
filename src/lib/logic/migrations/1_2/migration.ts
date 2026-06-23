import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { wait } from "$lib";
import { migrateCategories } from "./mapper-category";
import { migrateTasks } from "./mapper-task";
import Dexie from "dexie";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { addRxPlugin, createRxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

export async function runMigration() {
  const exists = await Dexie.exists("doenitDb");
  if (!exists) return;

  // Init Old DB.
  const legacyDb = await initDB();
  // Migrate categories.
  await migrateCategories(legacyDb);
  // Migrate tasks.
  await migrateTasks(legacyDb);

  //   await DB.app_state.update({
  //     id: context.app_state.id,
  //     migration_1_complete: true,
  //   });
}

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

  await DB.addCollections({
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
        7: function (oldDoc) {
          oldDoc.room_id = undefined;
          return oldDoc;
        },
        8: (oldDoc) => oldDoc,
        9: (oldDoc) => {
          oldDoc.assigned_user_email = null;
          oldDoc.assigned_user_id = undefined;

          return oldDoc;
        },
      },
      schema: {
        title: "task",
        version: 9,
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
          category_id: { type: ["string", "null"] },
          assigned_user_email: { type: ["string", "null"] },
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
          id: { type: "string", maxLength: 50 },
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
  });
  return DB;
}
