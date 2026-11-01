import { createSinkroDB } from "@tertius4/sinkro-db";
import { dexieStorage } from "@tertius4/sinkro-db/dexie";
import { firestoreBackend } from "@tertius4/sinkro-db/firestore";
import { toStore } from "svelte/store";
import { context } from "$logic/context.svelte";
import firestore from "$services/firestore";
import { tables } from "./tables";

/** Requires firestore.init() to have been called. */
export function openSinkroDB() {
  return createSinkroDB({
    name: "doenit-sinkro",
    tables,
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
    channels: toStore(() => [...context.active_scopes]),
    onPushRejected: (item, error) => console.warn(`[sinkro] ${item.table} ${item.docId} refused:`, error),
    onChannelRemoved: (channel, unsent) => {
      if (unsent.length) console.warn(`[sinkro] ${channel} left with ${unsent.length} unsent changes`);
    },
    context: () => ({ userId: context.user?.firebase_uid ?? null }),
    warnings: import.meta.env.DEV,
  });
}
