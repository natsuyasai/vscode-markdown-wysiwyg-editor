import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface ImageSaveResult {
  success: boolean;
  localPath?: string;
  markdownImage?: string;
  error?: string;
}

/**
 * 画像をローカルファイルシステムに保存する
 * @param document 編集中のドキュメント
 * @param imageData Base64エンコードされた画像データ
 * @param fileName ファイル名
 * @param mimeType MIMEタイプ
 * @returns 保存結果
 */
export async function saveImageLocally(
  document: vscode.TextDocument,
  imageData: string,
  fileName: string,
  mimeType: string
): Promise<ImageSaveResult> {
  try {
    // Base64データからバッファを作成
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // 保存先ディレクトリを決定
    const saveDir = getSaveDirectory(document);

    // ディレクトリが存在しない場合は作成
    if (!fsSync.existsSync(saveDir)) {
      await fs.mkdir(saveDir, { recursive: true });
    }

    // ユニークなファイル名を生成
    const uniqueFileName = generateUniqueFileName(saveDir, fileName, mimeType);
    const filePath = path.join(saveDir, uniqueFileName);

    // ファイルを保存
    await fs.writeFile(filePath, buffer);

    // ドキュメントからの相対パスを計算
    const documentDir = path.dirname(document.uri.fsPath);
    const relativePath = path.relative(documentDir, filePath).replace(/\\/g, "/");

    return {
      success: true,
      localPath: relativePath,
      markdownImage: `![image](${relativePath})`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to save image: ${errorMessage}`,
    };
  }
}

/**
 * 保存先ディレクトリを取得する
 * 優先順位: ドキュメントと同じディレクトリ > フォールバックディレクトリ
 */
function getSaveDirectory(document: vscode.TextDocument): string {
  // ドキュメントがファイルシステム上に存在する場合
  if (document.uri.scheme === "file") {
    return path.dirname(document.uri.fsPath);
  }

  // フォールバック: ホームディレクトリ配下
  const fallbackDir = path.join(os.homedir(), "markdown-wysiwyg-images");
  return fallbackDir;
}

/**
 * ユニークなファイル名を生成する
 */
function generateUniqueFileName(dir: string, originalName: string, mimeType: string): string {
  const extension = getExtensionFromMimeType(mimeType);
  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
  const timestamp = String(Date.now());

  let fileName = `${baseName}_${timestamp}${extension}`;
  let counter = 1;

  // ファイルが既に存在する場合は連番を付ける
  while (fsSync.existsSync(path.join(dir, fileName))) {
    fileName = `${baseName}_${timestamp}_${String(counter)}${extension}`;
    counter++;
  }

  return fileName;
}

/**
 * MIMEタイプから拡張子を取得する
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
  };
  return mimeToExt[mimeType] || ".png";
}
