import { describe, expect, it } from "vitest";
import type { ThemeKind } from "@/constants/themeColors";
import { resolveExportTheme } from "@/utilities/exportTheme";

describe("resolveExportTheme", () => {
  it.each<[ThemeKind]>([["light"], ["dark"]])(
    "themeSettingが'auto'の場合はactiveTheme(%s)を返す",
    (activeTheme) => {
      const result = resolveExportTheme("auto", activeTheme);
      expect(result).toBe(activeTheme);
    }
  );

  it("themeSettingが'light'の場合は'light'を返す（activeThemeがdarkでも）", () => {
    const result = resolveExportTheme("light", "dark");
    expect(result).toBe("light");
  });

  it("themeSettingが'dark'の場合は'dark'を返す（activeThemeがlightでも）", () => {
    const result = resolveExportTheme("dark", "light");
    expect(result).toBe("dark");
  });
});
