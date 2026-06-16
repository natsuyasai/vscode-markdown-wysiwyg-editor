/* eslint-disable @typescript-eslint/unbound-method */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTheme } from "@/hooks/useTheme";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // bodyのdata-theme属性をリセット
    document.body.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態でlightテーマが設定されること", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(result.current.themeSetting).toBe("auto");
  });

  it("テーマがbodyのdata-theme属性に適用されること", () => {
    renderHook(() => useTheme());

    expect(document.body.getAttribute("data-theme")).toBe("light");
  });

  it("setThemeでテーマを変更できること", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
  });

  it("handleThemeSettingChangeでテーマ設定を変更できること", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.handleThemeSettingChange("dark");
    });

    expect(result.current.themeSetting).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("テーマ設定をlightに変更するとthemeもlightになること", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.handleThemeSettingChange("dark");
    });

    act(() => {
      result.current.handleThemeSettingChange("light");
    });

    expect(result.current.themeSetting).toBe("light");
    expect(result.current.theme).toBe("light");
  });

  it("テーマ設定をautoに変更するとvscodeThemeRefの値が使われること", () => {
    const { result } = renderHook(() => useTheme());

    // まずvscodeThemeRefをdarkに設定
    result.current.vscodeThemeRef.current = "dark";

    act(() => {
      result.current.handleThemeSettingChange("auto");
    });

    expect(result.current.themeSetting).toBe("auto");
    expect(result.current.theme).toBe("dark");
  });

  it("handleThemeSettingChangeがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.handleThemeSettingChange("dark");
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "saveSettings",
      payload: { themeSetting: "dark" },
    });
  });

  it("vscodeThemeRefが初期値lightを持つこと", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.vscodeThemeRef.current).toBe("light");
  });
});
