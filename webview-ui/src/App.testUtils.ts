import type { ThemeSetting } from "@message/messageTypeToExtention";
import type { Message, ThemeKind } from "@message/messageTypeToWebview";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

/**
 * App統合テスト（play function）で共通利用するユーティリティ。
 *
 * Appは拡張機能との `postMessage` 通信で駆動されるため、テストでは
 * `window` に対して `message` イベントを発火させることで「拡張機能 → WebView」の
 * メッセージ送信をシミュレートする。
 */

// ===== 拡張機能 → WebView メッセージのシミュレーション =====

/** 拡張機能からのメッセージをwindowイベントとして発火する */
function emitExtensionMessage(message: Message): void {
  window.dispatchEvent(new MessageEvent("message", { data: message }));
}

/** 初期化メッセージ（initは行末コードの検出も伴う） */
export function sendInit(markdown: string): void {
  emitExtensionMessage({ type: "init", payload: markdown });
}

/** Markdown更新メッセージ */
export function sendUpdate(markdown: string): void {
  emitExtensionMessage({ type: "update", payload: markdown });
}

/** VSCodeテーマ変更メッセージ（themeSettingがautoのとき追従する） */
export function sendUpdateTheme(theme: ThemeKind): void {
  emitExtensionMessage({ type: "updateTheme", payload: theme });
}

/** 設定更新メッセージ（テーマ設定とカスタムCSS） */
export function sendUpdateSettings(themeSetting: ThemeSetting, customCss: string): void {
  emitExtensionMessage({ type: "updateSettings", payload: { themeSetting, customCss } });
}

/** ドキュメント情報メッセージ（画像パス解決用のベースURI） */
export function sendDocumentInfo(dirPath: string, baseUri: string): void {
  emitExtensionMessage({ type: "documentInfo", payload: { dirPath, baseUri } });
}

// ===== サンプルMarkdown =====

export const SAMPLE_HEADING_TEXT = "統合テスト見出し";
export const SAMPLE_BODY_TEXT = "これは統合テスト用の本文です。";
export const SAMPLE_MARKDOWN = `# ${SAMPLE_HEADING_TEXT}\n\n${SAMPLE_BODY_TEXT}\n`;

export const UPDATED_HEADING_TEXT = "更新後の見出し";
export const UPDATED_BODY_TEXT = "更新後の本文です。";
export const UPDATED_MARKDOWN = `# ${UPDATED_HEADING_TEXT}\n\n${UPDATED_BODY_TEXT}\n`;

// ===== ツールバー操作ヘルパー =====

/** ツールバーの編集/読み取りモード切替ボタンを取得する */
export function getModeToggleButton(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole("button", { name: /Edit|Readonly/ });
}

/** 編集/読み取りモードを切り替える */
export async function toggleMode(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(getModeToggleButton(canvasElement));
}

/** ツールバーのテーマ選択セレクトボックスを取得する */
export function getThemeSelect(canvasElement: HTMLElement): HTMLSelectElement {
  return within(canvasElement).getByRole<HTMLSelectElement>("combobox");
}

/** ツールバーからテーマ設定を選択する */
export async function selectTheme(canvasElement: HTMLElement, theme: ThemeSetting): Promise<void> {
  await userEvent.selectOptions(getThemeSelect(canvasElement), theme);
}

// ===== DOM参照ヘルパー =====

/** Appのルート要素に適用されている data-theme を取得する */
export function getAppRootTheme(canvasElement: HTMLElement): string | null {
  const header = canvasElement.querySelector("header");
  return header?.parentElement?.getAttribute("data-theme") ?? null;
}

/** コンテンツ領域(main)で右クリックしてコンテキストメニューを開く */
export async function openContextMenu(canvasElement: HTMLElement): Promise<void> {
  const main = canvasElement.querySelector("main");
  if (!main) {
    throw new Error("main要素が見つかりません");
  }
  await fireEvent.contextMenu(main);
}

/** MilkdownEditor(編集モード)の初期化完了を待つ */
export async function waitForEditorReady(canvasElement: HTMLElement): Promise<void> {
  await waitFor(
    async () => {
      const editor = canvasElement.querySelector("[contenteditable]");
      await expect(editor).not.toBeNull();
    },
    { timeout: 10000 }
  );
}
