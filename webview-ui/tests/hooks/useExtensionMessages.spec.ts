/* eslint-disable @typescript-eslint/unbound-method */
import { ThemeSetting } from "@message/messageTypeToExtention";
import { ThemeKind } from "@message/messageTypeToWebview";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { useExtensionMessages } from "@/hooks/useExtensionMessages";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// debounceをモック（即座に実行）
vi.mock("@/utilities/debounce", () => ({
  debounce: (fn: () => void) => fn,
}));

describe("useExtensionMessages", () => {
  let vscodeThemeRef: React.RefObject<ThemeKind>;
  let baseUriRef: React.RefObject<string>;
  let documentDirRef: React.RefObject<string>;
  let setTheme: Mock<React.Dispatch<React.SetStateAction<ThemeKind>>>;
  let setThemeSetting: Mock<React.Dispatch<React.SetStateAction<ThemeSetting>>>;
  let updateMarkdownFromExtension: Mock<(text: string, isInit?: boolean) => void>;
  let messageHandler: ((event: MessageEvent) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    vscodeThemeRef = { current: "light" };
    baseUriRef = { current: "" };
    documentDirRef = { current: "" };
    setTheme = vi.fn<React.Dispatch<React.SetStateAction<ThemeKind>>>();
    setThemeSetting = vi.fn<React.Dispatch<React.SetStateAction<ThemeSetting>>>((callback) => {
      if (typeof callback === "function") {
        return callback("auto");
      }
      return callback;
    });
    updateMarkdownFromExtension = vi.fn<(text: string, isInit?: boolean) => void>();

    // windowのaddEventListenerをスパイしてハンドラをキャプチャ
    const originalAddEventListener = window.addEventListener;
    vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      if (type === "message") {
        messageHandler = handler as (event: MessageEvent) => void;
      }
      return originalAddEventListener.call(window, type, handler as EventListener);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    messageHandler = null;
  });

  it("マウント時にinitメッセージを送信すること", async () => {
    const { vscode } = await import("@/utilities/vscode");

    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "init",
    });
  });

  it("updateメッセージでupdateMarkdownFromExtensionが呼ばれること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "update",
              payload: "# Test Markdown",
            },
          })
        );
      }
    });

    expect(updateMarkdownFromExtension).toHaveBeenCalledWith("# Test Markdown", false);
  });

  it("initメッセージでisInit=trueでupdateMarkdownFromExtensionが呼ばれること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "init",
              payload: "# Initial Markdown",
            },
          })
        );
      }
    });

    expect(updateMarkdownFromExtension).toHaveBeenCalledWith("# Initial Markdown", true);
  });

  it("updateThemeメッセージでvscodeThemeRefが更新されること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "updateTheme",
              payload: "dark",
            },
          })
        );
      }
    });

    expect(vscodeThemeRef.current).toBe("dark");
  });

  it("updateThemeメッセージでthemeSettingがautoの場合、setThemeが呼ばれること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "updateTheme",
              payload: "dark",
            },
          })
        );
      }
    });

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("updateSettingsメッセージでthemeSettingが更新されること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "updateSettings",
              payload: {
                themeSetting: "dark" as ThemeSetting,
              },
            },
          })
        );
      }
    });

    expect(setThemeSetting).toHaveBeenCalledWith("dark");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("updateSettingsメッセージでthemeSettingがautoの場合、vscodeThemeRefの値が使われること", () => {
    vscodeThemeRef.current = "dark";

    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "updateSettings",
              payload: {
                themeSetting: "auto" as ThemeSetting,
              },
            },
          })
        );
      }
    });

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("documentInfoメッセージでbaseUriRefとdocumentDirRefが更新されること", () => {
    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "documentInfo",
              payload: {
                baseUri: "https://example.com/webview",
                dirPath: "/path/to/document",
              },
            },
          })
        );
      }
    });

    expect(baseUriRef.current).toBe("https://example.com/webview");
    expect(documentDirRef.current).toBe("/path/to/document");
  });

  it("不明なメッセージタイプでconsole.logが呼ばれること", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef,
        baseUriRef,
        documentDirRef,
        setTheme,
        setThemeSetting,
        updateMarkdownFromExtension,
      })
    );

    act(() => {
      if (messageHandler) {
        messageHandler(
          new MessageEvent("message", {
            data: {
              type: "unknownType",
            },
          })
        );
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith("Unknown command: unknownType");

    consoleSpy.mockRestore();
  });
});
