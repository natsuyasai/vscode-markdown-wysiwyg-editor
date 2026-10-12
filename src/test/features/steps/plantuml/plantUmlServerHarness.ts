import { EventEmitter } from "events";
import * as http from "http";
import type { AddressInfo } from "net";
import * as net from "net";
import * as path from "path";
import { PassThrough } from "stream";
import {
  PlantUmlServer,
  type PlantUmlHttpResponse,
  type PlantUmlProcess,
  type PlantUmlRenderResult,
  type PlantUmlServerConfig,
} from "../../../../plantuml/plantUmlServer";

/** featureで扱うPlantUMLのサンプル図 */
export const SAMPLE_PLANTUML_CODE = "@startuml\nA -> B\n@enduml";

/** テスト用のホームディレクトリ */
export const FAKE_HOME_DIR = path.resolve("/home/plantuml-tester");

/** child_process.spawnの代わりに使う、PlantUMLサーバーの偽プロセス */
export class FakePlantUmlProcess extends EventEmitter implements PlantUmlProcess {
  readonly stderr = new PassThrough();
  killed = false;

  constructor(
    readonly command: string,
    readonly args: string[]
  ) {
    super();
  }

  kill(): boolean {
    if (!this.killed) {
      this.killed = true;
      setImmediate(() => this.emit("close", null));
    }
    return true;
  }

  /** プロセスが自ら終了したことにする */
  exit(code: number, stderr?: string): void {
    if (stderr) {
      this.stderr.write(stderr);
    }
    setImmediate(() => this.emit("close", code));
  }
}

/** 起動直後のプロセスの振る舞い */
type SpawnBehavior = { kind: "normal" } | { kind: "exit"; code: number; stderr: string };

/**
 * PlantUmlServerを差し替えた依存で動かすためのテスト用ハーネス。
 * シナリオごとに1つ作り、設定やプロセスの振る舞いを変えながら検証する。
 */
export class PlantUmlServerHarness {
  config: PlantUmlServerConfig = { jarPath: "", javaPath: "", port: 8888 };
  readonly existingFiles = new Set<string>();
  javaPath: string | null = null;
  ready = false;
  response: PlantUmlHttpResponse = { statusCode: 200, body: "" };
  /** trueのときは差し替えずに実際のHTTPリクエストを使う */
  useRealHttpRequest = false;
  /** trueのときは差し替えずに実際のポート確認を使う */
  useRealPortCheck = false;
  spawnBehavior: SpawnBehavior = { kind: "normal" };
  startupTimeoutMs = 200;
  readonly processes: FakePlantUmlProcess[] = [];
  readonly requestedUrls: string[] = [];
  result?: PlantUmlRenderResult;
  concurrentResults: PlantUmlRenderResult[] = [];
  /** 表示されたエラー通知（メッセージとボタン） */
  readonly notifications: { message: string; items: string[] }[] = [];
  /** 通知で利用者が選ぶボタン（undefinedなら閉じる） */
  notificationChoice: string | undefined;
  readonly openedSettings: string[] = [];

  private server?: PlantUmlServer;
  private readonly openedServers: net.Server[] = [];

  getServer(): PlantUmlServer {
    this.server ??= new PlantUmlServer({
      getConfig: () => ({ ...this.config }),
      existsSync: (filePath) => this.existingFiles.has(filePath),
      resolveJava: () => this.javaPath,
      homedir: () => FAKE_HOME_DIR,
      spawn: (command, args) => {
        const fakeProcess = new FakePlantUmlProcess(command, args);
        this.processes.push(fakeProcess);
        const behavior = this.spawnBehavior;
        if (behavior.kind === "exit") {
          fakeProcess.exit(behavior.code, behavior.stderr);
        }
        return fakeProcess;
      },
      isPortAvailable: this.useRealPortCheck ? undefined : () => Promise.resolve(true),
      readinessProbe: () => Promise.resolve(this.ready),
      request: this.useRealHttpRequest
        ? undefined
        : (url) => {
            this.requestedUrls.push(url);
            return Promise.resolve(this.response);
          },
      startupTimeoutMs: this.startupTimeoutMs,
      readinessIntervalMs: 10,
      requestTimeoutMs: 1_000,
      notificationUi: {
        showErrorMessage: (message, ...items) => {
          this.notifications.push({ message, items });
          return Promise.resolve(this.notificationChoice);
        },
        openSettings: (settingKey) => {
          this.openedSettings.push(settingKey);
        },
      },
    });
    return this.server;
  }

  async render(code: string = SAMPLE_PLANTUML_CODE): Promise<void> {
    this.result = await this.getServer().render(code);
  }

  lastProcess(): FakePlantUmlProcess {
    const last = this.processes.at(-1);
    if (!last) {
      throw new Error("PlantUMLサーバーのプロセスが1回も起動されていません");
    }
    return last;
  }

  /** localhostの空いているポートで待ち受け、そのポート番号を返す */
  async listenOnFreePort(server: net.Server): Promise<number> {
    this.openedServers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
    return (server.address() as AddressInfo).port;
  }

  /**
   * SVGを返すHTTPスタブを起動し、ポート設定をそのポートにする。
   * 本文はUTF-8の1バイトずつ、間隔を空けて書き込む（チャンクの境界でマルチバイト文字を分割する）。
   */
  async startHttpStubSplittingBytes(svg: string): Promise<void> {
    const bytes = Buffer.from(svg, "utf8");
    const stub = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      let index = 0;
      const writeNext = (): void => {
        if (index >= bytes.length) {
          response.end();
          return;
        }
        response.write(bytes.subarray(index, index + 1));
        index++;
        setTimeout(writeNext, 1);
      };
      writeNext();
    });
    this.useRealHttpRequest = true;
    this.ready = true;
    this.config.port = await this.listenOnFreePort(stub);
  }

  /** 他のプロセスがポートを使用している状態にし、ポート設定をそのポートにする */
  async occupyConfiguredPort(): Promise<void> {
    this.useRealPortCheck = true;
    this.config.port = await this.listenOnFreePort(net.createServer((socket) => socket.end()));
  }

  async dispose(): Promise<void> {
    this.server?.stop();
    await Promise.all(
      this.openedServers.map(
        (server) =>
          new Promise<void>((resolve) =>
            server.close(() => {
              resolve();
            })
          )
      )
    );
  }
}
