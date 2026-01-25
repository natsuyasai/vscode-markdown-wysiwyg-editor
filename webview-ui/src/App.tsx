import { InitMessage, SaveSettingsMessage, ThemeSetting } from "@message/messageTypeToExtention";
import { Message, ThemeKind, UpdateMessage, UpdateSettingsMessage } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./App.module.scss";
import { EditorToolbar } from "./components/EditorToolbar";
import { MilkdownEditor } from "./components/MilkdownEditor";
import { useEventListener } from "./hooks/useEventListener";
import { useImageHandler } from "./hooks/useImageHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";

type LineEnding = "\r\n" | "\n";

/**
 * テキストから改行コードを検出する
 * CRLFが含まれていればCRLF、それ以外はLFを返す
 */
function detectLineEnding(text: string): LineEnding {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * WYSIWYGエディタから出力されたMarkdownをクリーンアップする
 * - <br />、<br>タグを改行に変換
 * - &nbsp; を通常のスペースに変換
 * - Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
 * - 改行コードを元ファイルの形式に統一
 */
function cleanupMarkdown(text: string, lineEnding: LineEnding): string {
  return (
    text
      // <br />、<br>、<br/>タグを改行に変換
      .replace(/<br\s*\/?>/gi, "\n")
      // HTMLエンティティの&nbsp;を通常のスペースに変換
      .replace(/&nbsp;/g, " ")
      // Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
      .replace(/\u00A0/g, " ")
      // 改行コードを元ファイルの形式に統一（まずLFに統一してから変換）
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, lineEnding)
  );
}

export default function App() {
  const [markdown, setMarkdown] = useState("");
  const [theme, setTheme] = useState<ThemeKind>("light");
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>("auto");
  const [readonly, setReadonly] = useState(false);
  const originalLineEndingRef = useRef<LineEnding>("\n");
  const vscodeThemeRef = useRef<ThemeKind>("light");

  const handleMessagesFromExtension = useCallback((event: MessageEvent<Message>) => {
    const message = event.data satisfies Message;
    // console.log("Received message from extension:", message);
    switch (message.type) {
      case "init":
      case "update":
        {
          const updateMessage = message as UpdateMessage;
          // 初回読み込み時に元ファイルの改行コードを検出して保存
          if (message.type === "init") {
            originalLineEndingRef.current = detectLineEnding(updateMessage.payload);
          }
          debounce(() => {
            updateMarkdownFromExtension(updateMessage.payload);
          })();
        }
        break;
      case "updateTheme":
        {
          const vscodeTheme = event.data.payload as ThemeKind;
          vscodeThemeRef.current = vscodeTheme;
          // themeSettingがautoの場合はVSCodeのテーマに追従
          setThemeSetting((currentSetting) => {
            if (currentSetting === "auto") {
              setTheme(vscodeTheme);
            }
            return currentSetting;
          });
        }
        break;
      case "updateSettings":
        {
          const settingsMessage = event.data as UpdateSettingsMessage;
          const newThemeSetting = settingsMessage.payload.themeSetting;
          setThemeSetting(newThemeSetting);
          // テーマ設定に応じてthemeを更新
          if (newThemeSetting === "auto") {
            setTheme(vscodeThemeRef.current);
          } else {
            setTheme(newThemeSetting);
          }
        }
        break;
      default:
        console.log(`Unknown command: ${message.type as string}`);
        break;
    }
  }, []);

  useEventListener("message", handleMessagesFromExtension, window);

  useEffect(() => {
    vscode.postMessage({
      type: "init",
    } satisfies InitMessage);
  }, []);

  // テーマをbodyに適用
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const handleApply = useCallback(() => {
    vscode.postMessage({
      type: "save",
      payload: cleanupMarkdown(markdown, originalLineEndingRef.current),
    });
  }, [markdown]);

  // グローバルキーボードショートカット
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "s",
        ctrl: true,
        handler: () => handleApply(),
        stopPropagation: true,
        preventDefault: true,
      },
    ],
    element: window as unknown as HTMLElement,
  });

  function updateMarkdownFromExtension(text: string) {
    setMarkdown(text);
  }

  // 画像が挿入されたときにMarkdownに追加
  const handleImageInserted = useCallback((markdownImage: string) => {
    setMarkdown((prev) => {
      // 末尾に改行と画像参照を追加
      const newContent = prev.endsWith("\n") ? `${prev}${markdownImage}\n` : `${prev}\n${markdownImage}\n`;
      return newContent;
    });
  }, []);

  // 画像ペースト/ドロップハンドラ
  useImageHandler({
    onImageInserted: handleImageInserted,
  });

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

  return (
    <>
      <div className={styles.root} data-theme={theme}>
        <header className={styles.toolbar}>
          <EditorToolbar
            readonly={readonly}
            onReadonlyChange={setReadonly}
            themeSetting={themeSetting}
            onThemeSettingChange={handleThemeSettingChange}
          />
        </header>
        <main className={styles.main}>
          <MilkdownEditor value={markdown} onChange={setMarkdown} theme={theme} readonly={readonly} />
        </main>
      </div>
    </>
  );
}
