/* eslint-disable @typescript-eslint/unbound-method */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useLinkHandler } from "@/hooks/useLinkHandler";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

describe("useLinkHandler", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it("アンカーリンクのクリックでscrollIntoViewが呼ばれること", () => {
    // ターゲット要素を作成
    const targetElement = document.createElement("h2");
    targetElement.id = "test-section";
    targetElement.textContent = "Test Section";
    container.appendChild(targetElement);

    // リンクを作成
    const link = document.createElement("a");
    link.href = "#test-section";
    link.textContent = "Go to section";
    container.appendChild(link);

    // scrollIntoViewをモック
    const scrollIntoViewMock = vi.fn();
    targetElement.scrollIntoView = scrollIntoViewMock;

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      link.click();
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("カスタムスキームリンクのクリックでpostMessageが呼ばれること", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // リンクを作成
    const link = document.createElement("a");
    link.href = "vscode-local-file:%2Fpath%2Fto%2Ffile.md";
    link.textContent = "Open file";
    container.appendChild(link);

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      link.click();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "openFile",
      payload: {
        filePath: "/path/to/file.md",
        anchor: undefined,
      },
    });
  });

  it("カスタムスキームリンクにアンカーが含まれる場合、アンカーも渡されること", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // リンクを作成
    const link = document.createElement("a");
    link.href = "vscode-local-file:%2Fpath%2Fto%2Ffile.md#section";
    link.textContent = "Open file with anchor";
    container.appendChild(link);

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      link.click();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "openFile",
      payload: {
        filePath: "/path/to/file.md",
        anchor: "#section",
      },
    });
  });

  it("通常のリンクのクリックでは何も起こらないこと", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // 外部リンクを作成
    const link = document.createElement("a");
    link.href = "https://example.com";
    link.textContent = "External link";
    container.appendChild(link);

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
    });

    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  it("アンカーリンクでIDが見つからない場合、見出しテキストで検索されること", () => {
    // ターゲット見出し要素を作成（IDなし）
    const targetElement = document.createElement("h2");
    targetElement.textContent = "my-section";
    container.appendChild(targetElement);

    // リンクを作成
    const link = document.createElement("a");
    link.href = "#my-section";
    link.textContent = "Go to section";
    container.appendChild(link);

    // scrollIntoViewをモック
    const scrollIntoViewMock = vi.fn();
    targetElement.scrollIntoView = scrollIntoViewMock;

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      link.click();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("hookがアンマウントされたときにイベントリスナーが削除されること", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // リンクを作成
    const link = document.createElement("a");
    link.href = "vscode-local-file:%2Fpath%2Fto%2Ffile.md";
    link.textContent = "Open file";
    container.appendChild(link);

    const { unmount } = renderHook(() => useLinkHandler());

    // アンマウント前はイベントが処理される
    act(() => {
      link.click();
    });
    expect(vscode.postMessage).toHaveBeenCalled();

    // アンマウント
    unmount();
    vi.clearAllMocks();

    // アンマウント後はイベントが処理されない
    act(() => {
      link.click();
    });
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  it("リンク以外の要素のクリックでは何も起こらないこと", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // divを作成
    const div = document.createElement("div");
    div.textContent = "Not a link";
    container.appendChild(div);

    renderHook(() => useLinkHandler());

    // クリックイベントをシミュレート
    act(() => {
      div.click();
    });

    expect(vscode.postMessage).not.toHaveBeenCalled();
  });
});
