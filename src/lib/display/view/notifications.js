import DB from "$domain/db";
import { combineLive } from "./live";

/**
 * @param {string} firebase_uid
 * @returns {import("@tertius4/sinkro-db").Live<number>}
 */
export function unreadCount(firebase_uid) {
  return combineLive([DB.notification.live(DB.notification.unreadQuery(firebase_uid))], (items) => items.length);
}

/**
 * @param {string} firebase_uid
 * @returns {import("@tertius4/sinkro-db").Live<DB.Notification[]>}
 */
export function list(firebase_uid) {
  return DB.notification.live({ where: { user_id: firebase_uid }, sort: ["-created_at"] });
}
