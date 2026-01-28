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
  Message,
  OpenFileMessage,
  RenderPlantUmlMessage,
  SaveImageMessage,
  SaveSettingsMessage,
} from "../message/messageTypeToExtention";
import { saveImageLocally } from "./imageStorage";
import { getPlantUmlServer } from "../plantuml/plantUmlServer";
import { exportToHtml, generateHtmlForPdf } from "../export/htmlExporter";

interface MessageHandlerContext {
  document: vscode.TextDocument;
  webviewPanel: vscode.WebviewPanel;
  extensionPath: string;
  updateTextDocument: (document: vscode.TextDocument, text: string) => void;
  updateWebview: () => void;
  updateTheme: () => void;
  sendDocumentInfo: () => void;
  sendSettings: () => void;
  getThemeKind: () => ThemeKind;
}

/**
 * WebViewからのメッセージを処理するハンドラ
 */
export async function handleMessage(
  message: Message,
  context: MessageHandlerContext
): Promise<void> {
  const { document, webviewPanel, extensionPath } = context;

  switch (message.type) {
    case "init":
      context.updateTheme();
      context.sendDocumentInfo();
      context.sendSettings();
      context.updateWebview();
      return;

    case "update":
      if (message.payload !== undefined) {
        context.updateTextDocument(document, message.payload as string);
      }
      return;

    case "save":
      if (message.payload !== undefined) {
        context.updateTextDocument(document, message.payload as string);
      }
      return;

    case "reload":
      context.updateWebview();
      return;

    case "saveImage":
      await handleSaveImage(message as SaveImageMessage, document, webviewPanel);
      return;

    case "renderPlantUml":
      await handleRenderPlantUml(message as RenderPlantUmlMessage, webviewPanel, extensionPath);
      return;

    case "saveSettings":
      await handleSaveSettings(message as SaveSettingsMessage);
      return;

    case "openFile":
      await handleOpenFile(message as OpenFileMessage);
      return;

    case "exportHtml":
      await handleExportHtml(document, webviewPanel, context.getThemeKind);
      return;

    case "exportPdf":
      await handleExportPdf(document, webviewPanel, context.getThemeKind);
      return;
  }
}

async function handleSaveImage(
  message: SaveImageMessage,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel
): Promise<void> {
  const { imageData, fileName, mimeType } = message.payload;
  const result = await saveImageLocally(document, imageData, fileName, mimeType);
  webviewPanel.webview.postMessage({
    type: "saveImageResult",
    payload: result,
  } satisfies SaveImageResultMessage);
}

async function handleRenderPlantUml(
  message: RenderPlantUmlMessage,
  webviewPanel: vscode.WebviewPanel,
  extensionPath: string
): Promise<void> {
  const { code, requestId } = message.payload;
  const server = getPlantUmlServer(extensionPath);
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
  await config.update("theme", themeSetting, vscode.ConfigurationTarget.Global);
}

async function handleOpenFile(message: OpenFileMessage): Promise<void> {
  const { filePath } = message.payload;
  const fileUri = vscode.Uri.file(filePath);
  await vscode.commands.executeCommand("vscode.open", fileUri);
}

async function handleExportHtml(
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind
): Promise<void> {
  try {
    const basePath = path.dirname(document.uri.fsPath);
    const defaultFileName =
      path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + ".html";

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(basePath, defaultFileName)),
      filters: {
        "HTML files": ["html"],
      },
    });

    if (saveUri) {
      const theme = getThemeKind();
      const title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));

      exportToHtml(document.getText(), basePath, saveUri.fsPath, {
        theme,
        title,
        embedImages: true,
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

async function handleExportPdf(
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  getThemeKind: () => ThemeKind
): Promise<void> {
  try {
    const basePath = path.dirname(document.uri.fsPath);
    const theme = getThemeKind();
    const title = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));

    // 一時HTMLファイルを生成
    const htmlContent = generateHtmlForPdf(document.getText(), basePath, {
      theme,
      title,
      embedImages: true,
    });

    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `${title}_export.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

    // ブラウザで開く
    const tempUri = vscode.Uri.file(tempHtmlPath);
    await vscode.env.openExternal(tempUri);

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
