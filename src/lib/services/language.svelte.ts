import { cached_language } from "$lib/cached";
import { user } from "$lib/base/user.svelte";
import { translations } from "./language/translations";
import { Widget } from "../core/widget";
import { notifications } from "./notification.svelte";

class LanguageService {
  private _value = $state<Language | null>(null);
  private readonly translations: Record<string | symbol, string> = $derived(translations[this._value ?? "af"]);

  readonly is_lang_set = $derived(this._value != null);

  constructor() {
    this.init();
  }

  async init() {
    let lang = await cached_language.get();
    this._value = lang;
  }

  set value(lang: any) {
    if (!this.isValidLanguage(lang)) {
      console.warn(`Invalid language value: ${lang}. Valid values are 'af' or 'en'.`);
      return;
    }

    this._value = lang;
    if (lang) {
      cached_language.set(lang);
      Widget.updateLanguage(lang);
      user.language_code = lang;
      notifications.scheduleNotifications(); 
    }
  }

  get value(): Language {
    return this._value ?? "af";
  }

  private isValidLanguage(lang: any): lang is Language {
    return ["af", "en"].includes(lang);
  }

  /**
   * Get translation for a key
   * @param {string} key - The translation key
   * @param {Record<string, string|number>} params - Parameters for interpolation
   * @returns {string} - The translated string
   */
  t(key: string | symbol, params: Record<string | symbol, string | number> = {}): string {
    // Get translation or fallback to key using type assertion for flexible key access
    let translation = this.translations[key];
    if (!translation) {
      console.warn(`Translation missing for key "${String(key)}" in language "${this._value}"`);
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
}

export const language = new LanguageService();
export const t = language.t.bind(language);
