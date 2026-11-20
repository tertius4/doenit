import * as task from "./task";
import * as lists from "./lists";
import * as settings from "./settings";
import * as auth from "./auth";
import * as contacts from "./contacts";
import * as invites from "./invites";
import * as notifications from "./notifications";
import * as widget from "./widget";
import * as api_keys from "./api-keys";
import * as personal_sync from "./personal-sync";
import * as share from "./share";
import { InboxService } from "$logic/inbox/InboxService";

export default class Api {
  static readonly settings = {
    update: settings.update,
    setHomeMode: settings.setHomeMode,
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

  static readonly auth = {
    signIn: auth.signIn,
    signOut: auth.signOut,
    deleteAccount: auth.deleteAccount,
  };

  static readonly contacts = {
    delete: contacts.remove,
    update: contacts.update,
  };

  static readonly invites = {
    send: invites.send,
    accept: invites.accept,
    reject: invites.reject,
    cancel: invites.cancel,
    setContactName: invites.setContactName,
    pull: invites.pull,
    sendEmail: invites.sendEmail,
    fetchEmailInvites: invites.fetchEmailInvites,
    answerEmailInvites: invites.answerEmailInvites,
    myCode: invites.myCode,
    resetCode: invites.resetCode,
    lookupCode: invites.lookupCode,
    sendByCode: invites.sendByCode,
  };

  static readonly notifications = {
    pull: notifications.pull,
    syncPush: notifications.syncPush,
    markAsRead: notifications.markAsRead,
    markAllAsRead: notifications.markAllAsRead,
    open: notifications.open,
    schedule: notifications.schedule,
    requestPermission: notifications.requestPermission,
    registerPush: notifications.registerPush,
    listenForTaps: notifications.listenForTaps,
    listenForPush: notifications.listenForPush,
  };

  static readonly widget = {
    watchPendingCompletions: widget.watchPendingCompletions,
  };

  static readonly api_keys = {
    list: api_keys.list,
    create: api_keys.create,
    revoke: api_keys.revoke,
  };

  static readonly personal_sync = {
    enable: personal_sync.enable,
    disable: personal_sync.disable,
    isEnabled: personal_sync.isEnabled,
  };

  static readonly share = {
    text: share.text,
    APP_URL: share.APP_URL,
  };

  static readonly clipboard = {
    copy: share.copy,
  };

  static readonly inbox = {
    drain: (tasks: AL.InboxTask[]) => InboxService.drain(tasks),
  };

  static readonly lists = {
    save: lists.save,
    delete: lists.remove,
    addMember: lists.addMember,
    removeMember: lists.removeMember,
    getMembers: lists.getMembers,
    getContacts: lists.getContacts,
    getById: lists.getById,
    moveTasks: lists.moveTasks,
  };
}
