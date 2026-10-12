import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * PDFエクスポート用の一時HTMLを書き出し、後片付けする。
 *
 * 一時HTMLは、エクスポートのたびに専用の一時フォルダ（OSの一時フォルダ直下）へ書き出す。
 * 同じ名前の文書同士でも、前のエクスポート結果を上書きしない。
 * 削除するのは、この関数で書き出したものだけ。
 * ブラウザが読み込み中の一時HTMLを消さないよう、開いた直後には削除しない。
 * 前のエクスポートの一時HTMLは次のエクスポート時に、残りは拡張機能の終了時に削除する。
 */

const TEMP_DIR_PREFIX = "markdown-wysiwyg-editor-pdf-";

/** 書き出した一時フォルダ（この中の一時HTMLだけを削除対象にする） */
const writtenDirs = new Set<string>();

/** ファイル名に使えない文字を置き換える */
function toSafeFileName(title: string): string {
  const invalidChars = '<>:"/' + String.fromCharCode(92) + "|?*";
  const safe = Array.from(title, (char) =>
    char.charCodeAt(0) < 0x20 || invalidChars.includes(char) ? "_" : char
  )
    .join("")
    .trim();
  return safe === "" ? "document" : safe;
}

/**
 * 前回までに書き出した一時HTMLを削除してから、新しい一時HTMLを書き出し、そのパスを返す。
 * @param tempRoot 一時フォルダの場所（省略時はOSの一時フォルダ）
 */
export function writePdfTempHtml(
  html: string,
  title: string,
  tempRoot: string = os.tmpdir()
): string {
  cleanupPdfTempHtml();
  const dir = fs.mkdtempSync(path.join(tempRoot, TEMP_DIR_PREFIX));
  writtenDirs.add(dir);
  const filePath = path.join(dir, `${toSafeFileName(title)}_export.html`);
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

/** これまでに書き出した一時HTMLを削除する（削除できないものは無視する） */
export function cleanupPdfTempHtml(): void {
  for (const dir of writtenDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 一時ファイルの後片付けの失敗は、エクスポートの成否に影響させない
    }
  }
  writtenDirs.clear();
}
