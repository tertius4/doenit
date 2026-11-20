/**
 * Pure rules for tasks that wait on each other. A task's `after_task_id` names the task it waits on (B waits on A),
 * so a chain is a straight line A → B → C inside one list. No database access, so it can be tested. The restart of a
 * chain is also in functions/src/api/chain.ts, for the API: keep the two the same.
 */

export type Link = { id: string; after_task_id?: string | null; created_at?: string };
export type Change = { id: string; after_task_id: string | null };
type Dated = Link & { start_date?: string | null; due_date?: string | null };

/** The tasks waiting on `id`, oldest first. More than one only after a sync conflict. */
export function successorsOf<T extends Link>(tasks: T[], id: string): T[] {
  return tasks
    .filter((task) => task.after_task_id === id && task.id !== id)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id));
}

/** True when `task_id` waiting on `after_id` would close a circle (or wait on itself). */
export function wouldCycle(tasks: Link[], task_id: string, after_id: string | null): boolean {
  if (!after_id) return false;
  const by_id = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  for (let id: string | null | undefined = after_id; id; id = by_id.get(id)?.after_task_id) {
    if (id === task_id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return false;
}

/** Takes a task out of its chain: whatever waited on it waits on its predecessor (or nothing) instead. */
export function detach(tasks: Link[], task_id: string): Change[] {
  const task = tasks.find((t) => t.id === task_id);
  const before = task?.after_task_id ?? null;
  const changes = successorsOf(tasks, task_id).map((next) => ({ id: next.id, after_task_id: before }));
  if (before) changes.push({ id: task_id, after_task_id: null });
  return changes;
}

/**
 * Puts `task_id` straight after `after_id` (null: in no chain). It leaves its old place first, and whatever waited on
 * `after_id` now waits on it, so the chain stays a line: A → B plus "C after A" gives A → C → B.
 */
export function insertAfter(tasks: Link[], task_id: string, after_id: string | null): Change[] {
  const current = tasks.find((task) => task.id === task_id)?.after_task_id ?? null;
  if (current === after_id) return [];

  const changes = new Map<string, string | null>();
  for (const change of detach(tasks, task_id)) changes.set(change.id, change.after_task_id);
  const apply = () => tasks.map((task) => (changes.has(task.id) ? { ...task, after_task_id: changes.get(task.id) } : task));

  if (after_id) {
    for (const next of successorsOf(apply(), after_id)) if (next.id !== task_id) changes.set(next.id, task_id);
  }
  changes.set(task_id, after_id);

  const original = new Map(tasks.map((task) => [task.id, task.after_task_id ?? null]));
  return [...changes]
    .filter(([id, after]) => original.get(id) !== after)
    .map(([id, after_task_id]) => ({ id, after_task_id }));
}

/** After a sync conflict a task can have two successors: the second one's chain goes after the first one's end. */
export function normalize(tasks: Link[]): Change[] {
  let current = tasks.map((task) => ({ ...task }));
  const changes = new Map<string, string | null>();

  for (const task of tasks) {
    const [first, ...extra] = successorsOf(current, task.id);
    let tail = first ? tailOf(current, first.id) : null;
    for (const next of extra) {
      changes.set(next.id, tail);
      current = current.map((t) => (t.id === next.id ? { ...t, after_task_id: tail } : t));
      tail = tailOf(current, next.id);
    }
  }
  return [...changes].map(([id, after_task_id]) => ({ id, after_task_id }));
}

function tailOf(tasks: Link[], id: string): string {
  const seen = new Set([id]);
  let tail = id;
  for (let next = successorsOf(tasks, tail)[0]; next && !seen.has(next.id); next = successorsOf(tasks, tail)[0]) {
    seen.add(next.id);
    tail = next.id;
  }
  return tail;
}

/** A task waits while the task before it is still open. */
export function isWaiting(task: Link, open_ids: Set<string>): boolean {
  return !!task.after_task_id && task.after_task_id !== task.id && open_ids.has(task.after_task_id);
}

/** The first task of the chain `id` is in. */
export function headOf(tasks: Link[], id: string): string {
  const by_id = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  let head = id;
  for (let before = by_id.get(id)?.after_task_id; before && by_id.has(before) && !seen.has(before); ) {
    seen.add(head);
    head = before;
    before = by_id.get(before)?.after_task_id;
  }
  return head;
}

/** The ids of the chain `id` is in, in order from its first task. */
export function chainOf(tasks: Link[], id: string): string[] {
  const order: string[] = [];
  const visit = (current: string) => {
    if (order.includes(current)) return;
    order.push(current);
    for (const next of successorsOf(tasks, current)) visit(next.id);
  };
  visit(headOf(tasks, id));
  return order;
}

/** Keeps the order of `tasks`, but puts every task straight after the one it waits on, so a chain reads in order. */
export function orderChains<T extends Link>(tasks: T[]): T[] {
  const present = new Set(tasks.map((task) => task.id));
  const ordered: T[] = [];
  const done = new Set<string>();
  const emit = (task: T) => {
    if (done.has(task.id)) return;
    done.add(task.id);
    ordered.push(task);
    for (const next of tasks) if (next.after_task_id === task.id) emit(next);
  };

  for (const task of tasks) if (!task.after_task_id || !present.has(task.after_task_id)) emit(task);
  for (const task of tasks) emit(task); // Only a circle is left: keep it as it was.
  return ordered;
}

/** Whole days from one date to another ("YYYY-MM-DD", a time may follow and is ignored). */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number {
  if (!from || !to) return 0;
  const day = (value: string) => {
    const [year, month, date] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((day(to) - day(from)) / 86_400_000);
}

/** A date moved by whole days, keeping its time. */
export function shiftDate(value: string | null | undefined, days: number): string | null {
  if (!value) return null;
  if (!days) return value;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}${value.slice(10)}`;
}

/** The first task of a chain with tasks after it. Such a task repeats only once the whole chain is done. */
export function isChainHead(tasks: Link[], id: string): boolean {
  const task = tasks.find((t) => t.id === id);
  const has_before = !!task?.after_task_id && tasks.some((t) => t.id === task.after_task_id);
  return !has_before && successorsOf(tasks, id).length > 0;
}

type ChainTask = Dated & { archived?: boolean; repeat_interval?: string };

/**
 * A repeating chain starts over once every task in it is done: the first task gets its next dates (`next`), and
 * every other task is open again with its dates moved by as many days as the first task's.
 * @returns The changes, first task first; empty while the chain is not done or its first task doesn't repeat.
 */
export function restartChain(
  tasks: ChainTask[],
  id: string,
  next: (head: ChainTask) => { start_date: string | null; due_date: string | null },
) {
  const by_id = new Map(tasks.map((task) => [task.id, task]));
  const head = by_id.get(headOf(tasks, id));
  if (!head?.repeat_interval || !isChainHead(tasks, head.id)) return [];

  const chain = chainOf(tasks, head.id).map((chain_id) => by_id.get(chain_id)!);
  if (!chain.every((task) => task.archived)) return [];

  const dates = next(head);
  const days = daysBetween(head.start_date || head.due_date, dates.start_date || dates.due_date);
  return chain.map((task) =>
    task === head
      ? { id: task.id, ...dates }
      : { id: task.id, start_date: shiftDate(task.start_date, days), due_date: shiftDate(task.due_date, days) },
  );
}
