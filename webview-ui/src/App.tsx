import { useState } from "react";
import styles from "./App.module.scss";
import { ContextMenu } from "./components/ContextMenu";
import { EditorToolbar } from "./components/EditorToolbar";
import { MilkdownEditor } from "./components/MilkdownEditor";
import { useExport } from "./hooks/useExport";
import { useExtensionMessages } from "./hooks/useExtensionMessages";
import { useImageHandler } from "./hooks/useImageHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useLinkHandler } from "./hooks/useLinkHandler";
import { useMarkdownSync } from "./hooks/useMarkdownSync";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const [readonly, setReadonly] = useState(false);

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
    handleApply,
    handleImageInserted,
  } = useMarkdownSync();

  // Extension通信
  useExtensionMessages({
    vscodeThemeRef,
    baseUriRef,
    documentDirRef,
    setTheme,
    setThemeSetting,
    updateMarkdownFromExtension,
  });

  // リンクハンドラ
  useLinkHandler();

  // エクスポート機能
  const { contextMenuItems } = useExport();

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

  // 画像ペースト/ドロップハンドラ
  useImageHandler({
    onImageInserted: handleImageInserted,
  });

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
              baseUri={baseUriRef.current}
            />
          </main>
        </ContextMenu>
      </div>
    </>
  );
}
