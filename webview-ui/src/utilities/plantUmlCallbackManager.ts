/** PlantUMLの応答待ちの上限（既定値） */
export const PLANTUML_RESPONSE_TIMEOUT_MS = 60_000;

/** 応答待ちの上限を過ぎたときに表示するメッセージ */
export const PLANTUML_TIMEOUT_MESSAGE = "PlantUMLの描画がタイムアウトしました";

/** 応答待ちの上限の指定 */
export interface PlantUmlTimeoutOptions {
  timeoutMs: number;
  /** 上限までに応答がなかったときに呼ばれる */
  onTimeout: () => void;
}

interface PendingRequest<T> {
  callback: T;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * PlantUMLコールバック管理ユーティリティ
 *
 * PlantUMLはExtension経由で非同期にレンダリングされるため、
 * リクエストIDとコールバックのマッピングを管理する必要がある。
 * このクラスはそのマッピング管理を集約する。
 * 応答が返らない要求が残り続けないよう、登録時に応答待ちの上限を指定できる。
 */
export class PlantUmlCallbackManager<T> {
  private readonly pending = new Map<string, PendingRequest<T>>();

  register(requestId: string, callback: T, timeout?: PlantUmlTimeoutOptions): void {
    this.unregister(requestId);
    const request: PendingRequest<T> = { callback };
    if (timeout) {
      request.timer = setTimeout(() => {
        this.pending.delete(requestId);
        timeout.onTimeout();
      }, timeout.timeoutMs);
    }
    this.pending.set(requestId, request);
  }

  resolve(requestId: string): T | undefined {
    const request = this.pending.get(requestId);
    if (!request) {
      return undefined;
    }
    clearTimeout(request.timer);
    this.pending.delete(requestId);
    return request.callback;
  }

  unregister(requestId: string): void {
    const request = this.pending.get(requestId);
    if (request) {
      clearTimeout(request.timer);
      this.pending.delete(requestId);
    }
  }

  /** 応答を待っている要求の件数 */
  get pendingCount(): number {
    return this.pending.size;
  }
}
