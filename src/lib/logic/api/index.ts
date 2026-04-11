import * as task from "./task";
import * as categories from "./categories";
import * as settings from "./settings";
import * as auth from "./auth";

export default class Api {
  static readonly settings = {
    update: settings.update,
    openStorePage: settings.openStorePage,
    email: settings.email,
  };

  static readonly task = {
    complete: task.complete,
    createTask: task.createTask,
    deleteAll: task.deleteAll,
    deleteTask: task.deleteTask,
    getNewTask: task.getNewTask,
    getShareTaskText: task.getShareTaskText,
    getTaskById: task.getTaskById,
    getTasksByIds: task.getTasksByIds,
    isTaskUpdated: task.isTaskUpdated,
    uncomplete: task.uncomplete,
    updateTask: task.updateTask,
  };

  static readonly cats = {
    ...categories,
    delete: categories.remove,
  };

  static readonly auth = {
    signIn: auth.signIn,
    signOut: auth.signOut,
  };
}
