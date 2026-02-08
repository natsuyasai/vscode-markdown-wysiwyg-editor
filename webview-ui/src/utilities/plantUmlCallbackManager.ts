/**
 * PlantUMLコールバック管理ユーティリティ
 *
 * PlantUMLはExtension経由で非同期にレンダリングされるため、
 * リクエストIDとコールバックのマッピングを管理する必要がある。
 * このクラスはそのマッピング管理を集約する。
 */
export class PlantUmlCallbackManager<T> {
  private readonly callbacks = new Map<string, T>();

  register(requestId: string, callback: T): void {
    this.callbacks.set(requestId, callback);
  }

  resolve(requestId: string): T | undefined {
    const callback = this.callbacks.get(requestId);
    if (callback) {
      this.callbacks.delete(requestId);
    }
    return callback;
  }

  unregister(requestId: string): void {
    this.callbacks.delete(requestId);
  }
}
