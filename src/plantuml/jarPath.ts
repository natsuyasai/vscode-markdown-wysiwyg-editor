import * as path from "path";
import { PlantUmlConfigurationError } from "./plantUmlErrors";

export const JAR_PATH_SETTING = "markdownWysiwygEditor.plantumlJarPath";
export const JAVA_PATH_SETTING = "markdownWysiwygEditor.javaPath";
export const PORT_SETTING = "markdownWysiwygEditor.plantumlServerPort";

/**
 * 設定 plantumlJarPath の値から、jarファイルの絶対パスを求める。
 *
 * - 絶対パスはそのまま使う
 * - `~`、`~/…`、`~\…` はホームディレクトリに展開する
 * - 未設定、相対パス、`${workspaceFolder}` などの変数はエラーにする
 */
export function resolveJarPath(rawValue: string, homedir: string): string {
  const value = rawValue.trim();
  if (!value) {
    throw new PlantUmlConfigurationError(
      `PlantUMLのjarファイルが設定されていません。設定 "${JAR_PATH_SETTING}" にplantuml.jarのパスを指定してください。`,
      JAR_PATH_SETTING
    );
  }

  if (value.includes("${")) {
    throw new PlantUmlConfigurationError(
      `設定 "${JAR_PATH_SETTING}" では \${workspaceFolder} などの変数は使えません。絶対パスで指定してください: ${value}`,
      JAR_PATH_SETTING
    );
  }

  if (value === "~") {
    return homedir;
  }
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(homedir, value.slice(2));
  }

  if (!path.isAbsolute(value)) {
    throw new PlantUmlConfigurationError(
      `設定 "${JAR_PATH_SETTING}" は絶対パスで指定してください: ${value}`,
      JAR_PATH_SETTING
    );
  }
  return value;
}
