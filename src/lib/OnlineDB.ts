import { Table } from "./OnlineDB/_Table";
import { TaskTable } from "./OnlineDB/Task";

class OnlineDBClass {
  public BackupManifest: Table<BackupManifest>;
  public Invite: Table<Invite>;
  public User: Table<User>;
  public Task: TaskTable;

  constructor() {
    this.BackupManifest = new Table("backups");
    this.Invite = new Table("invites");
    this.User = new Table("users");
    this.Task = new TaskTable();
  }
}

export const OnlineDB = new OnlineDBClass();
