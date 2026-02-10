import { useState } from "react";
import styles from "./App.module.scss";
import { ContextMenu } from "./components/ContextMenu";
import { EditorToolbar } from "./components/EditorToolbar";
import { MarkdownViewer } from "./components/MarkdownViewer";
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

  // 画像ペースト/ドロップハンドラ（プレビューモード時のみ有効）
  // 編集モードではCrepeのImageBlock.onUploadが画像処理を担当する
  useImageHandler({
    onImageInserted: handleImageInserted,
    enabled: readonly,
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
            {readonly ? (
              <MarkdownViewer value={markdown} theme={theme} baseUri={baseUriRef.current} />
            ) : (
              <MilkdownEditor
                value={markdown}
                onChange={setMarkdown}
                theme={theme}
                readonly={false}
                baseUri={baseUriRef.current}
              />
            )}
          </main>
        </ContextMenu>
      </div>
    </>
  );
}
