function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * フロントマターの値をテーブル表示用の文字列に整形する
 * - 配列は各要素を再帰的に整形しカンマ区切りで連結する
 * - プレーンオブジェクトはJSON文字列にする
 * - それ以外はString()で文字列化する
 */
export function formatFrontmatterValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatFrontmatterValue(item)).join(", ");
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  // symbolやfunctionなど想定外の型が来た場合の念のためのフォールバック
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value);
}
