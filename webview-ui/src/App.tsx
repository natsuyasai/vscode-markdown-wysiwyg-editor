import { useState } from "react";
import styles from "./App.module.scss";
import { ContextMenu } from "./components/ContextMenu";
import { EditorToolbar } from "./components/EditorToolbar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { MergeConflictNotice } from "./components/MergeConflictNotice";
import { MilkdownEditor } from "./components/MilkdownEditor";
import { useCustomCss } from "./hooks/useCustomCss";
import { useExport } from "./hooks/useExport";
import { useExtensionMessages } from "./hooks/useExtensionMessages";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useLinkHandler } from "./hooks/useLinkHandler";
import { useMarkdownSync } from "./hooks/useMarkdownSync";
import { useReadonlyInputGuard } from "./hooks/useReadonlyInputGuard";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const [readonly, setReadonly] = useState(false);
  const [customCss, setCustomCss] = useState("");

  // テーマ管理
  const {
    theme,
    themeSetting,
    vscodeThemeRef,
    setTheme,
    setThemeSetting,
    handleThemeSettingChange,
  } = useTheme();

  // Markdown同期
  const {
    markdown,
    setMarkdown,
    baseUriRef,
    documentDirRef,
    updateMarkdownFromExtension,
    handleBaselineLoaded,
    handleApply,
    hasMergeConflict,
    dismissMergeConflict,
  } = useMarkdownSync();

  // Extension通信
  useExtensionMessages({
    vscodeThemeRef,
    baseUriRef,
    documentDirRef,
    setTheme,
    setThemeSetting,
    setCustomCss,
    updateMarkdownFromExtension,
  });

  // カスタムCSS適用
  useCustomCss(customCss);

  // リンクハンドラ
  useLinkHandler();

  // エクスポート機能
  const { contextMenuItems } = useExport({ markdown, themeSetting, theme });

  // グローバルキーボードショートカット（Windows/Linux は Ctrl+S、macOS は Cmd+S で保存）
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "s",
        ctrl: true,
        handler: () => handleApply(),
        stopPropagation: true,
        preventDefault: true,
      },
      {
        key: "s",
        meta: true,
        handler: () => handleApply(),
        stopPropagation: true,
        preventDefault: true,
      },
    ],
    element: window as unknown as HTMLElement,
  });

  // 読み取り専用の間は、画像などの貼り付けとドロップを無効にする
  // 編集モードではCrepeのImageBlock.onUploadが画像処理を担当する
  useReadonlyInputGuard(readonly);

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
          {hasMergeConflict && <MergeConflictNotice onDismiss={dismissMergeConflict} />}
        </header>
        <ContextMenu items={contextMenuItems}>
          <main className={styles.main}>
            {readonly ? (
              <MarkdownViewer value={markdown} theme={theme} baseUri={baseUriRef.current} />
            ) : (
              <MilkdownEditor
                value={markdown}
                onChange={setMarkdown}
                theme={theme}
                readonly={false}
                baseUri={baseUriRef.current}
                onContentLoaded={handleBaselineLoaded}
              />
            )}
          </main>
        </ContextMenu>
      </div>
    </>
  );
}
