import JSZip from "jszip";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import DB from "$domain/db";
import * as schema from "$domain/schema";
import { context } from "$logic/context.svelte";
import Api from "$logic/api";
import { err } from "$lib";
import t from "$display/translate";
import { PHOTO_DIR } from "$services/photos.svelte";

const FORMAT = 1;
const BACKUP_FILE = "backup.json";
const PHOTOS_FOLDER = "photos/";

/** Settings that are safe to carry to another phone. */
const SETTING_KEYS = [
  "theme",
  "language",
  "text_size",
  "notifications_enabled",
  "present_task_reminder_enabled",
  "present_task_reminder_time",
  "past_task_reminder_enabled",
  "past_task_reminder_time",
] as (keyof DB.Settings)[];

type BackupFile = {
  format: number;
  app_version: string;
  exported_at: string;
  schema: { task: number; category: number };
  tasks: DB.Task[];
  categories: DB.Category[];
  settings: Partial<DB.Settings>;
};

export type RestoreSummary = { added: number; updated: number; skipped: number };

/** Only personal data is backed up; items in a group (scope_id set) come back through sync. */
const isPersonal = (doc: { scope_id?: string | null }) => !doc.scope_id;

/** Decides what to do with an incoming document, last write wins. */
export function mergeDoc(existing: { updated_at: string } | null, incoming: { updated_at: string }) {
  if (!existing) return "add";
  return incoming.updated_at > existing.updated_at ? "update" : "skip";
}

export async function createBackup(options: { photos: boolean }): AsyncResult {
  try {
    const tasks = await DB.task.findMany({});
    if (!tasks.ok) return tasks;
    const categories = await DB.category.findMany({});
    if (!categories.ok) return categories;

    const settings: Partial<DB.Settings> = {};
    for (const key of SETTING_KEYS) (settings as any)[key] = context.settings[key];

    const backup: BackupFile = {
      format: FORMAT,
      app_version: context.app_state.app_version,
      exported_at: new Date().toISOString(),
      schema: { task: schema.task.version, category: schema.category.version },
      tasks: tasks.value.filter(isPersonal),
      categories: categories.value.filter(isPersonal),
      settings,
    };

    const zip = new JSZip();
    zip.file(BACKUP_FILE, JSON.stringify(backup));

    if (options.photos) {
      const ids = new Set(backup.tasks.flatMap((task) => task.photo_ids ?? []));
      for (const id of ids) {
        try {
          const file = await Filesystem.readFile({ path: `${PHOTO_DIR}/${id}`, directory: Directory.Data });
          zip.file(PHOTOS_FOLDER + id, file.data as string, { base64: true });
        } catch {
          // Photo file is missing on disk: back up the rest.
        }
      }
    }

    const filename = `doenit-backup-${backup.exported_at.slice(0, 10)}.zip`;
    const base64 = await zip.generateAsync({ type: "base64" });
    await deliver(filename, base64);

    // Only used to show "last backup"; never fail a finished backup over it.
    try {
      await DB.user_state.update(context.user_state.id, { last_backed_up: backup.exported_at });
    } catch {}
    return { ok: true };
  } catch (error) {
    return err(error instanceof Error ? error.message : JSON.stringify(error));
  }
}

export async function restoreBackup(base64: string): AsyncResult<RestoreSummary> {
  try {
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const json = await zip.file(BACKUP_FILE)?.async("string");
    if (!json) return err(t("invalid_backup_data_format"));

    const backup = JSON.parse(json) as BackupFile;
    if (backup.format !== FORMAT || !Array.isArray(backup.tasks) || !Array.isArray(backup.categories)) {
      return err(t("invalid_backup_data_format"));
    }
    if (backup.schema.task > schema.task.version || backup.schema.category > schema.category.version) {
      return err(t("invalid_backup_data_format"));
    }

    const summary: RestoreSummary = { added: 0, updated: 0, skipped: 0 };
    // Categories first so tasks never point to a missing category.
    await mergeTable(DB.category, backup.categories, summary);
    await mergeTable(DB.task, backup.tasks, summary);

    await restorePhotos(zip);

    const settings = Object.fromEntries(
      SETTING_KEYS.filter((k) => backup.settings?.[k] !== undefined).map((k) => [k, backup.settings[k]]),
    );
    if (Object.keys(settings).length) {
      const updated = await Api.settings.update(settings);
      if (!updated.ok) return updated;
    }

    return { ok: true, value: summary };
  } catch (error) {
    return err(error instanceof Error ? error.message : JSON.stringify(error));
  }
}

async function mergeTable<T extends DB.Task | DB.Category>(table: any, docs: T[], summary: RestoreSummary) {
  for (const doc of docs) {
    const existing = await table.findById(doc.id);
    if (!existing.ok) throw new Error(existing.error);

    const action = mergeDoc(existing.value, doc);
    if (action === "skip") {
      summary.skipped++;
      continue;
    }

    // Make the document look native to this phone.
    const local = {
      ...doc,
      scope_id: null,
      owner_id: context.user?.id || "device",
      device_id: context.app_state.device_id,
    };
    const result = action === "add" ? await table.createRaw(local) : await table.updateRaw(doc.id, local);
    if (!result.ok) throw new Error(result.error);

    if (action === "add") summary.added++;
    else summary.updated++;
  }
}

async function restorePhotos(zip: JSZip) {
  const files = zip.file(new RegExp(`^${PHOTOS_FOLDER}`));
  if (!files.length) return;

  await Filesystem.mkdir({ path: PHOTO_DIR, directory: Directory.Data, recursive: true }).catch(() => {});

  for (const entry of files) {
    const path = `${PHOTO_DIR}/${entry.name.slice(PHOTOS_FOLDER.length)}`;
    const exists = await Filesystem.stat({ path, directory: Directory.Data }).then(
      () => true,
      () => false,
    );
    if (exists) continue;

    await Filesystem.writeFile({ path, directory: Directory.Data, data: await entry.async("base64") });
  }
}

/** Hands the zip to the user: share sheet on a phone, a download in the browser. */
async function deliver(filename: string, base64: string) {
  if (!Capacitor.isNativePlatform()) {
    const link = document.createElement("a");
    link.href = `data:application/zip;base64,${base64}`;
    link.download = filename;
    link.click();
    return;
  }

  await Filesystem.writeFile({ path: filename, directory: Directory.Cache, data: base64 });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({ files: [uri] });
}
