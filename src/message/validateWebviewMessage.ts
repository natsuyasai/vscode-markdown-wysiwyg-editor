import type { Message, MessageType } from "./messageTypeToExtention";

/**
 * WebView から受け取ったメッセージの payload を検証する関数。
 * 必須の項目とその型だけを確認し、定義されていない追加の項目は許容する。
 */
type PayloadValidator = (payload: unknown) => boolean;

const THEME_SETTINGS: readonly unknown[] = ["auto", "light", "dark"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}

function hasStringFields(payload: unknown, keys: readonly string[]): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return keys.every((key) => isString(payload[key]));
}

function isMermaidImage(value: unknown): boolean {
  return hasStringFields(value, ["code", "dataUri"]);
}

/** exportHtml / exportBlogHtml / exportPdf: payload は省略可。指定する場合 mermaidImages は {code, dataUri} の配列 */
function isExportPayload(payload: unknown): boolean {
  if (payload === undefined) {
    return true;
  }
  if (!isRecord(payload)) {
    return false;
  }
  const { mermaidImages } = payload;
  if (mermaidImages === undefined) {
    return true;
  }
  return Array.isArray(mermaidImages) && mermaidImages.every(isMermaidImage);
}

const acceptAnyPayload: PayloadValidator = () => true;

/**
 * メッセージの種類ごとの payload 検証。
 * MessageType を追加したときにエントリがないとコンパイルエラーになる。
 * payload に項目を追加するブランチは、ここに検証を追加すること。
 */
const PAYLOAD_VALIDATORS: Record<MessageType, PayloadValidator> = {
  init: acceptAnyPayload,
  reload: acceptAnyPayload,
  update: isString,
  save: isString,
  saveImage: (payload) =>
    hasStringFields(payload, ["requestId", "imageData", "fileName", "mimeType"]),
  renderPlantUml: (payload) => hasStringFields(payload, ["code", "requestId"]),
  saveSettings: (payload) => isRecord(payload) && THEME_SETTINGS.includes(payload.themeSetting),
  openFile: (payload) =>
    hasStringFields(payload, ["filePath"]) && isRecord(payload) && isOptionalString(payload.anchor),
  exportHtml: isExportPayload,
  exportBlogHtml: isExportPayload,
  exportPdf: isExportPayload,
};

function isMessageType(value: unknown): value is MessageType {
  return isString(value) && Object.prototype.hasOwnProperty.call(PAYLOAD_VALIDATORS, value);
}

/**
 * WebView から受け取った値が、処理してよい形式のメッセージかを判定する。
 * 不正な形式のメッセージは false を返す（例外は発生させない）。
 */
export function isValidWebviewMessage(raw: unknown): raw is Message {
  if (!isRecord(raw) || !isMessageType(raw.type)) {
    return false;
  }
  return PAYLOAD_VALIDATORS[raw.type](raw.payload);
}
