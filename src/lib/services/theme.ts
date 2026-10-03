// Cached copy of the theme so it can be applied before the database has loaded.
// The inline script in src/app.html reads the same key.
const KEY = "theme";

export const Theme = {
  apply(theme: string) {
    document.documentElement.setAttribute("data-theme", theme || "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // storage unavailable - the cache is only an optimisation
    }
  },
};
