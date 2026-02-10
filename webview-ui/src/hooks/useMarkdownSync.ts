import { useCallback, useRef, useState } from "react";
import { revertAllPathsFromWebviewUri } from "../utilities/imagePathConverter";
import { cleanupMarkdown, detectLineEnding, type LineEnding } from "../utilities/markdownCleanup";
import { vscode } from "../utilities/vscode";

interface UseMarkdownSyncResult {
  markdown: string;
  setMarkdown: React.Dispatch<React.SetStateAction<string>>;
  originalLineEndingRef: React.RefObject<LineEnding>;
  baseUriRef: React.RefObject<string>;
  documentDirRef: React.RefObject<string>;
  updateMarkdownFromExtension: (text: string, isInit?: boolean) => void;
  handleApply: () => void;
  handleImageInserted: (markdownImage: string) => void;
}

/**
 * Markdown同期のカスタムフック
 */
export function useMarkdownSync(): UseMarkdownSyncResult {
  const [markdown, setMarkdown] = useState("");
  const originalLineEndingRef = useRef<LineEnding>("\n");
  const baseUriRef = useRef<string>("");
  const documentDirRef = useRef<string>("");

  const updateMarkdownFromExtension = useCallback((text: string, isInit = false) => {
    if (isInit) {
      originalLineEndingRef.current = detectLineEnding(text);
    }
    setMarkdown(text);
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

  return {
    markdown,
    setMarkdown,
    originalLineEndingRef,
    baseUriRef,
    documentDirRef,
    updateMarkdownFromExtension,
    handleApply,
    handleImageInserted,
  };
}
