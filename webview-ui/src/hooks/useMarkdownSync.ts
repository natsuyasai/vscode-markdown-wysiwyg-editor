import { useCallback, useRef, useState } from "react";
import { revertAllPathsFromWebviewUri } from "../utilities/imagePathConverter";
import { vscode } from "../utilities/vscode";

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
