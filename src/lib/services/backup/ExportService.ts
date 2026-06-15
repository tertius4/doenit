import { FileTransfer } from "@capacitor/file-transfer";
import DB from "$domain/db";
import JSZip from "jszip";
import { context } from "$logic/context.svelte";
import type { BackupFile } from "./backup.types";
import { Directory, Filesystem } from "@capacitor/filesystem";
import toast from "$display/toast/toast.svelte";

export class ExportService {
  static async export(): AsyncResult {
    try {
      // const tasks_result = await DB.task.findMany();
      // if (!tasks_result.ok) return tasks_result;

      // const categories_result = await DB.category.findMany();
      // if (!categories_result.ok) return categories_result;

      // const groups_result = await DB.group.findMany();
      // if (!groups_result.ok) return groups_result;

      // const members_result = await DB.member.findMany();
      // if (!members_result.ok) return members_result;

      // const users_result = await DB.user.findMany();
      // if (!users_result.ok) return users_result;

      // const contacts_result = await DB.contact.findMany();
      // if (!contacts_result.ok) return contacts_result;

      // const contact_invites_result = await DB.contact_invite.findMany();
      // if (!contact_invites_result.ok) return contact_invites_result;

      // const notifications_result = await DB.notification.findMany();
      // if (!notifications_result.ok) return notifications_result;

      // const settings_result = await DB.settings.findMany();
      // if (!settings_result.ok) return settings_result;

      // const user_state_result = await DB.user_state.get(context.user?.id || "device");
      // if (!user_state_result.ok) return user_state_result;

      // const app_state_result = await DB.app_state.getDevice();
      // if (!app_state_result.ok) return app_state_result;

      // const data = {
      //   version: 1,
      //   app: "Doenit",
      //   exported_at: new Date().toISOString(),

      //   data: {
      //     tasks: tasks_result.value,
      //     categories: categories_result.value,
      //     groups: groups_result.value,
      //     members: members_result.value,
      //     users: users_result.value,

      //     contacts: contacts_result.value,
      //     contact_invites: contact_invites_result.value,
      //     notifications: notifications_result.value,

      //     settings: settings_result.value,
      //     user_state: user_state_result.value,
      //     app_state: app_state_result.value,
      //   },
      // };

      // const zip = new JSZip();
      // zip.file("backup.json", JSON.stringify(data, null, 2));

      // const zipBase64 = await zip.generateAsync({
      //   type: "base64",
      // });

      // // First get the full file path using Filesystem
      // const fileInfo = await Filesystem.writeFile({
      //   path: "doenit-backup.zip",
      //   directory: Directory.Data,
      //   data: zipBase64,
      // });

      // console.log("File written to:", fileInfo);    
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, error: message };
    }
  }
}
