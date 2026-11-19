// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";

// Runs only where fake-indexeddb is installed (`npm i -D fake-indexeddb`); skipped otherwise.
const fake = await import("fake-indexeddb").catch(() => null);
const { Dexie } = await import("dexie");
const { keepReopenable, reopenClosed } = await import("../src/lib/domain/reopen.ts");

/** A Dexie connection opened the way RxDB's Dexie storage opens it. */
async function openLikeRxdb(name, reopenable) {
  const dexie_db = new Dexie(name, { autoOpen: false, indexedDB: fake.indexedDB, IDBKeyRange: fake.IDBKeyRange });
  if (reopenable) keepReopenable(dexie_db);
  dexie_db.version(1).stores({ docs: "id" });
  await dexie_db.open();
  await dexie_db.table("docs").put({ id: "a" });
  return dexie_db;
}

/** What the WebView does when it drops the connection: fires `close` on the IDBDatabase. */
function closeFromOutside(dexie_db) {
  dexie_db.backendDB().onclose(new Event("close"));
}

test("without the fix, a connection closed from outside stays closed", { skip: !fake }, async () => {
  const dexie_db = await openLikeRxdb("zonder", false);
  closeFromOutside(dexie_db);
  await assert.rejects(dexie_db.table("docs").get("a"), { name: "DatabaseClosedError" });
});

test("a connection closed from outside reopens on the next call", { skip: !fake }, async () => {
  const dexie_db = await openLikeRxdb("volgende-oproep", true);
  closeFromOutside(dexie_db);
  assert.deepEqual(await dexie_db.table("docs").get("a"), { id: "a" });
});

test("reopenClosed reopens a connection closed from outside", { skip: !fake }, async () => {
  const dexie_db = await openLikeRxdb("hervat", true);
  closeFromOutside(dexie_db);
  assert.equal(dexie_db.isOpen(), false);
  await reopenClosed();
  assert.equal(dexie_db.isOpen(), true);
});

test("a deliberate close stays closed", { skip: !fake }, async () => {
  const dexie_db = await openLikeRxdb("doelbewus", true);
  dexie_db.close();
  await reopenClosed();
  assert.equal(dexie_db.isOpen(), false);
  await assert.rejects(dexie_db.table("docs").get("a"), { name: "DatabaseClosedError" });
});
