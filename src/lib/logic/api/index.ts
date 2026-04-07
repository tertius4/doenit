import * as task from "./task";
import * as categories from "./categories";
import * as settings from "./settings";

export default class Api {
  static readonly settings = {
    update: settings.update,
  }
  static readonly task = {
    ...task,
  };

  static readonly cats = {
    ...categories,
    delete: categories.remove,
  };
}

