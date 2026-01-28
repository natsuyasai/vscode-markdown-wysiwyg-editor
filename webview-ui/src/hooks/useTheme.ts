import { SaveSettingsMessage, ThemeSetting } from "@message/messageTypeToExtention";
import { ThemeKind } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useRef, useState } from "react";
import { vscode } from "../utilities/vscode";

interface UseThemeResult {
  theme: ThemeKind;
  themeSetting: ThemeSetting;
  vscodeThemeRef: React.RefObject<ThemeKind>;
  setTheme: React.Dispatch<React.SetStateAction<ThemeKind>>;
  setThemeSetting: React.Dispatch<React.SetStateAction<ThemeSetting>>;
  handleThemeSettingChange: (newThemeSetting: ThemeSetting) => void;
}

/**
 * テーマ管理のカスタムフック
 */
export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<ThemeKind>("light");
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>("auto");
  const vscodeThemeRef = useRef<ThemeKind>("light");

  // テーマをbodyに適用
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  // テーマ設定変更ハンドラ
  const handleThemeSettingChange = useCallback((newThemeSetting: ThemeSetting) => {
    setThemeSetting(newThemeSetting);
    // テーマ設定に応じてthemeを更新
    if (newThemeSetting === "auto") {
      setTheme(vscodeThemeRef.current);
    } else {
      setTheme(newThemeSetting);
    }
    // 拡張機能に設定を保存
    vscode.postMessage({
      type: "saveSettings",
      payload: { themeSetting: newThemeSetting },
    } satisfies SaveSettingsMessage);
  }, []);

  return {
    theme,
    themeSetting,
    vscodeThemeRef,
    setTheme,
    setThemeSetting,
    handleThemeSettingChange,
  };
}
