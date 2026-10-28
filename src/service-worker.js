/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Lets doenit.org open without a network. The app's own files are cached per build; pages fall back to the cached
 * app shell (it is a single-page app). Everything else (Firestore, Google, Cloud Functions) goes straight to the
 * network: the data itself is local-first in IndexedDB and syncs when the browser is back online.
 */
import { build, files, version } from "$service-worker";

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE = `doenit-${version}`;
const SHELL = "/";
const ASSETS = [...build, ...files, SHELL];

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (event) => {
  // A new build replaces the old cache.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== sw.location.origin) return;

  // Pages: the network first, so a new version shows straight away; offline, the cached shell.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(SHELL)) ?? Response.error()));
    return;
  }

  // Build files never change under the same name, so the cache is always right for them.
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)));
  }
});
