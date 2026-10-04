import af from "./translations/af";

export type Language = "af" | "en";
export type Dictionary = Record<string, string>;

export const DEFAULT_LANGUAGE: Language = "af";

/** Afrikaans ships in the main bundle; every other language is fetched on first use. */
let loaded = $state.raw<Partial<Record<Language, Dictionary>>>({ af });
const loaders: Partial<Record<Language, () => Promise<{ default: Dictionary }>>> = {
  en: () => import("./translations/en"),
};
const pending = new Map<Language, Promise<void>>();

export function getDictionary(language: Language): Dictionary | undefined {
  return loaded[language];
}

export function loadLanguage(language: Language): Promise<void> {
  const load = loaders[language];
  if (loaded[language] || !load) return Promise.resolve();

  let request = pending.get(language);
  if (!request) {
    request = load()
      .then((module) => {
        loaded = { ...loaded, [language]: module.default };
      })
      .catch((err) => console.warn(`[language] failed to load "${language}":`, err))
      .finally(() => pending.delete(language));
    pending.set(language, request);
  }

  return request;
}

/** Sets <html lang> straight away and resolves once the dictionary is available. */
export function applyLanguage(language: Language = DEFAULT_LANGUAGE): Promise<void> {
  if (typeof document !== "undefined") document.documentElement.lang = language;
  return loadLanguage(language);
}
