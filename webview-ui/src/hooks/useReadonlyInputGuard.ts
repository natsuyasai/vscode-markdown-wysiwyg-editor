import { useEffect } from "react";

/** イベントがファイル（画像など）を含むか */
function hasFiles(transfer: DataTransfer | null): boolean {
  if (!transfer) {
    return false;
  }
  if (transfer.files.length > 0 || transfer.types.includes("Files")) {
    return true;
  }
  return Array.from(transfer.items).some((item) => item.kind === "file");
}

/**
 * 読み取り専用（プレビュー）の間、画像などのファイルの貼り付けとドロップを無効にする。
 * 読み取り専用なのに文書へ追記されたり、WebViewがファイルを開いたりするのを防ぐ。
 * 編集モードでは何もしない（画像の貼り付け・ドロップは Crepe の ImageBlock が扱う）。
 */
export function useReadonlyInputGuard(readonly: boolean): void {
  useEffect(() => {
    if (!readonly) {
      return;
    }

    const block = (event: ClipboardEvent | DragEvent) => {
      const transfer = event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
      if (hasFiles(transfer)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // ドロップ先として受け付けない（preventDefault すると受け付ける意味になるため、dropEffect で示す）
    const refuseDragOver = (event: DragEvent) => {
      if (event.dataTransfer && hasFiles(event.dataTransfer)) {
        event.dataTransfer.dropEffect = "none";
      }
    };

    // documentレベルでキャプチャし、他のハンドラより先に止める
    document.addEventListener("paste", block, true);
    document.addEventListener("drop", block, true);
    document.addEventListener("dragover", refuseDragOver, true);
    return () => {
      document.removeEventListener("paste", block, true);
      document.removeEventListener("drop", block, true);
      document.removeEventListener("dragover", refuseDragOver, true);
    };
  }, [readonly]);
}
