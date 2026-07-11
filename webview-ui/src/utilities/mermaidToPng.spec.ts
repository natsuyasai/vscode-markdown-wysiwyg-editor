import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderMermaidToPng } from "@/utilities/mermaidToPng";

/** `mermaid.initialize`に渡される設定のうち、テストで検証したい最小限の形 */
interface MermaidInitConfig {
  theme: string;
}

const renderMock =
  vi.fn<(id: string, text: string, container?: Element) => Promise<{ svg: string }>>();
const initializeMock = vi.fn<(config: MermaidInitConfig) => void>();

vi.mock("mermaid", () => ({
  default: {
    initialize: (config: MermaidInitConfig) => initializeMock(config),
    render: (id: string, text: string, container?: Element) => renderMock(id, text, container),
  },
}));

/** テスト用のImageモック。srcセット時に非同期でonload/onerrorを発火する */
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  static shouldFail = false;

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (MockImage.shouldFail) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

function containerCount(): number {
  return document.body.querySelectorAll('[id^="mermaid-container-"]').length;
}

/** `HTMLCanvasElement.prototype.getContext`をスパイし、戻り値を差し替え可能にする */
function spyOnGetContext(returnValue: CanvasRenderingContext2D | null) {
  return vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(returnValue);
}

describe("renderMermaidToPng", () => {
  let drawImage: ReturnType<typeof vi.fn>;
  let toDataURL: ReturnType<typeof vi.fn>;
  let getContext: ReturnType<typeof spyOnGetContext>;

  beforeEach(() => {
    MockImage.shouldFail = false;
    vi.stubGlobal("Image", MockImage);

    drawImage = vi.fn();
    getContext = spyOnGetContext({ drawImage } as unknown as CanvasRenderingContext2D);
    toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,xxxx");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    renderMock.mockReset();
    initializeMock.mockReset();
    document.body.innerHTML = "";
  });

  it("mermaid.renderが成功する場合、PNGのdata URIを返す", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"><text>A</text></svg>' });

    const result = await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(result).toBe("data:image/png;base64,xxxx");
    expect(toDataURL).toHaveBeenCalledWith("image/png");
  });

  it("初期化とレンダリングにテーマを渡す", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });

    await renderMermaidToPng("graph TD\nA-->B", "dark");

    expect(initializeMock).toHaveBeenCalledTimes(1);
    const [config] = initializeMock.mock.calls[0];
    expect(config.theme).toBe("dark");
  });

  it("SVGのwidth/heightから2倍スケールでcanvasに描画する", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });

    await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(drawImage).toHaveBeenCalledTimes(1);
    const args = drawImage.mock.calls[0] as unknown[];
    expect(args[3]).toBe(200); // width * 2
    expect(args[4]).toBe(100); // height * 2
  });

  it("width/heightが無くviewBoxのみの場合はviewBoxからサイズを決定する", async () => {
    renderMock.mockResolvedValue({ svg: '<svg viewBox="0 0 120 80"></svg>' });

    await renderMermaidToPng("graph TD\nA-->B", "light");

    const args = drawImage.mock.calls[0] as unknown[];
    expect(args[3]).toBe(240); // 120 * 2
    expect(args[4]).toBe(160); // 80 * 2
  });

  it("mermaid.renderが失敗した場合はnullを返す", async () => {
    renderMock.mockRejectedValue(new Error("invalid syntax"));

    const result = await renderMermaidToPng("invalid", "light");

    expect(result).toBeNull();
  });

  it("画像の読み込みに失敗した場合はnullを返す", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });
    MockImage.shouldFail = true;

    const result = await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(result).toBeNull();
  });

  it("canvasコンテキストが取得できない場合はnullを返す", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });
    getContext.mockReturnValue(null);

    const result = await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(result).toBeNull();
  });

  it("成功時、一時コンテナがDOMに残らない", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });

    await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(containerCount()).toBe(0);
  });

  it("失敗時（mermaid.render例外）も一時コンテナがDOMに残らない", async () => {
    renderMock.mockRejectedValue(new Error("boom"));

    await renderMermaidToPng("invalid", "light");

    expect(containerCount()).toBe(0);
  });

  it("失敗時（画像読み込み失敗）も一時コンテナがDOMに残らない", async () => {
    renderMock.mockResolvedValue({ svg: '<svg width="100" height="50"></svg>' });
    MockImage.shouldFail = true;

    await renderMermaidToPng("graph TD\nA-->B", "light");

    expect(containerCount()).toBe(0);
  });
});
