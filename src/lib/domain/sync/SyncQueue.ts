import DB from "../db";
import syncEngine from "./SyncEngine";

export const SyncQueue = {
  // 🔥 ENQUEUE (met dedupe)
  async enqueue(input: { table_name: string; entity_id: string; scope_id: string; op: "upsert" | "delete" }) {
    const existing_result = await DB.sync_queue.findOne({
      selector: {
        table_name: input.table_name,
        entity_id: input.entity_id,
      },
    });

    if (!existing_result.ok) {
      throw new Error(`Failed to access sync queue: ${existing_result.error}`);
    }

    const existing = existing_result.value;
    if (existing) {
      await DB.sync_queue.update(existing.id, {
        op: input.op,
        created_at: new Date().toISOString(),
        attempts: 0,
      });

      syncEngine.requestTick();
      return existing;
    }

    const result = await DB.sync_queue.create({
      table_name: input.table_name,
      entity_id: input.entity_id,
      scope_id: input.scope_id,
      op: input.op,
      attempts: 0,
    });

    syncEngine.requestTick();
    return result;
  },

  async enqueueMany(items: { table_name: string; entity_id: string; scope_id: string; op: "upsert" | "delete" }[]) {
    const date = new Date().toISOString();
    const existing_items_result = await DB.sync_queue.findMany({
      selector: {
        $or: items.map((item) => ({
          table_name: item.table_name,
          entity_id: item.entity_id,
        })),
      },
    });

    if (!existing_items_result.ok) {
      throw new Error(`Failed to access sync queue: ${existing_items_result.error}`);
    }

    const existing_items = existing_items_result.value;
    const items_map = new Map(items.map((i) => [`${i.table_name}:${i.entity_id}`, i]));
    await DB.sync_queue.updateMany(
      existing_items.map((existing) => {
        const input = items_map.get(`${existing.table_name}:${existing.entity_id}`)!;
        return {
          id: existing.id,
          changes: {
            op: input.op,
            created_at: date,
            attempts: 0,
          },
        };
      }),
    );

    const existing_items_keys = new Set(existing_items.map((e) => `${e.table_name}:${e.entity_id}`));
    const new_items = items
      .filter((item) => !existing_items_keys.has(`${item.table_name}:${item.entity_id}`))
      .map((item) => ({
        id: crypto.randomUUID(),
        created_at: date,
        updated_at: date,
        attempts: 0,
        ...item,
      }));

    if (!new_items.length) return { ok: true, value: existing_items };

    const result = await DB.sync_queue.createMany(new_items);
    if (!result.ok) {
      throw new Error(`Failed to enqueue sync items: ${result.error}`);
    }

    syncEngine.requestTick();

    return { ok: true, value: [...existing_items, ...result.value] };
  },

  // 📦 GET BATCH (met retry filtering)
  async getBatch(limit = 50) {
    const now = Date.now();
    const items = await DB.sync_queue.findMany({
      selector: {
        $or: [
          // Never attempted — always eligible
          { attempts: 0 },
          // Early retries (1–4): minimum 30 s delay between attempts
          {
            $and: [
              { attempts: { $gt: 0, $lt: 5 } },
              { last_attempt_at: { $lt: now - 30_000 } },
            ],
          },
          // Later retries (≥5): full exponential backoff
          {
            $and: [
              { attempts: { $gte: 5 } },
              { last_attempt_at: { $lt: now - this.backoffTime(5) } },
            ],
          },
        ],
      },
      sort: [{ created_at: "asc" }],
      limit,
    });

    return items;
  },

  // ❌ REMOVE (success)
  async remove(id: string) {
    await DB.sync_queue.remove(id);
  },

  // 🔁 MARK FAILED
  async markFailed(id: string) {
    const result = await DB.sync_queue.findById(id);
    if (!result.ok) return;

    const doc = result.value;
    if (!doc) return;

    const new_attempts = doc.attempts + 1;

    // Dead-letter: permanently discard items that keep failing
    if (new_attempts >= 20) {
      await DB.sync_queue.remove(id);
      return;
    }

    await DB.sync_queue.update(id, {
      attempts: new_attempts,
      last_attempt_at: Date.now(),
    });
  },

  // ⏱ BACKOFF
  backoffTime(attempts = 1) {
    return Math.min(60000 * 2 ** attempts, 5 * 60 * 1000);
  },
};
