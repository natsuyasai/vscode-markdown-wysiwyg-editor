import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as vscode from "vscode";

export interface ImageSaveResult {
  success: boolean;
  localPath?: string;
  markdownImage?: string;
  error?: string;
}

/** 保存を許可する画像の MIME タイプと拡張子 */
const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
};

const DEFAULT_BASE_NAME = "image";
const MAX_BASE_NAME_LENGTH = 100;

/**
 * 画像を、編集中の文書と同じディレクトリに保存する
 * @param document 編集中のドキュメント
 * @param imageData Base64エンコードされた画像データ
 * @param fileName ファイル名（ディレクトリ部分や使用できない文字は取り除く）
 * @param mimeType MIMEタイプ
 * @returns 保存結果
 */
export async function saveImageLocally(
  document: vscode.TextDocument,
  imageData: string,
  fileName: string,
  mimeType: string
): Promise<ImageSaveResult> {
  // ファイルとして保存されていない文書（untitled など）は保存先を決められない
  if (document.uri.scheme !== "file") {
    return {
      success: false,
      error: "画像を保存するには、先に文書をファイルとして保存してください。",
    };
  }

  const extension = getExtensionFromMimeType(mimeType);
  if (extension === undefined) {
    return {
      success: false,
      error: `画像を保存できません。対応していない画像形式です: ${mimeType}`,
    };
  }

  try {
    // Base64データからバッファを作成
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // 保存先は文書と同じディレクトリ
    const saveDir = path.dirname(document.uri.fsPath);
    await fs.mkdir(saveDir, { recursive: true });

    const baseName = sanitizeImageBaseName(fileName);
    const uniqueFileName = generateUniqueFileName(saveDir, baseName, extension);
    const filePath = path.join(saveDir, uniqueFileName);

    // 最後の防御: 保存先ディレクトリの外には書き込まない
    if (!isDirectChild(saveDir, filePath)) {
      return {
        success: false,
        error: "画像を保存できません。保存先ディレクトリの外を指すファイル名です。",
      };
    }

    // 既存のファイルは上書きしない
    await fs.writeFile(filePath, buffer, { flag: "wx" });

    // ドキュメントからの相対パスを計算
    const relativePath = path.relative(saveDir, filePath).replace(/\\/g, "/");

    return {
      success: true,
      localPath: relativePath,
      markdownImage: `![image](${relativePath})`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `画像の保存に失敗しました: ${errorMessage}`,
    };
  }
}

/**
 * 受け取ったファイル名から、保存に使う名前（拡張子なし）を作る。
 * - OS に関係なく "/" と "\" を区切り文字とみなし、最後の要素だけを使う
 * - 拡張子を取り除く（拡張子は MIME タイプから決める）
 * - 使用できない文字と制御文字を "_" に置き換える
 * - 名前が残らない場合は "image" にする
 */
export function sanitizeImageBaseName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? "";
  const withoutExtension = lastSegment.replace(/\.[^.]+$/, "");
  // eslint-disable-next-line no-control-regex
  const replaced = withoutExtension.replace(/[<>:"|?*\u0000-\u001f\u007f]/g, "_").trim();
  if (replaced === "" || /^\.+$/.test(replaced)) {
    return DEFAULT_BASE_NAME;
  }
  return replaced.slice(0, MAX_BASE_NAME_LENGTH);
}

/**
 * target が dir の直下のファイルかどうか
 */
function isDirectChild(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return (
    relative !== "" &&
    !path.isAbsolute(relative) &&
    !relative.startsWith("..") &&
    path.dirname(relative) === "."
  );
}

/**
 * ユニークなファイル名を生成する
 */
function generateUniqueFileName(dir: string, baseName: string, extension: string): string {
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
 * MIMEタイプから拡張子を取得する（許可リストにない場合は undefined）
 */
function getExtensionFromMimeType(mimeType: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(MIME_TO_EXTENSION, mimeType)
    ? MIME_TO_EXTENSION[mimeType]
    : undefined;
}
