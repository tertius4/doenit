import { createContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

export class TasksContext {
  tasks = $state<Task[]>([]);
  map = new SvelteMap<string, Task>();

  setTasks(tasks: Task[]) {
    this.tasks = tasks;
    // TODO: Should update this later to only update changed tasks for better performance
    this.map.clear(); 
    for (const task of tasks) {
      this.map.set(task.id, task);
    }
  }

  getTaskById(id: string | undefined): Task | undefined {
    if (!id) return undefined;
    return this.map.get(id);
  }
}

export const [getTasksContext, setTasksContext] = createContext<TasksContext>();
