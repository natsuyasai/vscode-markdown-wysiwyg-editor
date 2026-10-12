import * as child_process from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import type { Readable } from "stream";
import * as vscode from "vscode";
import { collectBody } from "./collectBody";
import { encodePlantUml } from "./encoder";
import { JAR_PATH_SETTING, JAVA_PATH_SETTING, resolveJarPath } from "./jarPath";
import { resolveJavaPath } from "./javaLocator";
import { PlantUmlConfigurationError } from "./plantUmlErrors";

export interface PlantUmlRenderResult {
  svg?: string;
  error?: string;
}

/** PlantUMLサーバーの起動に使う設定値 */
export interface PlantUmlServerConfig {
  jarPath: string;
  javaPath: string;
  port: number;
}

/** PlantUMLサーバーのプロセスとして必要な最小限のインターフェース */
export interface PlantUmlProcess {
  readonly stderr: Readable | null;
  kill(): boolean;
  on(event: "close", listener: (code: number | null) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
}

/** HTTPリクエストの結果 */
export interface PlantUmlHttpResponse {
  statusCode: number | undefined;
  body: string;
}

/** 設定エラーの通知に使うUI（テストで差し替える） */
export interface PlantUmlNotificationUi {
  showErrorMessage(message: string, ...items: string[]): PromiseLike<string | undefined>;
  openSettings(settingKey: string): void;
}

/** 設定エラーの通知に表示するボタン */
export const OPEN_SETTINGS_ACTION = "設定を開く";

const vscodeNotificationUi: PlantUmlNotificationUi = {
  showErrorMessage: (message, ...items) => vscode.window.showErrorMessage(message, ...items),
  openSettings: (settingKey) => {
    void vscode.commands.executeCommand("workbench.action.openSettings", settingKey);
  },
};

/**
 * PlantUmlServerの依存（テストで差し替える）。
 * 省略した項目は実際の環境（vscode設定・child_process・fs・http）を使う。
 */
export interface PlantUmlServerOptions {
  getConfig?: () => PlantUmlServerConfig;
  spawn?: (command: string, args: string[]) => PlantUmlProcess;
  existsSync?: (filePath: string) => boolean;
  resolveJava?: (configuredJavaPath: string) => string | null;
  homedir?: () => string;
  /** サーバーがHTTPに応答できる状態か確認する */
  readinessProbe?: (port: number) => Promise<boolean>;
  /** SVGを取得するHTTPリクエスト */
  request?: (url: string, timeoutMs: number) => Promise<PlantUmlHttpResponse>;
  /** 起動待ちの上限（ミリ秒） */
  startupTimeoutMs?: number;
  /** 起動確認の間隔（ミリ秒） */
  readinessIntervalMs?: number;
  /** 描画リクエストの上限（ミリ秒） */
  requestTimeoutMs?: number;
  /** 設定エラーの通知に使うUI */
  notificationUi?: PlantUmlNotificationUi;
}

const HOST = "localhost";
const DEFAULT_STARTUP_TIMEOUT_MS = 30_000;
const DEFAULT_READINESS_INTERVAL_MS = 250;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

function readConfigFromVsCode(): PlantUmlServerConfig {
  const config = vscode.workspace.getConfiguration("markdownWysiwygEditor");
  return {
    jarPath: config.get<string>("plantumlJarPath", ""),
    javaPath: config.get<string>("javaPath", ""),
    port: config.get<number>("plantumlServerPort", 8888),
  };
}

function httpRequest(url: string, timeoutMs: number): Promise<PlantUmlHttpResponse> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      collectBody(response)
        .then((body) => {
          resolve({ statusCode: response.statusCode, body });
        })
        .catch(reject);
    });
    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("PlantUML render timeout"));
    });
  });
}

/** HTTPで何らかの応答が返れば、サーバーが起動済みとみなす */
function probeByHttp(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(`http://${HOST}:${String(port)}/`, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => {
      resolve(false);
    });
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RunningServer {
  process: PlantUmlProcess;
  config: PlantUmlServerConfig;
}

/**
 * PlantUMLサーバーを管理するクラス
 * picowebモードでローカルサーバーを起動し、SVGレンダリングを行う
 */
export class PlantUmlServer {
  private running: RunningServer | null = null;
  private startPromise: Promise<RunningServer> | null = null;
  /** 設定エラーを通知済みか（通知はセッション中に1回だけにする） */
  private configurationErrorNotified = false;

  private readonly getConfig: () => PlantUmlServerConfig;
  private readonly spawnProcess: (command: string, args: string[]) => PlantUmlProcess;
  private readonly existsSync: (filePath: string) => boolean;
  private readonly resolveJava: (configuredJavaPath: string) => string | null;
  private readonly homedir: () => string;
  private readonly readinessProbe: (port: number) => Promise<boolean>;
  private readonly request: (url: string, timeoutMs: number) => Promise<PlantUmlHttpResponse>;
  private readonly startupTimeoutMs: number;
  private readonly readinessIntervalMs: number;
  private readonly requestTimeoutMs: number;
  private readonly notificationUi: PlantUmlNotificationUi;

  constructor(options: PlantUmlServerOptions = {}) {
    this.getConfig = options.getConfig ?? readConfigFromVsCode;
    this.spawnProcess =
      options.spawn ??
      ((command, args) =>
        // 標準出力は使わないため捨てる（パイプのまま読まないとバッファが詰まる）
        child_process.spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] }));
    this.existsSync = options.existsSync ?? ((filePath) => fs.existsSync(filePath));
    this.resolveJava = options.resolveJava ?? ((configured) => resolveJavaPath(configured));
    this.homedir = options.homedir ?? (() => os.homedir());
    this.readinessProbe = options.readinessProbe ?? probeByHttp;
    this.request = options.request ?? httpRequest;
    this.startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
    this.readinessIntervalMs = options.readinessIntervalMs ?? DEFAULT_READINESS_INTERVAL_MS;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.notificationUi = options.notificationUi ?? vscodeNotificationUi;
  }

  /**
   * PlantUMLサーバーを起動する。起動済みであれば何もしない。
   * 起動に失敗した場合や、プロセスが終了した場合は、次の呼び出しで起動し直す。
   */
  async start(): Promise<void> {
    await this.ensureStarted();
  }

  private async ensureStarted(): Promise<RunningServer> {
    if (this.running) {
      return this.running;
    }
    if (!this.startPromise) {
      const startPromise = this.doStart().finally(() => {
        if (this.startPromise === startPromise) {
          this.startPromise = null;
        }
      });
      this.startPromise = startPromise;
    }
    return this.startPromise;
  }

  private async doStart(): Promise<RunningServer> {
    const config = this.getConfig();

    const jarPath = resolveJarPath(config.jarPath, this.homedir());
    if (!this.existsSync(jarPath)) {
      throw new PlantUmlConfigurationError(
        `PlantUMLのjarファイルが見つかりません: ${jarPath}。設定 "${JAR_PATH_SETTING}" を確認してください。`,
        JAR_PATH_SETTING
      );
    }

    const javaPath = this.resolveJava(config.javaPath);
    if (!javaPath) {
      throw new PlantUmlConfigurationError(
        `Javaが見つかりません。Java 11以降をインストールするか、設定 "${JAVA_PATH_SETTING}" にJavaの実行ファイルのパスを指定してください。`,
        JAVA_PATH_SETTING
      );
    }

    const serverProcess = this.spawnProcess(javaPath, [
      "-jar",
      jarPath,
      `-picoweb:${String(config.port)}`,
    ]);
    const running: RunningServer = { process: serverProcess, config };

    let errorOutput = "";
    serverProcess.stderr?.on("data", (data: Buffer | string) => {
      errorOutput += data.toString();
    });

    let exitError: Error | null = null;
    serverProcess.on("error", (error) => {
      exitError = new Error(`PlantUMLサーバーを起動できませんでした: ${error.message}`);
    });
    serverProcess.on("close", (code) => {
      exitError ??= new Error(
        `PlantUMLサーバーが終了コード${String(code)}で終了しました: ${errorOutput.trim()}`
      );
      if (this.running === running) {
        this.running = null;
      }
    });

    await this.waitUntilReady(config.port, serverProcess, () => exitError);
    this.running = running;
    return running;
  }

  /**
   * サーバーがHTTPに応答するまで待つ。
   * 上限までに応答がない場合はプロセスを停止し、起動失敗とする。
   */
  private async waitUntilReady(
    port: number,
    serverProcess: PlantUmlProcess,
    getExitError: () => Error | null
  ): Promise<void> {
    const deadline = Date.now() + this.startupTimeoutMs;
    for (;;) {
      const errorBeforeProbe = getExitError();
      if (errorBeforeProbe) {
        throw errorBeforeProbe;
      }
      const ready = await this.readinessProbe(port);
      const errorAfterProbe = getExitError();
      if (errorAfterProbe) {
        throw errorAfterProbe;
      }
      if (ready) {
        return;
      }
      if (Date.now() >= deadline) {
        serverProcess.kill();
        throw new Error(
          `PlantUMLサーバーの起動を確認できませんでした（${String(this.startupTimeoutMs / 1000)}秒）。`
        );
      }
      await delay(this.readinessIntervalMs);
    }
  }

  /**
   * PlantUMLサーバーを停止する
   */
  stop(): void {
    if (this.running) {
      this.running.process.kill();
      this.running = null;
    }
  }

  /**
   * PlantUMLコードをSVGにレンダリングする
   * @param code PlantUMLコード
   * @returns レンダリング結果
   */
  async render(code: string): Promise<PlantUmlRenderResult> {
    try {
      const running = await this.ensureStarted();

      const encoded = encodePlantUml(code);
      const url = `http://${HOST}:${String(running.config.port)}/svg/${encoded}`;
      const response = await this.request(url, this.requestTimeoutMs);
      if (response.statusCode === 200) {
        return { svg: response.body };
      }
      return { error: `PlantUML server returned status ${String(response.statusCode)}` };
    } catch (error) {
      if (error instanceof PlantUmlConfigurationError) {
        this.notifyConfigurationErrorOnce(error);
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { error: errorMessage };
    }
  }

  /**
   * 設定の誤りを「設定を開く」ボタン付きで通知する。
   * 描画のたびに通知しないよう、セッション中に1回だけにする（エラーはプレビューにも表示される）。
   */
  private notifyConfigurationErrorOnce(error: PlantUmlConfigurationError): void {
    if (this.configurationErrorNotified) {
      return;
    }
    this.configurationErrorNotified = true;
    void this.notificationUi
      .showErrorMessage(error.message, OPEN_SETTINGS_ACTION)
      .then((selected) => {
        if (selected === OPEN_SETTINGS_ACTION) {
          this.notificationUi.openSettings(error.settingKey);
        }
      });
  }

  /**
   * サーバーが起動しているかどうか
   */
  get isRunning(): boolean {
    return this.running !== null;
  }
}

// シングルトンインスタンス
let plantUmlServerInstance: PlantUmlServer | null = null;

/**
 * PlantUMLサーバーのシングルトンインスタンスを取得する
 */
export function getPlantUmlServer(): PlantUmlServer {
  plantUmlServerInstance ??= new PlantUmlServer();
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
