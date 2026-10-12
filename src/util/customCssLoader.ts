import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface CustomCssResult {
  css: string;
  errors: string[];
}

export interface CustomCssResolveOptions {
  /**
   * 相対パスの基準ディレクトリ（文書が属するワークスペースフォルダ）。
   * 指定しない場合、相対パスは解決できないものとしてエラーにする。
   */
  baseDir?: string;
  /** "~" を展開するホームディレクトリ（省略時は os.homedir()） */
  homeDir?: string;
}

type ResolveResult = { path: string; error?: undefined } | { path?: undefined; error: string };

/**
 * カスタムCSSのパスを解決する。
 * - 絶対パスはそのまま使う
 * - "~" 単独、"~/"、"~\" で始まるパスはホームディレクトリを基準にする
 * - それ以外の相対パスは baseDir を基準にする（baseDir がなければエラー）
 */
export function resolveCustomCssPath(
  rawPath: string,
  options: CustomCssResolveOptions = {}
): ResolveResult {
  const trimmed = rawPath.trim();
  const homeDir = options.homeDir ?? os.homedir();

  if (trimmed === "~") {
    return { path: homeDir };
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return { path: path.join(homeDir, trimmed.slice(2)) };
  }
  if (path.isAbsolute(trimmed)) {
    return { path: trimmed };
  }
  if (options.baseDir === undefined) {
    return {
      error: `相対パスを解決できません（文書がワークスペースフォルダに属していません）: ${trimmed}`,
    };
  }
  return { path: path.resolve(options.baseDir, trimmed) };
}

/**
 * カスタムCSSファイルの監視対象（ディレクトリとファイル名）を求める。
 * 読み込みと同じ規則で解決し、解決できない場合は undefined を返す。
 */
export function getCustomCssWatchTarget(
  rawPath: string,
  options: CustomCssResolveOptions = {}
): { baseDir: string; fileName: string } | undefined {
  if (rawPath.trim() === "") {
    return undefined;
  }
  const resolved = resolveCustomCssPath(rawPath, options);
  if (resolved.path === undefined) {
    return undefined;
  }
  return { baseDir: path.dirname(resolved.path), fileName: path.basename(resolved.path) };
}

export function loadCustomCss(
  paths: string[],
  options: CustomCssResolveOptions = {}
): CustomCssResult {
  const cssChunks: string[] = [];
  const errors: string[] = [];

  for (const rawPath of paths) {
    if (rawPath.trim() === "") {
      continue;
    }

    const resolved = resolveCustomCssPath(rawPath, options);
    if (resolved.path === undefined) {
      errors.push(resolved.error);
      continue;
    }
    const resolvedPath = resolved.path;

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
