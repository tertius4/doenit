import { migrateCategories } from "./mapper-category";
import { migrateTasks } from "./mapper-task";
import Dexie from "dexie";

// The old app used RxDB (Dexie storage) with database name "doenitDb".
// RxDB creates one IndexedDB per collection, named:
//   rxdb-dexie-<dbName>--<schemaVersion>--<collectionName>
// with the documents in the "docs" object store.
const LEGACY_DB_NAME = "doenitDb";
const MAX_SCHEMA_VERSION = 20;

type LegacyDocLike = { toJSON: () => any };
type LegacyCollectionReader = {
  find: () => {
    exec: () => Promise<LegacyDocLike[]>;
  };
};
type LegacyDbReader = {
  Task: LegacyCollectionReader;
  Category: LegacyCollectionReader;
  close: () => Promise<void>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listIndexedDbNames(): Promise<string[]> {
  try {
    const listDatabases = (indexedDB as any)?.databases;
    if (typeof listDatabases !== "function") return [];

    const dbs = await listDatabases.call(indexedDB);
    return (dbs || []).map((item: { name?: string }) => item?.name).filter((name: string | undefined): name is string => !!name);
  } catch {
    return [];
  }
}

/**
 * Find the IndexedDB names that hold the given legacy collection, newest schema version first.
 * Uses indexedDB.databases() when available, otherwise probes with Dexie.exists (which never creates a database).
 */
async function findLegacyStoreNames(collectionName: "Task" | "Category", indexedDbNames: string[]): Promise<string[]> {
  const listed_regex = new RegExp(`^rxdb-dexie-${escapeRegExp(LEGACY_DB_NAME)}--(\\d+)--${collectionName}$`);
  const found = new Map<number, string>();

  for (const name of indexedDbNames) {
    const hit = name.match(listed_regex);
    if (hit) found.set(Number(hit[1]), name);
  }

  if (!found.size) {
    for (let version = 0; version <= MAX_SCHEMA_VERSION; version += 1) {
      const name = `rxdb-dexie-${LEGACY_DB_NAME}--${version}--${collectionName}`;
      if (await Dexie.exists(name)) found.set(version, name);
    }
  }

  return Array.from(found.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, name]) => name);
}

/** Documents are stored flat in the "docs" store. Dexie stores boolean indexes (like _deleted) as "1"/"0". */
function isDeleted(doc: any) {
  return doc._deleted === true || doc._deleted === "1";
}

/** Read all documents from the "docs" store only ("changes" and "attachments" are RxDB bookkeeping). */
async function readDocsFromIndexedDb(dbName: string): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(dbName);

    // The database does not exist yet - abort so we don't create an empty one.
    openRequest.onupgradeneeded = () => openRequest.transaction?.abort();
    openRequest.onerror = () => {
      const error = openRequest.error;
      // AbortError is expected when the db did not exist.
      if (error?.name === "AbortError") resolve([]);
      else reject(error || new Error(`Failed opening ${dbName}`));
    };
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains("docs")) {
        db.close();
        resolve([]);
        return;
      }

      const request = db.transaction("docs", "readonly").objectStore("docs").getAll();
      request.onerror = () => {
        db.close();
        reject(request.error || new Error(`Failed reading ${dbName}`));
      };
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
    };
  });
}

async function readLegacyCollectionDocs(collectionName: "Task" | "Category", indexedDbNames: string[]) {
  const store_names = await findLegacyStoreNames(collectionName, indexedDbNames);

  // Newest schema version first; the first doc seen for an id wins.
  const docs_by_id = new Map<string, any>();
  for (const store_name of store_names) {
    const rows = await readDocsFromIndexedDb(store_name);
    const docs = rows.filter((doc) => doc && typeof doc === "object" && doc.id && !isDeleted(doc));

    for (const doc of docs) {
      if (!docs_by_id.has(doc.id)) docs_by_id.set(doc.id, doc);
    }
  }

  return Array.from(docs_by_id.values());
}

function wrapLegacyDocs(docs: any[]): LegacyCollectionReader {
  return {
    find() {
      return {
        async exec() {
          return docs.map((doc) => ({ toJSON: () => doc }));
        },
      };
    },
  };
}

async function buildLegacyDbReader(): Promise<LegacyDbReader | null> {
  const indexedDbNames = await listIndexedDbNames();

  const [taskDocs, categoryDocs] = await Promise.all([
    readLegacyCollectionDocs("Task", indexedDbNames),
    readLegacyCollectionDocs("Category", indexedDbNames),
  ]);

  if (!taskDocs.length && !categoryDocs.length) return null;

  return {
    Task: wrapLegacyDocs(taskDocs),
    Category: wrapLegacyDocs(categoryDocs),
    async close() {
      // Read-only adapter has no persistent handle.
    },
  };
}

export async function runMigration() {
  let legacyDb: LegacyDbReader | null = null;

  try {
    legacyDb = await buildLegacyDbReader();
    if (!legacyDb) return;

    const category_result = await migrateCategories(legacyDb);
    if (!category_result.ok) throw new Error(category_result.error);
    const category_summary = category_result.value;
    if (!category_summary) throw new Error("Category migration returned no summary");
    
    const task_result = await migrateTasks(legacyDb);
    if (!task_result.ok) throw new Error(task_result.error);
    const task_summary = task_result.value;
    if (!task_summary) throw new Error("Task migration returned no summary");    
  } finally {
    try {
      await legacyDb?.close();
    } catch {
      // Ignore close errors.
    }
  }
}
