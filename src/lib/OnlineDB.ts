import { Table } from "./OnlineDB/_Table";
import { TaskTable } from "./OnlineDB/Task";

class OnlineDBClass {
  public BackupManifest: Table<BackupManifest>;
  public Category: Table<OnlineCategory>;
  public User: Table<OnlineUser>;
  public Invite: Table<Invite>;
  public Task: TaskTable;

  constructor() {
    this.BackupManifest = new Table("backups");
    this.Category = new Table("categories");
    this.Invite = new Table("invites");
    this.User = new Table("users");
    this.Task = new TaskTable();
  }
}

export const OnlineDB = new OnlineDBClass();
