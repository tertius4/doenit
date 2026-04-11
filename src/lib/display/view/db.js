import DB from "$domain/db";
import { map, tap, Subscription } from "rxjs";

/**
 * @param {Record<string, any>[]} list
 * @returns {() => void}
 */
export function users(list) {
  /** @type {Subscription} */
  let subscription = DB.user
    .subscribe$()
    .pipe(
      map((users) => users),
      tap((data) => (list = data)),
    )
    .subscribe();

  return () => subscription?.unsubscribe();
}

/**
 * @param {Record<string, any>[]} list
 * @returns {() => void}
 */
export function category(list) {
  /** @type {Subscription} */
  let subscription = DB.category
    .subscribe$()
    .pipe(
      map((category) => category),
      tap((data) => (list = data)),
    )
    .subscribe();

  return () => subscription?.unsubscribe();
}

/**
 * @param {Record<string, any>[]} list
 * @returns {() => void}
 */
export function tasks(list) {
  /** @type {Subscription} */
  let subscription = DB.task
    .subscribe$()
    .pipe(
      map((tasks) => tasks),
      tap((data) => (list = data)),
    )
    .subscribe();

  return () => subscription?.unsubscribe();
}
