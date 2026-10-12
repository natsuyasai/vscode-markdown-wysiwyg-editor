import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderPlantUmlToPng } from "@/utilities/plantUmlToPng";

const postMessageMock = vi.fn<(message: unknown) => void>();

vi.mock("@/utilities/vscode", () => ({
  vscode: { postMessage: (message: unknown) => postMessageMock(message) },
}));

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

interface RenderRequest {
  type: string;
  payload: { code: string; requestId: string };
}

function lastRequest(): RenderRequest {
  const calls = postMessageMock.mock.calls;
  return calls[calls.length - 1][0] as RenderRequest;
}

function respond(payload: { requestId: string; svg?: string; error?: string }): void {
  window.dispatchEvent(new MessageEvent("message", { data: { type: "plantUmlResult", payload } }));
}

describe("renderPlantUmlToPng", () => {
  beforeEach(() => {
    postMessageMock.mockReset();
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,PNG");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("拡張機能へ描画を要求し、返ってきたSVGをPNGのdata URIにして返すこと", async () => {
    const promise = renderPlantUmlToPng("@startuml\nA -> B\n@enduml");

    const request = lastRequest();
    expect(request.type).toBe("renderPlantUml");
    expect(request.payload.code).toBe("@startuml\nA -> B\n@enduml");
    respond({ requestId: request.payload.requestId, svg: '<svg width="10" height="10"></svg>' });

    await expect(promise).resolves.toBe("data:image/png;base64,PNG");
  });

  it("エラー応答の場合はnullを返すこと", async () => {
    const promise = renderPlantUmlToPng("@startuml\n@enduml");

    respond({ requestId: lastRequest().payload.requestId, error: "jar not found" });

    await expect(promise).resolves.toBeNull();
  });

  it("別のrequestIdの応答では完了しないこと", async () => {
    vi.useFakeTimers();
    const promise = renderPlantUmlToPng("@startuml\n@enduml", { timeoutMs: 1000 });
    const settled = vi.fn();
    void promise.then(settled);

    respond({ requestId: "someone-else", svg: "<svg></svg>" });
    await vi.advanceTimersByTimeAsync(10);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBeNull();
  });

  it("応答が来ない場合は上限時間でnullを返すこと", async () => {
    vi.useFakeTimers();
    const promise = renderPlantUmlToPng("@startuml\n@enduml", { timeoutMs: 500 });

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toBeNull();
  });

  it("SVGのscript要素は除去してから画像化すること", async () => {
    const sources: string[] = [];
    class CapturingImage extends MockImage {
      set src(value: string) {
        sources.push(value);
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", CapturingImage);
    const promise = renderPlantUmlToPng("@startuml\n@enduml");

    respond({
      requestId: lastRequest().payload.requestId,
      svg: '<svg width="10" height="10"><script>alert(1)</script><rect width="1" height="1"/></svg>',
    });
    await promise;

    const decoded = decodeURIComponent(escape(atob(sources[0].split(",")[1])));
    expect(decoded).not.toContain("<script");
    expect(decoded).toContain("<rect");
  });

  it("canvasのコンテキストが取得できない場合はnullを返すこと", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const promise = renderPlantUmlToPng("@startuml\n@enduml");

    respond({ requestId: lastRequest().payload.requestId, svg: "<svg></svg>" });

    await expect(promise).resolves.toBeNull();
  });
});
