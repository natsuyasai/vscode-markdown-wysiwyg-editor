import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { After, Before, Given, type IWorld } from "@cucumber/cucumber";
import { EditorProvider } from "../../../../editor/editorProvider";
import type { MessageHandlerContext } from "../../../../editor/MessageHandler";

/**
 * B4（拡張機能のライフサイクル・入力検証）の step で共有する状態とテスト用の部品。
 * 他の feature の step と状態が混ざらないよう、World には hardening プロパティだけを追加する。
 */

/** 設定を変更した step が、シナリオ終了時に元へ戻すための記録 */
interface ConfigRestore {
  section: string;
  key: string;
  globalValue: unknown;
}

export interface HardeningState {
  /** シナリオごとの一時ディレクトリ */
  root: string;
  /** 一時ディレクトリ内のファイル一覧のスナップショット（追加されたファイルの判定に使う） */
  snapshot?: Set<string>;
  panels: FakeWebviewPanel[];
  configRestores: ConfigRestore[];
  cleanups: (() => void)[];
  /** シナリオ固有の値 */
  values: Record<string, unknown>;
}

export interface HardeningWorld extends IWorld {
  hardening?: HardeningState;
}

export function getState(world: HardeningWorld): HardeningState {
  if (world.hardening === undefined) {
    throw new Error("B4の検証用の状態が初期化されていません（@B4 タグを確認してください）");
  }
  return world.hardening;
}

Before({ tags: "@B4" }, function (this: HardeningWorld) {
  this.hardening = {
    root: fs.mkdtempSync(path.join(os.tmpdir(), "md-wysiwyg-hardening-")),
    panels: [],
    configRestores: [],
    cleanups: [],
    values: {},
  };
});

After({ tags: "@B4" }, async function (this: HardeningWorld) {
  const state = this.hardening;
  if (state === undefined) {
    return;
  }
  for (const panel of state.panels) {
    panel.dispose();
  }
  for (const cleanup of state.cleanups.reverse()) {
    cleanup();
  }
  for (const restore of state.configRestores.reverse()) {
    await vscode.workspace
      .getConfiguration(restore.section)
      .update(restore.key, restore.globalValue, vscode.ConfigurationTarget.Global);
  }
  try {
    fs.rmSync(state.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // エディタで開いたファイルが掴まれている場合など、一時ディレクトリの削除は可能な範囲で行う
  }
  this.hardening = undefined;
});

/** 一時ディレクトリ内の相対パス（"/" 区切り）を絶対パスにする */
export function resolveInRoot(state: HardeningState, relativePath: string): string {
  return path.join(state.root, ...relativePath.split("/"));
}

/** 一時ディレクトリ内のファイルを、ルートからの相対パス（"/" 区切り）で列挙する */
export function listFiles(dir: string, base: string = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath, base));
    } else {
      result.push(path.relative(base, fullPath).split(path.sep).join("/"));
    }
  }
  return result;
}

/** 一時ディレクトリのスナップショットをまだ取っていなければ取る */
export function takeSnapshotOnce(state: HardeningState): void {
  state.snapshot ??= new Set(listFiles(state.root));
}

/** スナップショット以降に一時ディレクトリへ追加されたファイル */
export function addedFiles(state: HardeningState): string[] {
  const before = state.snapshot ?? new Set<string>();
  return listFiles(state.root).filter((file) => !before.has(file));
}

/** ユーザー設定（Global）を変更し、シナリオ終了時に元へ戻す */
export async function updateGlobalConfig(
  state: HardeningState,
  section: string,
  key: string,
  value: unknown
): Promise<void> {
  const config = vscode.workspace.getConfiguration(section);
  if (!state.configRestores.some((r) => r.section === section && r.key === key)) {
    state.configRestores.push({ section, key, globalValue: config.inspect(key)?.globalValue });
  }
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/** 条件を満たすまで待つ */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
  message: string
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(message);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** 少し待つ（イベントが届かないことを確認するため） */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** postMessage を記録する WebviewPanel の代替 */
export class FakeWebviewPanel {
  readonly posted: unknown[] = [];
  disposed = false;
  private readonly disposeListeners: (() => void)[] = [];
  private readonly receiveListeners: ((message: unknown) => unknown)[] = [];

  readonly webview = {
    options: {} as vscode.WebviewOptions,
    html: "",
    cspSource: "vscode-hardening-test-csp",
    asWebviewUri: (uri: vscode.Uri): vscode.Uri => uri,
    postMessage: (message: unknown): Promise<boolean> => {
      this.posted.push(message);
      return Promise.resolve(true);
    },
    onDidReceiveMessage: (listener: (message: unknown) => unknown): vscode.Disposable => {
      this.receiveListeners.push(listener);
      return new vscode.Disposable(() => {
        const index = this.receiveListeners.indexOf(listener);
        if (index >= 0) this.receiveListeners.splice(index, 1);
      });
    },
  };

  onDidDispose(listener: () => void): vscode.Disposable {
    this.disposeListeners.push(listener);
    return new vscode.Disposable(() => undefined);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const listener of this.disposeListeners) {
      listener();
    }
  }

  asPanel(): vscode.WebviewPanel {
    return this as unknown as vscode.WebviewPanel;
  }

  postedOfType(type: string): unknown[] {
    return this.posted.filter(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === type
    );
  }
}

/** EditorProvider に渡す拡張機能コンテキストの代替 */
export function createFakeExtensionContext(state: HardeningState): vscode.ExtensionContext {
  return {
    extensionUri: vscode.Uri.file(state.root),
    extensionPath: state.root,
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

/** 文書を代替パネルで開く（resolveCustomTextEditor を実行する） */
export function openWithFakePanel(
  state: HardeningState,
  document: vscode.TextDocument
): FakeWebviewPanel {
  const panel = new FakeWebviewPanel();
  const provider = new EditorProvider(createFakeExtensionContext(state));
  const tokenSource = new vscode.CancellationTokenSource();
  provider.resolveCustomTextEditor(document, panel.asPanel(), tokenSource.token);
  tokenSource.dispose();
  state.panels.push(panel);
  return panel;
}

/** handleMessage に渡すコンテキストの代替（WebView への送信は panel に記録する） */
export function createFakeMessageContext(
  document: vscode.TextDocument,
  panel: FakeWebviewPanel
): MessageHandlerContext {
  return {
    document,
    webviewPanel: panel.asPanel(),
    extensionPath: "",
    updateTextDocument: () => {
      panel.posted.push({ type: "__updateTextDocument" });
      return Promise.resolve(undefined);
    },
    updateWebview: () => panel.posted.push({ type: "__updateWebview" }),
    updateTheme: () => panel.posted.push({ type: "__updateTheme" }),
    sendDocumentInfo: () => panel.posted.push({ type: "__sendDocumentInfo" }),
    sendSettings: () => panel.posted.push({ type: "__sendSettings" }),
    getThemeKind: () => "light",
  };
}

/** 一時ディレクトリに保存したMarkdown文書を開く */
export async function openDocumentInRoot(
  state: HardeningState,
  relativePath: string
): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(vscode.Uri.file(resolveInRoot(state, relativePath)));
}

Given(
  "強化検証用の一時ディレクトリ内の{string}にMarkdown文書を保存してある",
  function (this: HardeningWorld, relativePath: string) {
    const filePath = resolveInRoot(getState(this), relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# 強化検証\n\n本文\n", "utf-8");
  }
);

Given(
  "強化検証用の一時ディレクトリ内に{string}ディレクトリがある",
  function (this: HardeningWorld, relativePath: string) {
    fs.mkdirSync(resolveInRoot(getState(this), relativePath), { recursive: true });
  }
);
