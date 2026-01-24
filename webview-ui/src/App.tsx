import { InitMessage } from "@message/messageTypeToExtention";
import { Message, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { Editable, useEditor } from "@wysimark/react";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { MermaidRenderer } from "./components/MermaidRenderer";
import { PlantUmlRenderer } from "./components/PlantUmlRenderer";
import { useEventListener } from "./hooks/useEventListener";
import { useImageHandler } from "./hooks/useImageHandler";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMermaidBlocks } from "./hooks/useMermaidBlocks";
import { usePlantUmlBlocks } from "./hooks/usePlantUmlBlocks";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";

export default function App() {
  const [markdown, setMarkdown] = useState("");
  const [theme, setTheme] = useState<ThemeKind>("light");

  const handleMessagesFromExtension = useCallback((event: MessageEvent<Message>) => {
    const message = event.data satisfies Message;
    // console.log("Received message from extension:", message);
    switch (message.type) {
      case "init":
      case "update":
        {
          const updateMessage = message as UpdateMessage;
          debounce(() => {
            updateMarkdownFromExtension(updateMessage.payload);
          })();
        }
        break;
      case "updateTheme":
        {
          const theme = event.data.payload as ThemeKind;
          setTheme(theme);
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
      payload: markdown,
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

  // Mermaid/PlantUMLブロックを検出
  const mermaidBlocks = useMermaidBlocks(markdown);
  const plantUmlBlocks = usePlantUmlBlocks(markdown);
  const hasDiagramBlocks = mermaidBlocks.length > 0 || plantUmlBlocks.length > 0;

  const editor = useEditor({});
  return (
    <>
      <div className={styles.root} data-theme={theme}>
        <main className={styles.main}>
          <Editable editor={editor} value={markdown} onChange={setMarkdown} />
        </main>
        {hasDiagramBlocks && (
          <aside className={styles.diagramPanel}>
            <div className={styles.diagramPanelTitle}>Diagram Preview</div>
            {mermaidBlocks.map((block) => (
              <div key={block.id} className={styles.diagramBlock}>
                <span className={styles.diagramLabel}>Mermaid</span>
                <MermaidRenderer code={block.code} id={block.id} theme={theme} />
              </div>
            ))}
            {plantUmlBlocks.map((block) => (
              <div key={block.id} className={styles.diagramBlock}>
                <span className={styles.diagramLabel}>PlantUML</span>
                <PlantUmlRenderer code={block.code} id={block.id} />
              </div>
            ))}
          </aside>
        )}
      </div>
    </>
  );
}
