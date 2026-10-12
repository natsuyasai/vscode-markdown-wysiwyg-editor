import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  ExportResultMessage,
  PlantUmlResultMessage,
  SaveImageResultMessage,
  ThemeKind,
} from "../message/messageTypeToWebview";
import {
  ExportBlogHtmlMessage,
  ExportHtmlMessage,
  ExportDiagramImages,
  ExportPdfMessage,
  OpenFileMessage,
  RenderPlantUmlMessage,
  SaveImageMessage,
  SaveSettingsMessage,
} from "../message/messageTypeToExtention";
import { isValidWebviewMessage } from "../message/validateWebviewMessage";
import { saveImageLocally } from "./imageStorage";
import { getPlantUmlServer } from "../plantuml/plantUmlServer";
import {
  buildMermaidImageMap,
  buildPlantUmlImageMap,
  exportToHtml,
  generateHtmlForPdf,
  type ExportOptions,
} from "../export/htmlExporter";
import { writePdfTempHtml } from "../export/pdfTempFile";
import { loadCustomCss } from "../util/customCssLoader";
import { getCustomCssBaseDir } from "./customCssWarnings";

/** エクスポートで使う VS Code の操作（テストで差し替えられるようにする） */
export interface ExportOperations {
  showSaveDialog: (options: vscode.SaveDialogOptions) => PromiseLike<vscode.Uri | undefined>;
  openExternal: (uri: vscode.Uri) => PromiseLike<boolean>;
}

const defaultExportOperations: ExportOperations = {
  showSaveDialog: (options) => vscode.window.showSaveDialog(options),
  openExternal: (uri) => vscode.env.openExternal(uri),
};

export interface MessageHandlerContext {
  document: vscode.TextDocument;
  webviewPanel: vscode.WebviewPanel;
  extensionPath: string;
  /** WebViewの内容を TextDocument に反映する（保存はしない） */
  applyWebviewText: (text: string) => Promise<boolean>;
  /** WebViewの内容を TextDocument に反映してから保存する */
  saveWebviewText: (text: string) => Promise<boolean>;
  updateWebview: () => void;
  updateTheme: () => void;
  sendDocumentInfo: () => void;
  sendSettings: () => void;
  getThemeKind: () => ThemeKind;
  /** エクスポートで使う VS Code の操作（省略時は VS Code 本体の操作） */
  exportOperations?: ExportOperations;
}

/**
 * WebViewからのメッセージを処理するハンドラ
 */
export async function handleMessage(
  message: unknown,
  context: MessageHandlerContext
): Promise<void> {
  const { document, webviewPanel } = context;
  const exportOperations = context.exportOperations ?? defaultExportOperations;
  if (!isValidWebviewMessage(message)) return; // 不正な形式のメッセージは無視する

  switch (message.type) {
    case "init":
      context.updateTheme();
      context.sendDocumentInfo();
      context.sendSettings();
      context.updateWebview();
      return;

    case "update":
      // WebViewでの編集を TextDocument に反映する（保存はしない。VS Code が未保存状態を管理する）
      if (typeof message.payload === "string") {
        await context.applyWebviewText(message.payload);
      }
      return;

    case "save":
      // 明示保存: 反映してから保存する
      if (typeof message.payload === "string") {
        await context.saveWebviewText(message.payload);
      }
      return;

    case "reload":
      context.updateWebview();
      return;

    case "saveImage":
      await handleSaveImage(message as SaveImageMessage, document, webviewPanel);
      return;

    case "renderPlantUml":
      await handleRenderPlantUml(message as RenderPlantUmlMessage, webviewPanel);
      return;

    case "saveSettings":
      await handleSaveSettings(message as SaveSettingsMessage);
      return;

    case "openFile":
      await handleOpenFile(message as OpenFileMessage);
      return;

    case "exportHtml":
      await handleExportHtml(
        message as ExportHtmlMessage,
        document,
        webviewPanel,
        context.getThemeKind,
        exportOperations
      );
      return;

    case "exportBlogHtml":
      await handleExportBlogHtml(
        message as ExportBlogHtmlMessage,
        document,
        webviewPanel,
        context.getThemeKind,
        exportOperations
      );
      return;

    case "exportPdf":
      await handleExportPdf(
        message as ExportPdfMessage,
        document,
        webviewPanel,
        context.getThemeKind,
        exportOperations
      );
      return;
  }
}

async function handleSaveImage(
  message: SaveImageMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel
): Promise<void> {
  const { requestId, imageData, fileName, mimeType } = message.payload;
  const result = await saveImageLocally(document, imageData, fileName, mimeType);
  if (!result.success && result.error !== undefined) {
    void vscode.window.showErrorMessage(`Markdown WYSIWYG Editor: ${result.error}`);
  }
  webviewPanel.webview.postMessage({
    type: "saveImageResult",
    payload: {
      requestId, // リクエストIDをそのまま返す
      ...result,
    },
  } satisfies SaveImageResultMessage);
}

async function handleRenderPlantUml(
  message: RenderPlantUmlMessage,
  webviewPanel: vscode.WebviewPanel
): Promise<void> {
  const { code, requestId } = message.payload;
  const server = getPlantUmlServer();
  const result = await server.render(code);
  webviewPanel.webview.postMessage({
    type: "plantUmlResult",
    payload: {
      requestId,
      svg: result.svg,
      error: result.error,
    },
  } satisfies PlantUmlResultMessage);
}

async function handleSaveSettings(message: SaveSettingsMessage): Promise<void> {
  const { themeSetting } = message.payload;
  const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
  const target = chooseThemeConfigurationTarget(config.inspect("theme"));
  await config.update("theme", themeSetting, target);
}

/**
 * テーマ設定の保存先を決める。
 * ワークスペース設定に値があればワークスペース設定へ、なければユーザー設定（Global）へ保存する。
 * （ワークスペース設定がある環境で Global に保存すると、変更が有効にならないため）
 */
export function chooseThemeConfigurationTarget(
  inspected: { workspaceValue?: unknown } | undefined
): vscode.ConfigurationTarget {
  return inspected?.workspaceValue !== undefined
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
}

async function handleOpenFile(message: OpenFileMessage): Promise<void> {
  // anchor は受け付けるが使わない（見出しへのジャンプは対象外）
  const { filePath } = message.payload;
  if (!(await isOpenableFilePath(filePath))) {
    void vscode.window.showWarningMessage(
      `Markdown WYSIWYG Editor: ファイルを開けません: ${filePath}`
    );
    return;
  }
  await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filePath));
}

/**
 * WebView から開く要求を受けたパスが、開いてよいファイルかを判定する。
 * 絶対パスで、実在する通常のファイルだけを許可する。
 */
export async function isOpenableFilePath(filePath: string): Promise<boolean> {
  if (filePath === "" || !path.isAbsolute(filePath)) {
    return false;
  }
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/** エクスポートする文書の場所と名前 */
interface ExportLocation {
  /** 文書のあるフォルダ（相対パスの画像の基準） */
  basePath: string;
  /** 拡張子を除いたファイル名（文書のタイトルと、保存ダイアログの既定名に使う） */
  baseName: string;
}

function getExportLocation(document: vscode.TextDocument): ExportLocation {
  const fsPath = document.uri.fsPath;
  return {
    basePath: path.dirname(fsPath),
    baseName: path.basename(fsPath, path.extname(fsPath)),
  };
}

/** 3種類のエクスポートで共通の設定（テーマ・カスタムCSS） */
interface ExportSettings {
  theme: ThemeKind;
  customCss: string | undefined;
  config: vscode.WorkspaceConfiguration;
}

/**
 * ユーザーのテーマ設定を考慮してエクスポート用テーマを解決する。
 * "auto"の場合はVSCodeのアクティブカラーテーマ、"light"/"dark"の場合はその値を返す。
 */
function resolveExportTheme(
  config: vscode.WorkspaceConfiguration,
  getThemeKind: () => ThemeKind
): ThemeKind {
  const themeSetting = config.get<"auto" | "light" | "dark">("theme", "auto");
  return themeSetting === "auto" ? getThemeKind() : themeSetting;
}

function resolveExportSettings(
  document: vscode.TextDocument,
  getThemeKind: () => ThemeKind
): ExportSettings {
  const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
  const cssPaths = config.get<string[]>("customCssPaths", []);
  // 相対パスは、文書が属するワークスペースフォルダを基準に解決する（エディタ表示と同じ規則）
  const { css } = loadCustomCss(cssPaths, { baseDir: getCustomCssBaseDir(document) });
  return { theme: resolveExportTheme(config, getThemeKind), customCss: css, config };
}

function reportExportResult(
  webviewPanel: vscode.WebviewPanel,
  payload: ExportResultMessage["payload"]
): void {
  void webviewPanel.webview.postMessage({
    type: "exportResult",
    payload,
  } satisfies ExportResultMessage);
}

function reportExportFailure(
  webviewPanel: vscode.WebviewPanel,
  failureLabel: string,
  error: unknown
): void {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  reportExportResult(webviewPanel, {
    success: false,
    message: `${failureLabel}に失敗しました: ${errorMessage}`,
  });
  void vscode.window.showErrorMessage(`${failureLabel}に失敗しました: ${errorMessage}`);
}

/** ファイルへ書き出すHTMLエクスポート（HTML / ブログ用HTML）の違い */
interface HtmlFileExportSpec {
  /** 保存ダイアログの既定ファイル名の末尾（拡張子を含む） */
  fileNameSuffix: string;
  label: string;
  successMessage: string;
  diagramImages: ExportDiagramImages | undefined;
  buildOptions: (base: ExportOptions, settings: ExportSettings) => ExportOptions;
}

async function handleExportHtmlFile(
  spec: HtmlFileExportSpec,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  try {
    const { basePath, baseName } = getExportLocation(document);
    const saveUri = await exportOperations.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(basePath, baseName + spec.fileNameSuffix)),
      filters: {
        "HTML files": ["html"],
      },
    });
    if (!saveUri) {
      return;
    }

    const settings = resolveExportSettings(document, getThemeKind);
    const base: ExportOptions = {
      theme: settings.theme,
      title: baseName,
      embedImages: true,
      customCss: settings.customCss,
      mermaidImages: buildMermaidImageMap(spec.diagramImages?.mermaidImages),
      plantUmlImages: buildPlantUmlImageMap(spec.diagramImages?.plantUmlImages),
    };
    exportToHtml(document.getText(), basePath, saveUri.fsPath, spec.buildOptions(base, settings));

    reportExportResult(webviewPanel, {
      success: true,
      message: spec.successMessage,
      filePath: saveUri.fsPath,
    });
    void vscode.window.showInformationMessage(`${spec.successMessage}: ${saveUri.fsPath}`);
  } catch (error) {
    reportExportFailure(webviewPanel, spec.label, error);
  }
}

async function handleExportHtml(
  message: ExportHtmlMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  await handleExportHtmlFile(
    {
      fileNameSuffix: ".html",
      label: "HTMLエクスポート",
      successMessage: "HTMLファイルをエクスポートしました",
      diagramImages: message.payload,
      buildOptions: (base) => base,
    },
    document,
    webviewPanel,
    getThemeKind,
    exportOperations
  );
}

async function handleExportBlogHtml(
  message: ExportBlogHtmlMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  await handleExportHtmlFile(
    {
      fileNameSuffix: "_blog.html",
      label: "ブログ用HTMLエクスポート",
      successMessage: "ブログ用HTMLファイルをエクスポートしました",
      diagramImages: message.payload,
      buildOptions: (base, settings) => ({
        ...base,
        scopedCss: true,
        useShadowDom: settings.config.get<boolean>("blogExport.useShadowDom", false),
      }),
    },
    document,
    webviewPanel,
    getThemeKind,
    exportOperations
  );
}

async function handleExportPdf(
  message: ExportPdfMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  try {
    const { basePath, baseName } = getExportLocation(document);
    const settings = resolveExportSettings(document, getThemeKind);

    // 一時HTMLファイルを生成
    const htmlContent = generateHtmlForPdf(document.getText(), basePath, {
      theme: settings.theme,
      title: baseName,
      embedImages: true,
      customCss: settings.customCss,
      mermaidImages: buildMermaidImageMap(message.payload?.mermaidImages),
      plantUmlImages: buildPlantUmlImageMap(message.payload?.plantUmlImages),
    });
    const tempHtmlPath = writePdfTempHtml(htmlContent, baseName);

    // ブラウザで開く（一時HTMLは、次のエクスポート時と拡張機能の終了時に削除する）
    await exportOperations.openExternal(vscode.Uri.file(tempHtmlPath));

    const successMessage = "ブラウザでHTMLを開きました。印刷機能からPDFとして保存してください。";
    reportExportResult(webviewPanel, {
      success: true,
      message: successMessage,
      filePath: tempHtmlPath,
    });
    void vscode.window.showInformationMessage(
      "ブラウザでHTMLを開きました。ブラウザの印刷機能（Ctrl+P / Cmd+P）からPDFとして保存してください。"
    );
  } catch (error) {
    reportExportFailure(webviewPanel, "PDFエクスポート", error);
  }
}
