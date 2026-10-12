/**
 * WebViewの未反映の編集（デバウンス待ちの更新）を、すぐに拡張機能へ送るための登録口。
 *
 * エクスポートなど、拡張機能が TextDocument の内容を読む処理の前に呼ぶ。
 * 拡張機能はメッセージを届いた順に1つずつ処理するため、先に送った更新が反映されてから
 * 後続のメッセージ（エクスポート）が処理される。
 */
type Flusher = () => void;

let flusher: Flusher | undefined;

/** 未反映の編集を送る処理を登録する。登録解除用の関数を返す */
export function registerPendingEditsFlusher(next: Flusher): () => void {
  flusher = next;
  return () => {
    if (flusher === next) {
      flusher = undefined;
    }
  };
}

/** 未反映の編集があれば、すぐに拡張機能へ送る */
export function flushPendingEdits(): void {
  flusher?.();
}
