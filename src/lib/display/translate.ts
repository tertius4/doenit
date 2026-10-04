import { context } from "$logic/context.svelte";
import af from "./translations/af";
import { DEFAULT_LANGUAGE, getDictionary } from "./language.svelte";

export type TranslationKey = keyof typeof af;

const warned = new Set<string>();

function t(key: TranslationKey, params: Record<string, string | number> = {}): string {
  const language = context._settings?.language ?? DEFAULT_LANGUAGE;
  // Falls back to Afrikaans while another language is still loading (or if it failed to load).
  const translation = getDictionary(language)?.[key] ?? af[key];
  if (translation === undefined) {
    const id = `${language}:${key}`;
    if (!warned.has(id)) {
      warned.add(id);
      console.warn(`Translation missing for key "${key}" in language "${language}"`);
    }
    return key;
  }

  if (!translation.includes("{{")) return translation;

  return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
    const value = params[param];
    return value !== undefined ? String(value) : match;
  });
}

export default t;
