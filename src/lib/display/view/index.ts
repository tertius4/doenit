import * as categories from "./categories.js";
import * as main_page from "./main_page.js";
import * as done_page from "./done-page.js";
import * as groups from "./groups.js";
import * as contacts from "./contacts.js";
import * as db from "./db.js";

export default class View {
  static readonly categories = {
    categoryList: categories.categoryList,
    hotbarCategoryList: categories.hotbarCategoryList,
    listAssignTask: categories.listAssignTask,
  };

  static readonly main_page = {
    taskList: main_page.taskList,
  };

  static readonly done_page = {
    taskList: done_page.taskList,
  };
  
  static readonly db = {
    users: db.users,
    category: db.category,
    tasks: db.tasks
  }

  static readonly groups = {
    getList: groups.getList,
  }

  static readonly contacts = {
    getList: contacts.getList,
  }
}
