import { useCallback, useRef, useState } from "react";
import { revertAllPathsFromWebviewUri } from "../utilities/imagePathConverter";
import {
  cleanupMarkdown,
  convertLineEndings,
  detectLineEnding,
  type LineEnding,
} from "../utilities/markdownCleanup";
import { mergeUserEdits } from "../utilities/threeWayMerge";
import { vscode } from "../utilities/vscode";

interface UseMarkdownSyncResult {
  markdown: string;
  setMarkdown: React.Dispatch<React.SetStateAction<string>>;
  originalLineEndingRef: React.RefObject<LineEnding>;
  baseUriRef: React.RefObject<string>;
  documentDirRef: React.RefObject<string>;
  updateMarkdownFromExtension: (text: string, isInit?: boolean) => void;
  handleBaselineLoaded: (serialized: string) => void;
  handleApply: () => void;
  handleImageInserted: (markdownImage: string) => void;
}

/**
 * Markdown同期のカスタムフック
 *
 * 保存は3-wayマージ方式:
 * - original: 拡張機能から受信した元テキスト（WebView表現）のアンカー
 * - baseline: エディタのラウンドトリップ結果（onContentLoadedで通知される）
 * - current: 現在のエディタ出力（markdown state）
 * baseline→currentの差分（＝ユーザーの実編集）のみをoriginalに適用することで、
 * エディタの再シリアライズによる正規化が未編集行へ及ぶのを防ぐ。
 */
export function useMarkdownSync(): UseMarkdownSyncResult {
  const [markdown, setMarkdown] = useState("");
  const originalLineEndingRef = useRef<LineEnding>("\n");
  const baseUriRef = useRef<string>("");
  const documentDirRef = useRef<string>("");
  // 3-wayマージのアンカー: 拡張機能から受信した元テキスト（WebView表現）
  const originalRef = useRef<string | null>(null);
  // エディタのラウンドトリップ結果（初期化直後/replaceAll直後に設定される）
  const baselineRef = useRef<string | null>(null);
  // 最後に保存したテキストのWebView表現（拡張機能からのエコー吸収用）
  const lastSavedRef = useRef<string | null>(null);

  const updateMarkdownFromExtension = useCallback((text: string, isInit = false) => {
    if (isInit) {
      originalLineEndingRef.current = detectLineEnding(text);
    }
    originalRef.current = text;
    // 自分の保存のエコーはアンカー更新のみ行い、エディタへは反映しない
    // （replaceAllによるカーソルリセットを防ぐ）
    if (lastSavedRef.current !== null && text === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = null;
    setMarkdown(text);
  }, []);

  // エディタのラウンドトリップ結果を3-wayマージの基準（baseline）として保持
  const handleBaselineLoaded = useCallback((serialized: string) => {
    baselineRef.current = serialized;
  }, []);

  const handleApply = useCallback(() => {
    const original = originalRef.current;
    const baseline = baselineRef.current;

    // baseline未設定時は従来フロー（revert→cleanupMarkdown）にフォールバック
    if (original === null || baseline === null) {
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
      return;
    }

    // baselineとcurrentに同一のクリーンアップを適用し、未編集領域の差分をゼロにする
    const baselineClean = cleanupMarkdown(baseline, "\n");
    const currentClean = cleanupMarkdown(markdown, "\n");
    // baseline→currentの差分（＝ユーザーの実編集）のみをoriginalに適用する
    const merged = mergeUserEdits(convertLineEndings(original, "\n"), baselineClean, currentClean);
    // WebView URIとカスタムスキームを相対パスに戻してから保存
    const reverted = revertAllPathsFromWebviewUri(
      merged,
      baseUriRef.current,
      documentDirRef.current
    );
    vscode.postMessage({
      type: "save",
      payload: convertLineEndings(reverted, originalLineEndingRef.current),
    });
    // 保存したテキストのWebView表現（revert・改行変換前のLF版）を保持してエコーを吸収する
    // original / baselineは更新しない（次回保存も同じアンカーから再マージする冪等設計）
    lastSavedRef.current = merged;
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
    handleBaselineLoaded,
    handleApply,
    handleImageInserted,
  };
}
