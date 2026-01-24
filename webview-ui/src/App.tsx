import { InitMessage } from "@message/messageTypeToExtention";
import { Message, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { Editable, useEditor } from "@wysimark/react";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { useEventListener } from "./hooks/useEventListener";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
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

  function updateMarkdownText(text: string) {
    setMarkdown(text);
  }

  const editor = useEditor({});
  return (
    <>
      <div className={styles.root}>
        <main className={styles.main}>
          <Editable editor={editor} value={markdown} onChange={setMarkdown} />
        </main>
      </div>
    </>
  );
}
