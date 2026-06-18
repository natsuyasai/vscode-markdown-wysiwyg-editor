import { describe, it, expect, vi } from "vitest";
import { scrollToHeadingInEditor } from "@/components/MilkdownEditor/scrollToHeading";
import type { HeadingItem } from "@/utilities/extractHeadings";

type ScrollMock = ReturnType<typeof vi.fn>;

function createContainer(levels: number[]): { container: HTMLElement; mocks: ScrollMock[] } {
  const container = document.createElement("div");
  const mocks = levels.map((level) => {
    const heading = document.createElement(`h${level}`);
    const mock = vi.fn();
    heading.scrollIntoView = mock;
    container.appendChild(heading);
    return mock;
  });
  return { container, mocks };
}

describe("scrollToHeadingInEditor", () => {
  it("該当インデックスの見出し要素のscrollIntoViewが{ behavior: 'smooth' }で呼ばれる", () => {
    const headings: HeadingItem[] = [
      { level: 1, text: "First", id: "first" },
      { level: 2, text: "Second", id: "second" },
      { level: 2, text: "Third", id: "third" },
    ];
    const { container, mocks } = createContainer([1, 2, 2]);

    scrollToHeadingInEditor(container, headings, "second");

    expect(mocks[1]).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(mocks[0]).not.toHaveBeenCalled();
    expect(mocks[2]).not.toHaveBeenCalled();
  });

  it("同名見出しが複数あってもidの連番で正しい順番の要素が選ばれる", () => {
    const headings: HeadingItem[] = [
      { level: 1, text: "Foo", id: "foo" },
      { level: 2, text: "Bar", id: "bar" },
      { level: 1, text: "Foo", id: "foo-1" },
    ];
    const { container, mocks } = createContainer([1, 2, 1]);

    scrollToHeadingInEditor(container, headings, "foo-1");

    expect(mocks[2]).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(mocks[0]).not.toHaveBeenCalled();
    expect(mocks[1]).not.toHaveBeenCalled();
  });

  it("containerがnullの場合はno-op（例外を投げない）", () => {
    const headings: HeadingItem[] = [{ level: 1, text: "First", id: "first" }];

    expect(() => scrollToHeadingInEditor(null, headings, "first")).not.toThrow();
  });

  it("idがheadingsに存在しない場合はno-op", () => {
    const headings: HeadingItem[] = [{ level: 1, text: "First", id: "first" }];
    const { container, mocks } = createContainer([1]);

    scrollToHeadingInEditor(container, headings, "unknown");

    expect(mocks[0]).not.toHaveBeenCalled();
  });

  it("headingsには存在するが対応するDOM要素が無い（インデックス範囲外）場合はno-op", () => {
    const headings: HeadingItem[] = [
      { level: 1, text: "First", id: "first" },
      { level: 2, text: "Second", id: "second" },
    ];
    const { container, mocks } = createContainer([1]);

    expect(() => scrollToHeadingInEditor(container, headings, "second")).not.toThrow();
    expect(mocks[0]).not.toHaveBeenCalled();
  });
});
