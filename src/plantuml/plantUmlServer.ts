import * as child_process from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as vscode from "vscode";
import { encodePlantUml } from "./encoder";

export interface PlantUmlRenderResult {
  svg?: string;
  error?: string;
}

/**
 * PlantUMLサーバーを管理するクラス
 * picowebモードでローカルサーバーを起動し、SVGレンダリングを行う
 */
export class PlantUmlServer {
  private serverProcess: child_process.ChildProcess | null = null;
  private port: number;
  private isStarted = false;
  private startPromise: Promise<void> | null = null;

  constructor(private extensionPath: string) {
    const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
    this.port = config.get<number>("plantumlServerPort", 8888);
  }

  /**
   * Javaの実行可能ファイルパスを取得する
   */
  private getJavaPath(): string | null {
    const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
    const configuredPath = config.get<string>("javaPath");

    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    // JAVA_HOMEから探す
    const javaHome = process.env["JAVA_HOME"];
    if (javaHome) {
      const javaExe =
        process.platform === "win32"
          ? path.join(javaHome, "bin", "java.exe")
          : path.join(javaHome, "bin", "java");
      if (fs.existsSync(javaExe)) {
        return javaExe;
      }
    }

    // PATHから探す（コマンドが存在することを確認）
    try {
      const result = child_process.spawnSync(
        process.platform === "win32" ? "where" : "which",
        ["java"],
        { encoding: "utf8" }
      );
      if (result.status === 0 && result.stdout.trim()) {
        return result.stdout.trim().split("\n")[0];
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * PlantUMLサーバーを起動する
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.doStart();
    return this.startPromise;
  }

  private async doStart(): Promise<void> {
    const javaPath = this.getJavaPath();
    if (!javaPath) {
      throw new Error(
        "Java not found. Please install Java 11 or later, or set the javaPath in settings."
      );
    }

    const jarPath = path.join(this.extensionPath, "resources", "plantuml.jar");
    if (!fs.existsSync(jarPath)) {
      throw new Error(
        `PlantUML JAR not found at ${jarPath}. Please ensure the extension is properly installed.`
      );
    }

    return new Promise((resolve, reject) => {
      const args = ["-jar", jarPath, "-picoweb:" + String(this.port)];

      this.serverProcess = child_process.spawn(javaPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let startupOutput = "";
      let errorOutput = "";

      const timeout = setTimeout(() => {
        // サーバーが起動したと仮定
        this.isStarted = true;
        resolve();
      }, 3000);

      this.serverProcess.stdout?.on("data", (data: Buffer) => {
        startupOutput += data.toString();
        // サーバーが起動したことを示すメッセージを検出
        if (startupOutput.includes("Starting PlantUML Picoweb")) {
          clearTimeout(timeout);
          this.isStarted = true;
          resolve();
        }
      });

      this.serverProcess.stderr?.on("data", (data: Buffer) => {
        errorOutput += data.toString();
      });

      this.serverProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start PlantUML server: ${error.message}`));
      });

      this.serverProcess.on("close", (code) => {
        if (!this.isStarted) {
          clearTimeout(timeout);
          reject(
            new Error(
              `PlantUML server exited with code ${String(code)}. Error: ${errorOutput}`
            )
          );
        }
        this.isStarted = false;
        this.serverProcess = null;
      });
    });
  }

  /**
   * PlantUMLサーバーを停止する
   */
  stop(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isStarted = false;
    }
  }

  /**
   * PlantUMLコードをSVGにレンダリングする
   * @param code PlantUMLコード
   * @returns レンダリング結果
   */
  async render(code: string): Promise<PlantUmlRenderResult> {
    try {
      await this.start();

      // PlantUMLエンコード
      const encoded = encodePlantUml(code);
      const url = `http://localhost:${String(this.port)}/svg/${encoded}`;

      return await new Promise((resolve) => {
        const request = http.get(url, (response) => {
          let data = "";

          response.on("data", (chunk: string) => {
            data += chunk;
          });

          response.on("end", () => {
            if (response.statusCode === 200) {
              resolve({ svg: data });
            } else {
              resolve({
                error: `PlantUML server returned status ${String(response.statusCode)}`,
              });
            }
          });
        });

        request.on("error", (error) => {
          resolve({ error: `Failed to connect to PlantUML server: ${error.message}` });
        });

        request.setTimeout(30000, () => {
          request.destroy();
          resolve({ error: "PlantUML render timeout" });
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { error: errorMessage };
    }
  }

  /**
   * サーバーが起動しているかどうか
   */
  get isRunning(): boolean {
    return this.isStarted;
  }
}

// シングルトンインスタンス
let plantUmlServerInstance: PlantUmlServer | null = null;

/**
 * PlantUMLサーバーのシングルトンインスタンスを取得する
 */
export function getPlantUmlServer(extensionPath: string): PlantUmlServer {
  if (!plantUmlServerInstance) {
    plantUmlServerInstance = new PlantUmlServer(extensionPath);
  }
  return plantUmlServerInstance;
}

/**
 * PlantUMLサーバーを停止してインスタンスを破棄する
 */
export function disposePlantUmlServer(): void {
  if (plantUmlServerInstance) {
    plantUmlServerInstance.stop();
    plantUmlServerInstance = null;
  }
}
