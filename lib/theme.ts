export const THEME_STORAGE_KEY = "maeumgyeot:theme";

export type Theme = "light" | "dark";

/**
 * Inlined into <head> as a blocking script (see app/layout.tsx) so the
 * correct theme class is present before first paint — avoids a flash of the
 * wrong theme. Falls back to the OS preference when nothing is stored yet.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();
`;
