// @ts-nocheck
// Every RxDB collection needs exactly one migration strategy per schema version step (RxDB error COL12 otherwise).
// db.ts can't be imported here, so its source is read: each collection's strategy keys must be 1..schema.version.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/domain/db.ts", import.meta.url), "utf8");
const block = source.slice(source.indexOf("addCollections({"), source.indexOf("for (const name of ["));
const names = [...block.matchAll(/\n {4}(\w+): \{/g)].map((match) => match[1]);
// The schema files import each other without extensions, so their version is read from the source too.
const schema_index = readFileSync(new URL("../src/lib/domain/schema/index.ts", import.meta.url), "utf8");
const schema_names = [...schema_index.matchAll(/export \{ (\w+) \}/g)].map((match) => match[1]);
const versionOf = (name) =>
  Number(readFileSync(new URL(`../src/lib/domain/schema/${name}.ts`, import.meta.url), "utf8").match(/version: (\d+)/)[1]);

test("db.ts registers every schema", () => {
  assert.deepEqual([...names].sort(), [...schema_names].sort());
});

for (const [index, name] of names.entries()) {
  test(`${name}: one migration strategy per schema version`, () => {
    const start = block.indexOf(`\n    ${name}: {`);
    const end = index + 1 < names.length ? block.indexOf(`\n    ${names[index + 1]}: {`) : block.length;
    const keys = [...block.slice(start, end).matchAll(/[{,\n]\s*(\d+): /g)].map((match) => Number(match[1]));
    const expected = Array.from({ length: versionOf(name) }, (_, i) => i + 1);
    assert.deepEqual([...new Set(keys)].sort((a, b) => a - b), expected);
  });
}
