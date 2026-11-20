import * as lists from "./lists.js";
import * as main_page from "./main_page.js";
import * as done_page from "./done-page.js";
import * as contacts from "./contacts.js";
import * as db from "./db.js";

export default class View {
  static readonly lists = {
    getList: lists.getList,
    getOne: lists.getOne,
    options: lists.options,
    taskList: lists.taskList,
  };

  static readonly main_page = {
    taskList: main_page.taskList,
  };

  static readonly done_page = {
    taskList: done_page.taskList,
  };

  static readonly db = {
    users: db.users,
    lists: db.lists,
    tasks: db.tasks,
    sync_queues: db.sync_queues,
  };

  static readonly contacts = {
    getList: contacts.getList,
    getInviteList: contacts.getInviteList,
  };
}
