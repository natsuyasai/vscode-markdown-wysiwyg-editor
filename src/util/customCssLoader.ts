import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface CustomCssResult {
  css: string;
  errors: string[];
}

export function loadCustomCss(paths: string[]): CustomCssResult {
  const cssChunks: string[] = [];
  const errors: string[] = [];

  for (const rawPath of paths) {
    const trimmed = rawPath.trim();
    if (trimmed === "") {
      continue;
    }

    const resolvedPath = resolveHomePath(trimmed);

    try {
      if (!fs.existsSync(resolvedPath)) {
        errors.push(`CSSファイルが見つかりません: ${resolvedPath}`);
        continue;
      }
      const content = fs.readFileSync(resolvedPath, "utf-8");
      cssChunks.push(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`CSSファイルの読み込みに失敗しました: ${resolvedPath} (${message})`);
    }
  }

  return {
    css: cssChunks.join("\n"),
    errors,
  };
}

function resolveHomePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
