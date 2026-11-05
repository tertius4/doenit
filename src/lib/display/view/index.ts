import * as categories from "./categories.js";
import * as main_page from "./main_page.js";
import * as done_page from "./done-page.js";
import * as groups from "./groups.js";
import * as group_tasks from "./group_tasks.js";
import * as contacts from "./contacts.js";

export default class View {
  static readonly categories = {
    categoryList: categories.categoryList,
  };

  static readonly main_page = {
    taskList: main_page.taskList,
  };

  static readonly done_page = {
    taskList: done_page.taskList,
  };
  
  static readonly groups = {
    getList: groups.getList,
    getOne: groups.getOne,
  }

  static readonly group_tasks = {
    taskList: group_tasks.taskList,
  }

  static readonly contacts = {
    getList: contacts.getList,
    getInviteList: contacts.getInviteList,
  }
}
