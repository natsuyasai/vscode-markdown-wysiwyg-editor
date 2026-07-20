import type { ThemeSetting } from "@message/messageTypeToExtention";
import type { Message, SaveImageResultMessage, ThemeKind } from "@message/messageTypeToWebview";
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

/** 画像保存結果メッセージ（拡張機能側での画像保存完了通知） */
export function sendSaveImageResult(payload: SaveImageResultMessage["payload"]): void {
  emitExtensionMessage({ type: "saveImageResult", payload });
}

// ===== サンプルMarkdown =====

export const SAMPLE_HEADING_TEXT = "統合テスト見出し";
export const SAMPLE_BODY_TEXT = "これは統合テスト用の本文です。";
export const SAMPLE_MARKDOWN = `# ${SAMPLE_HEADING_TEXT}

${SAMPLE_BODY_TEXT}

## 導入セクション

このドキュメントはWYSIWYGエディタの結合テスト用サンプルです。

### 背景

- 要素をひととおり含む
- 表示崩れを検知する
- Milkdownとreact-markdownの双方で描画する

### 手順

1. エディタを開く
2. 内容を確認する
3. モードを切り替える

## データ一覧

| 項目 | 値 |
| --- | --- |
| 種類 | サンプル |
| 状態 | 初期 |

## コード例

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
\`\`\`

> これは補足のための引用文です。

詳しくは[公式ドキュメント](https://example.com/docs)を参照してください。

![サンプル画像](sample.png)
`;

export const UPDATED_HEADING_TEXT = "更新後の見出し";
export const UPDATED_BODY_TEXT = "更新後の本文です。";
export const UPDATED_MARKDOWN = `# ${UPDATED_HEADING_TEXT}

${UPDATED_BODY_TEXT}

## 更新後の概要

更新後のドキュメントも各種要素を含みます。

### 変更点

- 見出しを差し替えた
- 本文を更新した
- 一覧の内容を変えた

### 確認事項

1. 旧見出しが消えている
2. 新しい内容が表示される
3. レイアウトが崩れない

## 更新データ一覧

| 項目 | 値 |
| --- | --- |
| 種類 | 更新版 |
| 状態 | 反映済み |

## 更新後コード例

\`\`\`js
function farewell(name) {
  return \`Bye, \${name}\`;
}
\`\`\`

> これは更新後の引用文です。

続きは[更新ページ](https://example.com/updated)を確認してください。

![更新後画像](updated.png)
`;

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

/** Ctrl+S（保存ショートカット）をwindowへ発火する */
export function pressCtrlS(): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true })
  );
}
