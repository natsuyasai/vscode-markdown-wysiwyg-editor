import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  ExportResultMessage,
  PlantUmlResultMessage,
  SaveImageResultMessage,
  ThemeKind,
} from "../message/messageTypeToWebview";
import {
  ExportBlogHtmlMessage,
  ExportHtmlMessage,
  ExportPdfMessage,
  OpenFileMessage,
  RenderPlantUmlMessage,
  SaveImageMessage,
  SaveSettingsMessage,
} from "../message/messageTypeToExtention";
import { isValidWebviewMessage } from "../message/validateWebviewMessage";
import { saveImageLocally } from "./imageStorage";
import { getPlantUmlServer } from "../plantuml/plantUmlServer";
import { buildMermaidImageMap, exportToHtml, generateHtmlForPdf } from "../export/htmlExporter";
import { loadCustomCss } from "../util/customCssLoader";

/** エクスポートで使う VS Code の操作（テストで差し替えられるようにする） */
export interface ExportOperations {
  showSaveDialog: (options: vscode.SaveDialogOptions) => Thenable<vscode.Uri | undefined>;
  openExternal: (uri: vscode.Uri) => Thenable<boolean>;
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

/**
 * ユーザーのテーマ設定を考慮してエクスポート用テーマを解決する。
 * "auto"の場合はVSCodeのアクティブカラーテーマ、"light"/"dark"の場合はその値を返す。
 */
function resolveExportTheme(getThemeKind: () => ThemeKind): ThemeKind {
  const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
  const themeSetting = config.get<"auto" | "light" | "dark">("theme", "auto");
  if (themeSetting === "auto") {
    return getThemeKind();
  }
  return themeSetting;
}

async function handleExportHtml(
  message: ExportHtmlMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  try {
    const basePath = path.dirname(document.uri.fsPath);
    const defaultFileName =
      path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + ".html";

    const saveUri = await exportOperations.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(basePath, defaultFileName)),
      filters: {
        "HTML files": ["html"],
      },
    });

    if (saveUri) {
      const theme = resolveExportTheme(getThemeKind);
      const title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
      const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
      const cssPaths = config.get<string[]>("customCssPaths", []);
      const { css: customCss } = loadCustomCss(cssPaths);
      const mermaidImages = buildMermaidImageMap(message.payload?.mermaidImages);

      exportToHtml(document.getText(), basePath, saveUri.fsPath, {
        theme,
        title,
        embedImages: true,
        customCss,
        mermaidImages,
      });

      webviewPanel.webview.postMessage({
        type: "exportResult",
        payload: {
          success: true,
          message: "HTMLファイルをエクスポートしました",
          filePath: saveUri.fsPath,
        },
      } satisfies ExportResultMessage);

      vscode.window.showInformationMessage(`HTMLファイルをエクスポートしました: ${saveUri.fsPath}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    webviewPanel.webview.postMessage({
      type: "exportResult",
      payload: {
        success: false,
        message: `エクスポートに失敗しました: ${errorMessage}`,
      },
    } satisfies ExportResultMessage);
    vscode.window.showErrorMessage(`HTMLエクスポートに失敗しました: ${errorMessage}`);
  }
}

async function handleExportBlogHtml(
  message: ExportBlogHtmlMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  try {
    const basePath = path.dirname(document.uri.fsPath);
    const defaultFileName =
      path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + "_blog.html";

    const saveUri = await exportOperations.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(basePath, defaultFileName)),
      filters: {
        "HTML files": ["html"],
      },
    });

    if (saveUri) {
      const theme = resolveExportTheme(getThemeKind);
      const title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
      const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
      const cssPaths = config.get<string[]>("customCssPaths", []);
      const { css: customCss } = loadCustomCss(cssPaths);
      const useShadowDom = config.get<boolean>("blogExport.useShadowDom", false);
      const mermaidImages = buildMermaidImageMap(message.payload?.mermaidImages);

      exportToHtml(document.getText(), basePath, saveUri.fsPath, {
        theme,
        title,
        embedImages: true,
        customCss,
        scopedCss: true,
        useShadowDom,
        mermaidImages,
      });

      webviewPanel.webview.postMessage({
        type: "exportResult",
        payload: {
          success: true,
          message: "ブログ用HTMLファイルをエクスポートしました",
          filePath: saveUri.fsPath,
        },
      } satisfies ExportResultMessage);

      vscode.window.showInformationMessage(
        `ブログ用HTMLファイルをエクスポートしました: ${saveUri.fsPath}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    webviewPanel.webview.postMessage({
      type: "exportResult",
      payload: {
        success: false,
        message: `ブログ用HTMLエクスポートに失敗しました: ${errorMessage}`,
      },
    } satisfies ExportResultMessage);
    vscode.window.showErrorMessage(`ブログ用HTMLエクスポートに失敗しました: ${errorMessage}`);
  }
}

async function handleExportPdf(
  message: ExportPdfMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind,
  exportOperations: ExportOperations
): Promise<void> {
  try {
    const basePath = path.dirname(document.uri.fsPath);
    const theme = resolveExportTheme(getThemeKind);
    const title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));

    const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
    const cssPaths = config.get<string[]>("customCssPaths", []);
    const { css: customCss } = loadCustomCss(cssPaths);

    // 一時HTMLファイルを生成
    const htmlContent = generateHtmlForPdf(document.getText(), basePath, {
      theme,
      title,
      embedImages: true,
      customCss,
      mermaidImages: buildMermaidImageMap(message.payload?.mermaidImages),
    });

    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `${title}_export.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

    // ブラウザで開く
    const tempUri = vscode.Uri.file(tempHtmlPath);
    await exportOperations.openExternal(tempUri);

    webviewPanel.webview.postMessage({
      type: "exportResult",
      payload: {
        success: true,
        message: "ブラウザでHTMLを開きました。印刷機能からPDFとして保存してください。",
        filePath: tempHtmlPath,
      },
    } satisfies ExportResultMessage);

    vscode.window.showInformationMessage(
      "ブラウザでHTMLを開きました。ブラウザの印刷機能（Ctrl+P / Cmd+P）からPDFとして保存してください。"
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    webviewPanel.webview.postMessage({
      type: "exportResult",
      payload: {
        success: false,
        message: `PDFエクスポートに失敗しました: ${errorMessage}`,
      },
    } satisfies ExportResultMessage);
    vscode.window.showErrorMessage(`PDFエクスポートに失敗しました: ${errorMessage}`);
  }
}
