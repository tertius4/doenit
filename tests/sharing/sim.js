// @ts-nocheck
// In-memory model of the group sync (SyncQueue → PushProcessor → Firestore → PullProcessor → MergeEngine).
// `legacy` mirrors the old algorithm (device-clock cursor with a 5 min skew margin, updated_at queries, strict merge,
// dead-letter after 20 attempts). `fixed` mirrors the new one (server-stamped synced_at cursor, lenient merge, no
// dead-letter). Merges validate against the real task schema with additionalProperties: false, as RxDB does.
import Ajv from "ajv";
import { task as task_schema } from "../../src/lib/domain/schema/task.ts";

const CLOCK_SKEW_MS = 5 * 60 * 1000;
const EPOCH = new Date(0).toISOString();

const validateTask = new Ajv({ strict: false }).compile({ ...task_schema, additionalProperties: false });
const TASK_FIELDS = new Set(Object.keys(task_schema.properties));

/** Shared wall clock (ms). The server reads it directly; devices add their own offset. */
export class Clock {
  now = Date.parse("2026-10-17T08:00:00.000Z");
  advance(ms) {
    this.now += ms;
  }
}

export class FakeFirestore {
  /** @type {Map<string, Map<string, any>>} */
  scopes = new Map();
  /** @type {{ scope_id: string, mode: string, since: string, callback: () => void }[]} */
  listeners = [];

  constructor(clock) {
    this.clock = clock;
  }

  items(scope_id) {
    if (!this.scopes.has(scope_id)) this.scopes.set(scope_id, new Map());
    return this.scopes.get(scope_id);
  }

  /** setDoc. In fixed mode the server stamps synced_at with its own clock (serverTimestamp()). */
  write(doc, mode) {
    const stored = { ...doc, collection: "task" };
    if (mode === "fixed") stored.synced_at = new Date(this.clock.now).toISOString();
    this.items(doc.scope_id).set(doc.id, stored);

    for (const l of this.listeners) {
      if (l.scope_id !== doc.scope_id) continue;
      // Legacy listener: where("updated_at", ">", since). Fixed: any new write (orderBy synced_at desc, limit 1).
      if (l.mode === "fixed" || stored.updated_at > l.since) l.callback();
    }
  }

  /** Legacy query: where("updated_at", ">", since) orderBy updated_at. */
  fetchByUpdatedAt(scope_id, since) {
    return [...this.items(scope_id).values()]
      .filter((d) => !since || d.updated_at > since)
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
      .map((d) => ({ ...d }));
  }

  /** Fixed query: full fetch without a cursor, else where("synced_at", ">", since). Docs without synced_at drop out of cursor queries, as in Firestore. */
  fetchBySyncedAt(scope_id, since) {
    return [...this.items(scope_id).values()]
      .filter((d) => !since || (d.synced_at && d.synced_at > since))
      .map((d) => ({ ...d }));
  }

  subscribe(scope_id, mode, since, callback) {
    const listener = { scope_id, mode, since, callback };
    this.listeners.push(listener);
    return () => (this.listeners = this.listeners.filter((l) => l !== listener));
  }
}

let next_id = 1;

export class Device {
  online = true;
  /** @type {Map<string, any>} */
  local = new Map();
  /** @type {{ id: string, attempts: number, last_attempt_at: number }[]} */
  queue = [];
  /** @type {Record<string, string>} */
  cursors = {};
  /** Returns true to make the next push attempt fail (e.g. permission denied). */
  failPush = () => false;
  /** Extra fields an older/newer app version writes that this schema doesn't know. */
  extra_fields = {};

  constructor(name, server, clock, { mode = "legacy", offset_ms = 0, scope_id = "g1" } = {}) {
    Object.assign(this, { name, server, clock, mode, offset_ms, scope_id });
  }

  now() {
    return new Date(this.clock.now + this.offset_ms).toISOString();
  }

  create(fields = {}) {
    const date = this.now();
    const doc = {
      id: `t${next_id++}`,
      name: "Task",
      archived: false,
      created_at: date,
      updated_at: date,
      soft_deleted: false,
      version: 0,
      owner_id: this.name,
      device_id: this.name,
      scope_id: this.scope_id,
      ...this.extra_fields,
      ...fields,
    };
    this.local.set(doc.id, doc);
    this.enqueue(doc.id);
    return doc;
  }

  edit(id, changes) {
    const doc = this.local.get(id);
    this.local.set(id, { ...doc, ...changes, version: doc.version + 1, updated_at: this.now(), device_id: this.name });
    this.enqueue(id);
  }

  enqueue(id) {
    const existing = this.queue.find((q) => q.id === id);
    if (existing) Object.assign(existing, { attempts: 0 });
    else this.queue.push({ id, attempts: 0, last_attempt_at: 0 });
  }

  /** Mirrors SyncQueue.getBatch eligibility: 30 s between early retries, 5 min once attempts reach 5. */
  eligible(item) {
    if (item.attempts === 0) return true;
    const wait = item.attempts < 5 ? 30_000 : 5 * 60 * 1000;
    return item.last_attempt_at < this.clock.now - wait;
  }

  push() {
    if (!this.online) return;
    for (const item of [...this.queue]) {
      if (!this.eligible(item)) continue;
      if (this.failPush()) {
        item.attempts++;
        item.last_attempt_at = this.clock.now;
        // Legacy dead-letter: the change is gone for good.
        if (this.mode === "legacy" && item.attempts >= 20) this.queue = this.queue.filter((q) => q !== item);
        continue;
      }
      this.server.write(this.local.get(item.id), this.mode);
      this.queue = this.queue.filter((q) => q !== item);
    }
  }

  pull() {
    if (!this.online) return;
    const scope_id = this.scope_id;

    if (this.mode === "legacy") {
      const cursor = this.cursors[scope_id];
      const since = cursor ? new Date(Date.parse(cursor) - CLOCK_SKEW_MS).toISOString() : undefined;
      const pull_start = this.now();
      for (const remote of this.server.fetchByUpdatedAt(scope_id, since)) this.merge(remote);
      this.cursors[scope_id] = pull_start;
      return;
    }

    const key = `s:${scope_id}`;
    const since = this.cursors[key];
    const remote_docs = this.server.fetchBySyncedAt(scope_id, since);
    for (const remote of remote_docs) this.merge(remote);

    const latest = remote_docs.reduce((max, d) => (d.synced_at && d.synced_at > max ? d.synced_at : max), since ?? EPOCH);
    this.cursors[key] = latest;
    delete this.cursors[scope_id]; // Legacy cursor is retired on the first new-style pull.
  }

  /** Mirrors MergeEngine.apply. */
  merge(remote) {
    const { collection: _c, synced_at: _s, ...doc } = remote;
    const clean = this.mode === "fixed" ? Object.fromEntries(Object.entries(doc).filter(([k]) => TASK_FIELDS.has(k))) : doc;
    const local = this.local.get(clean.id);

    if (!local) {
      if (clean.soft_deleted) return;
      // createRaw → AJV. Legacy ignores the failed result; the doc is silently dropped.
      if (!validateTask(clean)) return;
      this.local.set(clean.id, clean);
      return;
    }

    if (shouldApplyRemote(local, clean)) {
      const merged = { ...local, ...clean };
      if (!validateTask(merged)) return;
      this.local.set(clean.id, merged);
    }
  }

  /** Mirrors SyncEngine.startRealtimeSync: a listener that triggers a pull. */
  listen(onChange) {
    return this.server.subscribe(this.scope_id, this.mode, this.now(), onChange);
  }

  /** Mirrors ScopeManager.purgeLocalScope after leaving a group. */
  purge() {
    for (const [id, doc] of this.local) if (doc.scope_id === this.scope_id) this.local.delete(id);
    this.queue = [];
    delete this.cursors[this.scope_id];
    delete this.cursors[`s:${this.scope_id}`];
  }

  sees(id) {
    const doc = this.local.get(id);
    return !!doc && !doc.soft_deleted;
  }
}

function shouldApplyRemote(local, remote) {
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;
  if (remote.updated_at > local.updated_at) return true;
  if (remote.updated_at < local.updated_at) return false;
  return remote.device_id > local.device_id;
}

/** A fresh world with an owner (A) and a member (B), both in group g1. */
export function world(mode = "legacy", { a = {}, b = {} } = {}) {
  const clock = new Clock();
  const server = new FakeFirestore(clock);
  const A = new Device("A", server, clock, { mode, ...a });
  const B = new Device("B", server, clock, { mode, ...b });
  return { clock, server, A, B };
}

export const MIN = 60 * 1000;
