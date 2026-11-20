/**
 * The chain rules the API needs, the same as the app's src/lib/logic/chains.ts (keep the two the same; tests/chains.test.js
 * runs both). A task's `after_task_id` names the task it waits on, in the same list.
 */

export type Link = { id: string; after_task_id?: string | null; created_at?: string };
export type Change = { id: string; after_task_id: string | null };
type Dated = Link & { start_date?: string | null; due_date?: string | null };
type ChainTask = Dated & { archived?: boolean; repeat_interval?: string };

/** The tasks waiting on `id`, oldest first. More than one only after a sync conflict. */
export function successorsOf<T extends Link>(tasks: T[], id: string): T[] {
  return tasks
    .filter((task) => task.after_task_id === id && task.id !== id)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id));
}

/** Takes a task out of its chain: whatever waited on it waits on its predecessor (or nothing) instead. */
export function detach(tasks: Link[], task_id: string): Change[] {
  const task = tasks.find((t) => t.id === task_id);
  const before = task?.after_task_id ?? null;
  const changes = successorsOf(tasks, task_id).map((next) => ({ id: next.id, after_task_id: before }));
  if (before) changes.push({ id: task_id, after_task_id: null });
  return changes;
}

/** The first task of a chain with tasks after it. Such a task repeats only once the whole chain is done. */
export function isChainHead(tasks: Link[], id: string): boolean {
  const task = tasks.find((t) => t.id === id);
  const has_before = !!task?.after_task_id && tasks.some((t) => t.id === task.after_task_id);
  return !has_before && successorsOf(tasks, id).length > 0;
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
