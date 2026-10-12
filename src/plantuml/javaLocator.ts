import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * `where java`（Windows）/ `which java` の出力から、最初に見つかったパスを取り出す。
 *
 * 複数のJavaがPATHにある場合は1行に1つずつ出力される。
 * Windowsの改行コード（CRLF）を考慮し、前後の空白と改行コードを取り除く。
 */
export function parseJavaLocatorOutput(stdout: string): string | null {
  for (const line of stdout.split(/\r\n|\r|\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

/** Java実行ファイルの探索に使う依存（テストで差し替える） */
export interface JavaLocatorDeps {
  platform: string;
  env: Record<string, string | undefined>;
  existsSync: (filePath: string) => boolean;
  /** `where java` / `which java` を実行し、終了コードと標準出力を返す */
  runLocator: (command: string) => { status: number | null; stdout: string };
}

const defaultJavaLocatorDeps: JavaLocatorDeps = {
  platform: process.platform,
  env: process.env,
  existsSync: (filePath) => fs.existsSync(filePath),
  runLocator: (command) => {
    const result = child_process.spawnSync(command, ["java"], { encoding: "utf8" });
    return { status: result.status, stdout: result.stdout };
  },
};

/**
 * Java実行ファイルのパスを求める。
 * 設定（javaPath）→ 環境変数 JAVA_HOME → PATH の順に探す。
 */
export function resolveJavaPath(
  configuredPath: string,
  deps: JavaLocatorDeps = defaultJavaLocatorDeps
): string | null {
  if (configuredPath && deps.existsSync(configuredPath)) {
    return configuredPath;
  }

  const javaHome = deps.env["JAVA_HOME"];
  if (javaHome) {
    const pathApi = deps.platform === "win32" ? path.win32 : path.posix;
    const javaExe = pathApi.join(javaHome, "bin", deps.platform === "win32" ? "java.exe" : "java");
    if (deps.existsSync(javaExe)) {
      return javaExe;
    }
  }

  try {
    const result = deps.runLocator(deps.platform === "win32" ? "where" : "which");
    if (result.status === 0) {
      return parseJavaLocatorOutput(result.stdout);
    }
  } catch {
    // 探索コマンドが実行できない場合は見つからなかったものとして扱う
  }

  return null;
}
