import * as path from "path";

/** パス操作の実装（path.posix / path.win32 など） */
export type PathApi = typeof path.posix;

// ローカルファイルリンク用のカスタムスキーム（WebView側と同じ値）
export const LOCAL_FILE_SCHEME = "vscode-local-file";

// 同じファイルを指す別表記（./a.png と a.png など）を区別するためのクエリ名
const VARIANT_QUERY_NAME = "wysiwyg-variant";

/**
 * パス変換が依存する環境。
 * vscode.Webview や fs に直接依存せず注入することで、純粋関数としてテストできるようにする。
 */
export interface PathConversionEnv {
  /** 文書のディレクトリ（絶対パス） */
  documentDir: string;
  /** WebViewから画像の読み込みを許可するディレクトリ（絶対パス）。文書ディレクトリとワークスペースフォルダ */
  allowedRoots: readonly string[];
  /** 絶対パスをWebView URI文字列に変換する（webview.asWebviewUri 相当） */
  toWebviewUri: (fsPath: string) => string;
  /** ファイルが存在するか */
  exists: (fsPath: string) => boolean;
  /** パス操作（既定は実行環境の path。テストで posix/win32 を切り替える） */
  pathApi?: PathApi;
}

type DestinationKind = "image" | "link";

/**
 * 「元の表記」と「表示用のURI」の対応表。
 * WebViewが送り返すテキストには、過去の変換で生成した表示用URIが残りうるため、
 * パネルごとに1つ保持し、変換のたびに追記していく。
 */
export class DisplayPathRegistry {
  private readonly notationToDisplay = new Map<string, string>();
  private readonly displayToNotation = new Map<string, string>();

  /** 元の表記に対応する表示用URIを登録し、一意な表示用URIを返す */
  register(kind: DestinationKind, notation: string, baseDisplay: string): string {
    const key = `${kind}:${notation}`;
    const existing = this.notationToDisplay.get(key);
    if (existing !== undefined) {
      return existing;
    }
    let candidate = baseDisplay;
    let variant = 2;
    while (this.displayToNotation.has(candidate)) {
      candidate = withVariantQuery(baseDisplay, variant);
      variant++;
    }
    this.notationToDisplay.set(key, candidate);
    this.displayToNotation.set(candidate, notation);
    return candidate;
  }

  /** 表示用URIから元の表記を引く */
  lookup(display: string): string | undefined {
    return this.displayToNotation.get(display);
  }

  /** 登録済みの表示用URI（長いものから順） */
  displays(): string[] {
    return [...this.displayToNotation.keys()].sort((a, b) => b.length - a.length);
  }
}

function withVariantQuery(uri: string, variant: number): string {
  const hashIndex = uri.indexOf("#");
  const body = hashIndex === -1 ? uri : uri.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : uri.slice(hashIndex);
  const separator = body.includes("?") ? "&" : "?";
  return `${body}${separator}${VARIANT_QUERY_NAME}=${String(variant)}${hash}`;
}

function stripVariantQuery(uri: string): string {
  return uri.replace(new RegExp(`[?&]${VARIANT_QUERY_NAME}=\\d+`), "");
}

/** 括弧をエンコードし、エディタの再シリアライズで括弧がエスケープされないようにする */
function encodeParentheses(uri: string): string {
  return uri.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

// ===== Markdownの走査 =====

interface Range {
  start: number;
  end: number;
}

interface Destination {
  kind: DestinationKind;
  /** 宛先トークン（<...> を含む）の開始位置と終了位置 */
  start: number;
  end: number;
  raw: string;
}

/** フロントマターの範囲を求める（文書先頭の --- から次の --- または ... まで） */
function findFrontmatterEnd(lines: string[]): number {
  if (lines.length === 0 || lines[0].replace(/\r$/, "") !== "---") {
    return -1;
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (line === "---" || line === "...") {
      return i;
    }
  }
  return -1;
}

/** フロントマター・フェンスコードブロック・インラインコードの範囲を求める（変換の対象外） */
function findExcludedRanges(markdown: string): Range[] {
  const ranges: Range[] = [];
  const lines = markdown.split("\n");
  let offset = 0;
  let lineIndex = 0;

  const frontmatterEnd = findFrontmatterEnd(lines);
  if (frontmatterEnd !== -1) {
    for (let i = 0; i <= frontmatterEnd; i++) {
      offset += lines[i].length + 1;
    }
    ranges.push({ start: 0, end: offset - 1 });
    lineIndex = frontmatterEnd + 1;
  }

  let fence: { char: string; length: number; start: number } | null = null;
  for (; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset = lineEnd + 1;

    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line.replace(/\r$/, ""));
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.char &&
        fenceMatch[1].length >= fence.length &&
        fenceMatch[2].trim() === ""
      ) {
        ranges.push({ start: fence.start, end: lineEnd });
        fence = null;
      }
      continue;
    }
    if (fenceMatch && !(fenceMatch[1][0] === "`" && fenceMatch[2].includes("`"))) {
      fence = { char: fenceMatch[1][0], length: fenceMatch[1].length, start: lineStart };
      continue;
    }
    ranges.push(...findInlineCodeRanges(line, lineStart));
  }
  if (fence) {
    // 閉じられていないフェンスは文書末尾まで続く
    ranges.push({ start: fence.start, end: markdown.length });
  }
  return ranges;
}

function findInlineCodeRanges(line: string, lineStart: number): Range[] {
  const ranges: Range[] = [];
  const runPattern = /`+/g;
  const runs: { index: number; length: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = runPattern.exec(line)) !== null) {
    runs.push({ index: match.index, length: match[0].length });
  }
  for (let i = 0; i < runs.length; i++) {
    const opening = runs[i];
    const closingIndex = runs.findIndex((run, j) => j > i && run.length === opening.length);
    if (closingIndex === -1) {
      continue;
    }
    const closing = runs[closingIndex];
    ranges.push({
      start: lineStart + opening.index,
      end: lineStart + closing.index + closing.length,
    });
    i = closingIndex;
  }
  return ranges;
}

function isExcluded(position: number, ranges: Range[]): boolean {
  return ranges.some((range) => position >= range.start && position < range.end);
}

/** `<...>` 形式の宛先の終端（`>` の次の位置）を返す。成立しなければ -1 */
function scanAngleDestination(markdown: string, start: number): number {
  let i = start + 1;
  while (i < markdown.length && markdown[i] !== ">") {
    if (markdown[i] === "\n" || markdown[i] === "<") {
      return -1;
    }
    i += markdown[i] === "\\" ? 2 : 1;
  }
  return markdown[i] === ">" ? i + 1 : -1;
}

/** 括弧の対応を考慮した宛先の終端を返す。成立しなければ -1 */
function scanBareDestination(markdown: string, start: number): number {
  let i = start;
  let depth = 0;
  while (i < markdown.length) {
    const char = markdown[i];
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (/\s/.test(char)) {
      break;
    }
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      if (depth === 0) {
        break;
      }
      depth--;
    }
    i++;
  }
  return depth === 0 ? i : -1;
}

/** タイトル（"..." / '...' / (...)）を読み飛ばした位置を返す。タイトルがなければそのまま */
function skipTitle(markdown: string, start: number): number {
  const open = markdown[start];
  if (open !== '"' && open !== "'" && open !== "(") {
    return start;
  }
  const close = open === "(" ? ")" : open;
  let i = start + 1;
  while (i < markdown.length && markdown[i] !== close) {
    i += markdown[i] === "\\" ? 2 : 1;
  }
  return markdown[i] === close ? i + 1 : -1;
}

function skipSpaces(markdown: string, start: number): number {
  let i = start;
  while (i < markdown.length && (markdown[i] === " " || markdown[i] === "\t")) {
    i++;
  }
  return i;
}

/**
 * `(` の直後から宛先とタイトルを読み取り、宛先トークンの範囲を返す。
 * インラインリンクとして成立しない場合は null。
 */
function parseDestination(markdown: string, openParen: number): Range | null {
  const start = skipSpaces(markdown, openParen + 1);
  const end =
    markdown[start] === "<"
      ? scanAngleDestination(markdown, start)
      : scanBareDestination(markdown, start);
  if (end === -1 || end === start) {
    return null;
  }
  const afterTitle = skipTitle(markdown, skipSpaces(markdown, end));
  if (afterTitle === -1) {
    return null;
  }
  return markdown[skipSpaces(markdown, afterTitle)] === ")" ? { start, end } : null;
}

/** コード・フロントマターの外にあるインラインの画像・リンクの宛先を列挙する */
function findDestinations(markdown: string): Destination[] {
  const excluded = findExcludedRanges(markdown);
  const destinations: Destination[] = [];
  const pattern = /(!?)\[([^\]\n]*)\]\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    if (isExcluded(match.index, excluded)) {
      continue;
    }
    if (match.index > 0 && markdown[match.index - 1] === "\\") {
      continue;
    }
    const openParen = match.index + match[0].length - 1;
    const range = parseDestination(markdown, openParen);
    if (!range) {
      continue;
    }
    destinations.push({
      kind: match[1] === "!" ? "image" : "link",
      start: range.start,
      end: range.end,
      raw: markdown.slice(range.start, range.end),
    });
    pattern.lastIndex = range.end;
  }
  return destinations;
}

function replaceDestinations(
  markdown: string,
  replacer: (destination: Destination) => string | undefined
): string {
  let result = "";
  let cursor = 0;
  for (const destination of findDestinations(markdown)) {
    const replacement = replacer(destination);
    if (replacement === undefined) {
      continue;
    }
    result += markdown.slice(cursor, destination.start) + replacement;
    cursor = destination.end;
  }
  return result + markdown.slice(cursor);
}

// ===== 表示用への変換 =====

function hasScheme(value: string): boolean {
  // Windowsのドライブレター（C:\ や C:/）はスキームとみなさない
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) && !/^[a-zA-Z]:[\\/]/.test(value);
}

function unwrapAngle(raw: string): string {
  return raw.startsWith("<") && raw.endsWith(">") ? raw.slice(1, -1) : raw;
}

function unescapeBackslashes(value: string): string {
  return value.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/** 宛先の表記から、存在するファイルの絶対パスを求める */
function resolveExistingPath(target: string, env: PathConversionEnv): string | undefined {
  const pathApi = env.pathApi ?? path;
  const candidates = [target];
  const decoded = safeDecode(target);
  if (decoded !== undefined && decoded !== target) {
    candidates.push(decoded);
  }
  for (const candidate of candidates) {
    const absolutePath = pathApi.resolve(env.documentDir, candidate);
    if (env.exists(absolutePath)) {
      return absolutePath;
    }
  }
  return undefined;
}

/** 絶対パスが、許可したディレクトリのいずれかの中にあるか */
export function isWithinRoots(
  fsPath: string,
  roots: readonly string[],
  pathApi: PathApi = path
): boolean {
  return roots.some((root) => {
    const relative = pathApi.relative(root, fsPath);
    return relative === "" || (!relative.startsWith("..") && !pathApi.isAbsolute(relative));
  });
}

/**
 * Markdown内のローカル画像を表示用のURIに、ローカルファイルへのリンクをカスタムスキームURIに変換する。
 * - コードブロック・インラインコード・フロントマターの中は変換しない
 * - 画像は、読み込みを許可したディレクトリの中にあるものだけを変換する（外の画像は表記をそのまま残す）
 * - 変換した宛先は registry に登録し、restorePathsFromDisplay で元の表記へ正確に戻せるようにする
 */
export function convertPathsForDisplay(
  markdown: string,
  env: PathConversionEnv,
  registry: DisplayPathRegistry
): string {
  const pathApi = env.pathApi ?? path;
  return replaceDestinations(markdown, (destination) => {
    const value = unescapeBackslashes(unwrapAngle(destination.raw));
    if (value.startsWith("#") || hasScheme(value)) {
      return undefined;
    }
    if (destination.kind === "image") {
      const absolutePath = resolveExistingPath(value, env);
      if (!absolutePath || !isWithinRoots(absolutePath, env.allowedRoots, pathApi)) {
        return undefined;
      }
      const display = encodeParentheses(env.toWebviewUri(absolutePath));
      return registry.register("image", destination.raw, display);
    }
    const hashIndex = value.indexOf("#");
    const filePart = hashIndex === -1 ? value : value.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? "" : value.slice(hashIndex);
    if (!filePart) {
      return undefined;
    }
    const absolutePath = resolveExistingPath(filePart, env);
    if (!absolutePath) {
      return undefined;
    }
    const display = encodeParentheses(
      `${LOCAL_FILE_SCHEME}:${encodeURIComponent(absolutePath)}${anchor}`
    );
    return registry.register("link", destination.raw, display);
  });
}

// ===== 表示用から元の表記への復元 =====

/** 相対パスをMarkdownの宛先表記にする（空白や括弧を含む場合は <...> で囲む） */
function formatNotation(relativePath: string): string {
  return /[\s()<>]/.test(relativePath) ? `<${relativePath}>` : relativePath;
}

function toRelativePath(absolutePath: string, env: PathConversionEnv): string {
  const pathApi = env.pathApi ?? path;
  const relative = pathApi.relative(env.documentDir, absolutePath).split(pathApi.sep).join("/");
  return relative || ".";
}

function restoreLocalFileUri(value: string, env: PathConversionEnv): string | undefined {
  const body = stripVariantQuery(value.slice(LOCAL_FILE_SCHEME.length + 1));
  const hashIndex = body.indexOf("#");
  const encodedPath = hashIndex === -1 ? body : body.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : body.slice(hashIndex);
  const absolutePath = safeDecode(encodedPath);
  if (absolutePath === undefined) {
    return undefined;
  }
  return formatNotation(toRelativePath(absolutePath, env) + anchor);
}

/** 登録されていない表示用URI（アップロードした画像など）を、文書からの相対パスへ復元する */
function restoreUnregistered(value: string, env: PathConversionEnv): string | undefined {
  if (value.startsWith(`${LOCAL_FILE_SCHEME}:`)) {
    return restoreLocalFileUri(value, env);
  }
  const pathApi = env.pathApi ?? path;
  for (const root of [env.documentDir, ...env.allowedRoots]) {
    const base = encodeParentheses(env.toWebviewUri(root)).replace(/\/?$/, "/");
    if (!value.startsWith(base)) {
      continue;
    }
    const rest = stripVariantQuery(value.slice(base.length)).split(/[?#]/)[0];
    const segments = rest.split("/").map((segment) => safeDecode(segment));
    if (segments.some((segment) => segment === undefined)) {
      return undefined;
    }
    const absolutePath = pathApi.join(root, ...(segments as string[]));
    return formatNotation(toRelativePath(absolutePath, env));
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 登録済みの表示用URIを、文書のどこにあっても元の表記へ戻す。
 * 編集でコードブロックの境界が変わっても戻し漏れが起きないよう、Markdownの構造は見ずに置き換える。
 * エディタが表示用URIを <...> で囲んだ場合も、囲みごと元の表記に戻す。
 */
function restoreRegistered(markdown: string, registry: DisplayPathRegistry): string {
  const displays = registry.displays();
  if (displays.length === 0) {
    return markdown;
  }
  const alternatives = displays.map(escapeRegExp).join("|");
  const pattern = new RegExp(`<(${alternatives})>|(?<=^|[(\\s])(${alternatives})(?=$|[)\\s])`, "g");
  return markdown.replace(pattern, (match, wrapped?: string, bare?: string) => {
    return registry.lookup(wrapped ?? bare ?? "") ?? match;
  });
}

/**
 * convertPathsForDisplay で生成した表示用のURIを、元の表記に戻す。
 * 登録済みの表示用URIは登録時の表記へそのまま戻すため、変換して戻すと元の文字列に一致する。
 * 登録されていない表示用URI（アップロードした画像など）は、文書からの相対パスに戻す。
 */
export function restorePathsFromDisplay(
  markdown: string,
  env: PathConversionEnv,
  registry: DisplayPathRegistry
): string {
  return replaceDestinations(restoreRegistered(markdown, registry), (destination) =>
    restoreUnregistered(unwrapAngle(destination.raw), env)
  );
}
