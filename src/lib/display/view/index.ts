import * as categories from "./categories.js";
import * as tasks from "./tasks.js";
import * as main_page from "./main_page.js";
import * as done_page from "./done-page.js";

export default class View {
  static readonly categories = {
    categoryList: categories.categoryList,
    listAssignTask: categories.listAssignTask,
  };

  static readonly main_page = {
    taskList: main_page.taskList,
  };

  static readonly done_page = {
    taskList: done_page.taskList,
  };

  static readonly tasks = {
    taskList: tasks.taskList,
  };
}
