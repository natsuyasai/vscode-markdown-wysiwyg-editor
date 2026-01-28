import {
  ExportHtmlMessage,
  ExportPdfMessage,
  InitMessage,
  OpenFileMessage,
  SaveSettingsMessage,
  ThemeSetting,
} from "@message/messageTypeToExtention";
import {
  DocumentInfoMessage,
  Message,
  ThemeKind,
  UpdateMessage,
  UpdateSettingsMessage,
} from "@message/messageTypeToWebview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./App.module.scss";
import { ContextMenu, ContextMenuItem } from "./components/ContextMenu";
import { EditorToolbar } from "./components/EditorToolbar";
import { MilkdownEditor } from "./components/MilkdownEditor";
import { useEventListener } from "./hooks/useEventListener";
import { useImageHandler } from "./hooks/useImageHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { debounce } from "./utilities/debounce";
import {
  LOCAL_FILE_SCHEME,
  parseLocalFileUri,
  revertAllPathsFromWebviewUri,
} from "./utilities/imagePathConverter";
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
  const baseUriRef = useRef<string>("");
  const documentDirRef = useRef<string>("");

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
      case "documentInfo":
        {
          const docInfoMessage = event.data as DocumentInfoMessage;
          // WebView URIのベースパスとドキュメントディレクトリを保存（保存時の逆変換に使用）
          baseUriRef.current = docInfoMessage.payload.baseUri;
          documentDirRef.current = docInfoMessage.payload.dirPath;
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

  // リンククリック時の処理（カスタムスキームを検出してファイルを開く、アンカーリンクでスクロール）
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // アンカーリンク（#で始まる）の場合は対応する要素にスクロール
      if (href.startsWith("#")) {
        event.preventDefault();
        event.stopPropagation();

        const targetId = href.slice(1); // #を除去
        if (targetId) {
          // IDを正規化（小文字、空白をハイフンに変換）
          const normalizedId = targetId.toLowerCase().replace(/\s+/g, "-");

          // 1. 完全一致でIDを検索
          let targetElement = document.getElementById(normalizedId);

          // 2. 見つからない場合は、見出し要素をテキスト内容で検索
          if (!targetElement) {
            const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
            for (const heading of headings) {
              const headingText = heading.textContent?.toLowerCase().replace(/\s+/g, "-") ?? "";

              // テキスト内容を正規化したものが一致するか
              if (headingText === targetId) {
                targetElement = heading as HTMLElement;
                break;
              }
            }
          }

          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        return;
      }

      // カスタムスキームのリンクをクリックした場合
      if (href.startsWith(`${LOCAL_FILE_SCHEME}:`)) {
        event.preventDefault();
        event.stopPropagation();

        const parsed = parseLocalFileUri(href);
        if (parsed) {
          vscode.postMessage({
            type: "openFile",
            payload: {
              filePath: parsed.filePath,
              anchor: parsed.anchor,
            },
          } satisfies OpenFileMessage);
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => {
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, []);

  const handleApply = useCallback(() => {
    // WebView URIとカスタムスキームを相対パスに戻してから保存
    const revertedMarkdown = revertAllPathsFromWebviewUri(
      markdown,
      baseUriRef.current,
      documentDirRef.current
    );
    vscode.postMessage({
      type: "save",
      payload: cleanupMarkdown(revertedMarkdown, originalLineEndingRef.current),
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
      const newContent = prev.endsWith("\n")
        ? `${prev}${markdownImage}\n`
        : `${prev}\n${markdownImage}\n`;
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

  // エクスポートハンドラ
  const handleExportHtml = useCallback(() => {
    vscode.postMessage({
      type: "exportHtml",
    } satisfies ExportHtmlMessage);
  }, []);

  const handleExportPdf = useCallback(() => {
    vscode.postMessage({
      type: "exportPdf",
    } satisfies ExportPdfMessage);
  }, []);

  // コンテキストメニュー項目
  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        label: "HTMLとしてエクスポート",
        onClick: handleExportHtml,
      },
      {
        label: "PDFとしてエクスポート",
        onClick: handleExportPdf,
      },
    ],
    [handleExportHtml, handleExportPdf]
  );

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
        <ContextMenu items={contextMenuItems}>
          <main className={styles.main}>
            <MilkdownEditor
              value={markdown}
              onChange={setMarkdown}
              theme={theme}
              readonly={readonly}
            />
          </main>
        </ContextMenu>
      </div>
    </>
  );
}
