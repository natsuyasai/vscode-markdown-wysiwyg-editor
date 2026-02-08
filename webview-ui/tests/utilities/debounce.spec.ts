import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "../../src/utilities/debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("指定時間後に関数が実行される", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("デフォルトの待機時間は500msである", () => {
    const fn = vi.fn();
    const debounced = debounce(fn);

    debounced();

    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("連続呼び出し時に最後の呼び出しのみ実行される", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("連続呼び出し時に最後の引数で実行される", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("first");
    debounced("second");
    debounced("third");

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("待機時間内の呼び出しでタイマーがリセットされる", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("十分な間隔を空けた呼び出しはそれぞれ実行される", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("複数の引数が正しく渡される", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced("arg1", 42, true);

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith("arg1", 42, true);
  });
});
