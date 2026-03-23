import { translations } from "$lib/services/language/translations";
import { context } from "$logic/context.svelte";

function t(key: string | symbol, params: Record<string | symbol, string | number> = {}): string {
  // Get translation or fallback to key using type assertion for flexible key access
  let translation = translations[context.settings.language][key];
  if (!translation) {
    console.warn(`Translation missing for key "${String(key)}" in language "${context.settings.language}"`);
    return String(key);
  }

  // Simple parameter replacement (replace {{param}} with value)
  if (Object.keys(params).length > 0) {
    return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      const value = params[param];
      return value !== undefined ? String(value) : match;
    });
  }

  return translation;
}

export default t;
