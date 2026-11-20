// @ts-nocheck
// Fase 3: a task's checklist (schema and the pure rules in logic/checklist.ts) and turning a task into a project.
import { test } from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import { task as task_schema } from "../src/lib/domain/schema/task.ts";
import {
  MAX_CHECKLIST_ITEMS,
  checklistLabel,
  cleanChecklist,
  projectFromTask,
  resetChecklist,
  toggleChecklistItem,
} from "../src/lib/logic/checklist.ts";

const validate = new Ajv({ strict: false }).compile({ ...task_schema, additionalProperties: false });
const NOW = "2026-11-20 16:00:00";

function task(overrides = {}) {
  return {
    id: "t1",
    name: "Trek in",
    description: "",
    archived: false,
    completed: 0,
    completed_at: null,
    due_date: null,
    start_date: null,
    repeat_interval: "",
    repeat_specific_days: [],
    repeat_interval_number: 1,
    important: false,
    photo_ids: [],
    list_id: null,
    scope_id: null,
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    checklist: [],
    ...overrides,
  };
}

test("the schema takes a checklist and rejects bad items", () => {
  assert.ok(validate(task({ checklist: [{ id: "a", text: "Bokse", done: false }] })));
  assert.ok(!validate(task({ checklist: [{ id: "a", text: "Bokse" }] })), "done is required");
  assert.ok(!validate(task({ checklist: [{ id: "a", text: "x".repeat(301), done: false }] })), "text too long");
  const too_many = Array.from({ length: 101 }, (_, i) => ({ id: `${i}`, text: "x", done: false }));
  assert.ok(!validate(task({ checklist: too_many })), "more than 100 items");
});

test("cleanChecklist trims, drops empty items, gives ids and keeps to the limits", () => {
  const items = cleanChecklist([{ text: "  Bokse " }, { id: "b", text: "   ", done: true }, { id: "c", text: "Tape", done: true }]);
  assert.equal(items.length, 2);
  assert.equal(items[0].text, "Bokse");
  assert.ok(items[0].id);
  assert.equal(items[0].done, false);
  assert.deepEqual(items[1], { id: "c", text: "Tape", done: true });

  const many = cleanChecklist(Array.from({ length: 150 }, (_, i) => ({ text: `${i}` })));
  assert.equal(many.length, MAX_CHECKLIST_ITEMS);
  assert.equal(cleanChecklist([{ text: "x".repeat(400) }])[0].text.length, 300);
  assert.deepEqual(cleanChecklist(undefined), []);
});

test("a repeating task starts with every item open again", () => {
  const items = [
    { id: "a", text: "Was", done: true },
    { id: "b", text: "Droog", done: false },
  ];
  assert.deepEqual(resetChecklist(items), [
    { id: "a", text: "Was", done: false },
    { id: "b", text: "Droog", done: false },
  ]);
  assert.equal(items[0].done, true, "the original is not changed");
});

test("toggle and the 2/5 label", () => {
  const items = [
    { id: "a", text: "Een", done: false },
    { id: "b", text: "Twee", done: true },
  ];
  const toggled = toggleChecklistItem(items, "a");
  assert.equal(toggled[0].done, true);
  assert.equal(toggled[1].done, true);
  assert.equal(checklistLabel(items), "1/2");
  assert.equal(checklistLabel([]), null);
});

test("projectFromTask: a task for every item, ticked items completed", () => {
  const plan = projectFromTask(
    task({
      name: "Trek in",
      description: "Nuwe huis",
      start_date: "2026-12-01 09:00",
      due_date: "2026-12-05 17:00",
      photo_ids: ["p1"],
      checklist: [
        { id: "a", text: "Bokse", done: true },
        { id: "b", text: "Lorrie", done: false },
      ],
    }),
    NOW,
  );

  assert.deepEqual(plan.list, { name: "Trek in", description: "Nuwe huis", completable: true, target_date: "2026-12-05" });
  assert.equal(plan.tasks.length, 2);
  assert.deepEqual(plan.tasks[0], {
    name: "Bokse",
    description: "",
    archived: true,
    completed: 1,
    completed_at: NOW,
    photo_ids: ["p1"],
  });
  assert.equal(plan.tasks[1].archived, false);
  assert.equal(plan.tasks[1].completed_at, null);
  assert.deepEqual(plan.tasks[1].photo_ids, []);
});

test("projectFromTask: a long description goes on the first task, a lone start date is the target", () => {
  const long = "x".repeat(300);
  const plan = projectFromTask(
    task({ description: long, start_date: "2026-12-01", checklist: [{ id: "a", text: "Een", done: false }] }),
    NOW,
  );
  assert.equal(plan.list.description, "");
  assert.equal(plan.tasks[0].description, long);
  assert.equal(plan.list.target_date, "2026-12-01");
  assert.equal(projectFromTask(task({ checklist: [] }), NOW).list.target_date, null);
});
