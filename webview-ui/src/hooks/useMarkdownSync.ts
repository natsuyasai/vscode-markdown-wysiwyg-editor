import { useCallback, useEffect, useRef, useState } from "react";
import { removeBlobImageReferences } from "../utilities/imagePathConverter";
import { cleanupMarkdown } from "../utilities/markdownCleanup";
import { mergeExternalChange } from "../utilities/mergeExternalChange";
import { registerPendingEditsFlusher } from "../utilities/pendingEditsFlusher";
import { mergeUserEdits } from "../utilities/threeWayMerge";
import { vscode } from "../utilities/vscode";

/** 編集が止まってから拡張機能へ反映するまでの待ち時間（ms） */
export const UPDATE_DEBOUNCE_MS = 500;

interface UseMarkdownSyncResult {
  markdown: string;
  setMarkdown: React.Dispatch<React.SetStateAction<string>>;
  baseUriRef: React.RefObject<string>;
  documentDirRef: React.RefObject<string>;
  /** 外部（拡張機能）での変更を取り込んだとき、WebViewの編集と競合した箇所があったか */
  hasMergeConflict: boolean;
  dismissMergeConflict: () => void;
  updateMarkdownFromExtension: (text: string) => void;
  handleBaselineLoaded: (serialized: string) => void;
  /** 明示保存: 編集内容を拡張機能へ送り、反映してからファイルを保存させる */
  handleApply: () => void;
}

/**
 * Markdown同期のカスタムフック
 *
 * WebViewは常にLFで扱う。改行コードは拡張機能の層が文書に合わせる。
 *
 * 編集内容は3-wayマージ方式で組み立てる:
 * - original: 拡張機能の TextDocument にあるテキスト（WebView表現）のアンカー
 * - baseline: エディタのラウンドトリップ結果（onContentLoadedで通知される）
 * - current: 現在のエディタ出力（markdown state）
 * baseline→currentの差分（＝ユーザーの実編集）のみをoriginalに適用することで、
 * エディタの再シリアライズによる正規化が未編集行へ及ぶのを防ぐ。
 *
 * 拡張機能への送り方:
 * - 編集が止まってから update を送る（TextDocument に反映するだけで保存しない。VS Code が未保存状態を管理する）
 * - 保存操作では save を送る（反映してから保存する）
 */
export function useMarkdownSync(): UseMarkdownSyncResult {
  const [markdown, setMarkdownState] = useState("");
  const [hasMergeConflict, setHasMergeConflict] = useState(false);
  const baseUriRef = useRef<string>("");
  const documentDirRef = useRef<string>("");
  // 最新のエディタ出力（同期的に参照するため state と別に持つ）
  const markdownRef = useRef("");
  // 3-wayマージのアンカー: 拡張機能の TextDocument にあるテキスト（WebView表現）
  const originalRef = useRef<string | null>(null);
  // エディタのラウンドトリップ結果（初期化直後/replaceAll直後に設定される）
  const baselineRef = useRef<string | null>(null);
  // 拡張機能の TextDocument にあるとWebViewが認識しているテキスト（受信した内容、または最後に送った内容）
  const documentTextRef = useRef<string | null>(null);
  // 外部から与えた内容をエディタが読み込むのを待っている間は true
  const awaitingExternalLoadRef = useRef(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** baseline→currentの差分だけをoriginalに適用した、拡張機能へ送るテキスト（LF）。まだ組み立てられなければ null */
  const composeText = useCallback((): string | null => {
    const original = originalRef.current;
    const baseline = baselineRef.current;
    if (original === null || baseline === null) {
      return null;
    }
    if (awaitingExternalLoadRef.current) {
      // 外部から与えた内容をエディタが読み込む前は、baselineが古く、編集も起こりえない
      return removeBlobImageReferences(original);
    }
    // baselineとcurrentに同一のクリーンアップを適用し、未編集領域の差分をゼロにする
    const baselineClean = cleanupMarkdown(baseline, "\n");
    const currentClean = cleanupMarkdown(markdownRef.current, "\n");
    return removeBlobImageReferences(mergeUserEdits(original, baselineClean, currentClean));
  }, []);

  const cancelScheduledUpdate = useCallback(() => {
    if (updateTimerRef.current !== null) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  /** 拡張機能の TextDocument と異なる編集があれば update を送る */
  const sendPendingUpdate = useCallback(() => {
    cancelScheduledUpdate();
    const composed = composeText();
    if (composed === null || composed === documentTextRef.current) {
      return;
    }
    // original / baselineは更新しない（次回も同じアンカーから再マージする冪等設計）
    documentTextRef.current = composed;
    vscode.postMessage({ type: "update", payload: composed });
  }, [cancelScheduledUpdate, composeText]);

  const scheduleUpdate = useCallback(() => {
    cancelScheduledUpdate();
    updateTimerRef.current = setTimeout(() => {
      updateTimerRef.current = null;
      sendPendingUpdate();
    }, UPDATE_DEBOUNCE_MS);
  }, [cancelScheduledUpdate, sendPendingUpdate]);

  const setMarkdown = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (action) => {
      const next = typeof action === "function" ? action(markdownRef.current) : action;
      if (next === markdownRef.current) {
        return;
      }
      markdownRef.current = next;
      setMarkdownState(next);
      // エディタが読み込み済みのときだけ、編集として拡張機能へ反映する
      if (baselineRef.current !== null && !awaitingExternalLoadRef.current) {
        scheduleUpdate();
      }
    },
    [scheduleUpdate]
  );

  /** 外部から与えた内容を、エディタの表示内容として設定する */
  const loadExternalText = useCallback((text: string) => {
    originalRef.current = text;
    documentTextRef.current = text;
    if (text === markdownRef.current) {
      // エディタの出力と同じなら再読み込みは起きない。出力そのものがラウンドトリップ結果になる
      baselineRef.current = text;
      return;
    }
    awaitingExternalLoadRef.current = true;
    markdownRef.current = text;
    setMarkdownState(text);
  }, []);

  const updateMarkdownFromExtension = useCallback(
    (incoming: string) => {
      // 文書にあると認識している内容と同じ（自分が送った内容など）なら、エディタの内容は変えない
      if (documentTextRef.current !== null && incoming === documentTextRef.current) {
        return;
      }

      cancelScheduledUpdate();
      const ours = composeText();
      const documentText = documentTextRef.current;
      const hasUnappliedEdits = ours !== null && documentText !== null && ours !== documentText;
      if (!hasUnappliedEdits) {
        loadExternalText(incoming);
        return;
      }

      // 未反映の編集がある: 編集を失わないよう、外部の変更に編集を取り込み、文書にも反映し直す
      const merged = mergeExternalChange(documentText, ours, incoming);
      setHasMergeConflict(merged.conflict);
      loadExternalText(merged.text);
      if (merged.text !== incoming) {
        vscode.postMessage({ type: "update", payload: merged.text });
      }
    },
    [cancelScheduledUpdate, composeText, loadExternalText]
  );

  // エディタのラウンドトリップ結果を3-wayマージの基準（baseline）として保持
  const handleBaselineLoaded = useCallback(
    (serialized: string) => {
      if (awaitingExternalLoadRef.current) {
        // 外部から与えた内容の読み込み完了。originalはすでに設定済み
        awaitingExternalLoadRef.current = false;
        baselineRef.current = serialized;
        return;
      }
      // エディタが作り直された（モード切替・テーマ変更など）場合は、編集済みの内容を読み込んでいる。
      // baselineを置き換える前に、これまでの編集をoriginalへ確定させる（しないと編集が失われる）
      const composed = composeText();
      if (composed !== null) {
        originalRef.current = composed;
      }
      baselineRef.current = serialized;
      sendPendingUpdate();
    },
    [composeText, sendPendingUpdate]
  );

  const handleApply = useCallback(() => {
    cancelScheduledUpdate();
    const composed = composeText();
    if (composed === null) {
      // エディタ未読み込み: 編集内容の組み立てができないため、現在の出力をそのまま送る
      vscode.postMessage({
        type: "save",
        payload: cleanupMarkdown(removeBlobImageReferences(markdownRef.current), "\n"),
      });
      return;
    }
    documentTextRef.current = composed;
    vscode.postMessage({ type: "save", payload: composed });
  }, [cancelScheduledUpdate, composeText]);

  // エクスポートなど、拡張機能が文書を読む処理の前に未反映の編集を送れるようにする
  useEffect(() => {
    const unregister = registerPendingEditsFlusher(sendPendingUpdate);
    return () => {
      unregister();
      cancelScheduledUpdate();
    };
  }, [sendPendingUpdate, cancelScheduledUpdate]);

  // タブが隠れる/閉じられる前に、未反映の編集を送る
  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        sendPendingUpdate();
      }
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", sendPendingUpdate);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", sendPendingUpdate);
    };
  }, [sendPendingUpdate]);

  const dismissMergeConflict = useCallback(() => {
    setHasMergeConflict(false);
  }, []);

  return {
    markdown,
    setMarkdown,
    baseUriRef,
    documentDirRef,
    hasMergeConflict,
    dismissMergeConflict,
    updateMarkdownFromExtension,
    handleBaselineLoaded,
    handleApply,
  };
}
