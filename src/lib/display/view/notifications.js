import DB from "$domain/db";
import { map } from "rxjs";

/**
 * @param {string} firebase_uid
 * @param {(count: number) => void} callback
 * @returns {() => void} Unsubscribe.
 */
export function subscribeUnreadCount(firebase_uid, callback) {
  const subscription = DB.notification
    .subscribe$(DB.notification.unreadQuery(firebase_uid))
    .pipe(map((items) => items.length))
    .subscribe(callback);

  return () => subscription.unsubscribe();
}

/**
 * @param {string} firebase_uid
 * @param {(notifications: DB.Notification[]) => void} callback
 * @returns {() => void} Unsubscribe.
 */
export function subscribeList(firebase_uid, callback) {
  const subscription = DB.notification
    .subscribe$({ selector: { user_id: firebase_uid }, sort: [{ created_at: "desc" }] })
    .subscribe(callback);

  return () => subscription.unsubscribe();
}
