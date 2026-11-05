/**
 * Durable orders to add or remove someone's scope, so work done offline still reaches their membership list.
 * A removal takes away access, so it waits for what is queued for the scope, and the user's own removal goes last.
 */

import DB from "$domain/db";
import { context } from "$logic/context.svelte";
import versionGate from "$services/version-gate.svelte";
import { MembershipService } from "./MembershipService";

type Order = Pick<DB.MembershipOrder, "entity_id" | "scope_id" | "op">;

let running = false;
let dirty = false;

async function apply(item: DB.MembershipOrder): Promise<void> {
  try {
    if (item.op === "delete") await MembershipService.removeScope(item.entity_id, item.scope_id);
    else await MembershipService.addScope(item.entity_id, item.scope_id);

    await DB.membership_queue.remove(item.id);
  } catch (err) {
    console.warn(`[MembershipQueue] ${item.op} ${item.scope_id} failed, it stays queued:`, err);
  }
}

async function run(): Promise<void> {
  if (!navigator.onLine || versionGate.outdated) return;

  const items = await DB.membership_queue.findMany({ sort: ["created_at"] });
  if (!items.ok || !items.value.length) return;

  const my_uid = context.user?.firebase_uid;
  const removals = items.value.filter((item) => item.op === "delete");
  const isOwn = (item: DB.MembershipOrder) => item.entity_id === my_uid;

  for (const item of items.value) {
    if (item.op !== "delete") await apply(item);
  }

  if (!removals.length) return;

  await DB.sync.flush();
  for (const item of removals.filter((item) => !isOwn(item))) await apply(item);
  for (const item of removals.filter(isOwn)) await apply(item);
}

export const MembershipQueue = {
  async enqueue(orders: Order[]): Promise<void> {
    for (const order of orders) {
      const { entity_id, scope_id, op } = order;
      const existing = await DB.membership_queue.findOne({ where: { entity_id, scope_id } });
      if (!existing.ok) throw new Error(existing.error);

      const saved = existing.value
        ? await DB.membership_queue.update(existing.value.id, { op })
        : await DB.membership_queue.create(order);
      if (!saved.ok) throw new Error(saved.error);
    }

    this.flush().catch((err) => console.warn("[MembershipQueue] flush failed:", err));
  },

  /** Runs what is queued. Failed orders stay and run again on the next call. */
  async flush(): Promise<void> {
    if (running) {
      dirty = true;
      return;
    }

    running = true;
    try {
      do {
        dirty = false;
        await run();
      } while (dirty);
    } finally {
      running = false;
    }
  },
};
