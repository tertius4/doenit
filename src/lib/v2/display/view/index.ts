import * as categories from "./categories.js";
import * as tasks from "./tasks.js";
import * as main_page from "./main_page.js";

export default class View {
  static readonly categories = {
    categoryList: categories.categoryList,
    listAssignTask: categories.listAssignTask,
  };

  static readonly main = {
    taskList: main_page.taskList,
  };

  static readonly tasks = {
    taskList: tasks.taskList,
  };
}
