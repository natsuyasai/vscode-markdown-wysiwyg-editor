import fc from "fast-check";
import { describe, it, expect, vi } from "vitest";
import { scrollToHeadingInEditor } from "@/components/MilkdownEditor/scrollToHeading";
import type { HeadingItem } from "@/utilities/extractHeadings";

type ScrollMock = ReturnType<typeof vi.fn>;

const headingFieldsArbitrary = fc.record({
  level: fc.integer({ min: 1, max: 6 }),
  text: fc.string(),
});

const headingListArbitrary = fc
  .array(headingFieldsArbitrary, { minLength: 1, maxLength: 20 })
  .map((fields) => fields.map((field, index): HeadingItem => ({ ...field, id: `id-${index}` })));

function createContainer(headings: HeadingItem[]): {
  container: HTMLElement;
  mocks: ScrollMock[];
} {
  const container = document.createElement("div");
  const mocks = headings.map((heading) => {
    const element = document.createElement(`h${heading.level}`);
    const mock = vi.fn();
    element.scrollIntoView = mock;
    container.appendChild(element);
    return mock;
  });
  return { container, mocks };
}

describe("scrollToHeadingInEditor（プロパティベース）", () => {
  it("有効なidを渡すと対応インデックスの要素だけがsmoothでスクロールされる", () => {
    fc.assert(
      fc.property(
        headingListArbitrary.chain((headings) =>
          fc.record({
            headings: fc.constant(headings),
            index: fc.integer({ min: 0, max: headings.length - 1 }),
          })
        ),
        ({ headings, index }) => {
          const { container, mocks } = createContainer(headings);

          scrollToHeadingInEditor(container, headings, headings[index].id);

          expect(mocks[index]).toHaveBeenCalledTimes(1);
          expect(mocks[index]).toHaveBeenCalledWith({ behavior: "smooth" });
          mocks.forEach((mock, i) => {
            if (i !== index) {
              expect(mock).not.toHaveBeenCalled();
            }
          });
        }
      )
    );
  });

  it("どのidとも一致しないidを渡すとどの要素もスクロールされない", () => {
    fc.assert(
      fc.property(headingListArbitrary, (headings) => {
        const { container, mocks } = createContainer(headings);
        const absentId = `id-${headings.length}`;

        scrollToHeadingInEditor(container, headings, absentId);

        mocks.forEach((mock) => {
          expect(mock).not.toHaveBeenCalled();
        });
      })
    );
  });

  it("container=nullは常にno-op（例外を投げない）", () => {
    fc.assert(
      fc.property(headingListArbitrary, fc.string(), (headings, id) => {
        expect(() => scrollToHeadingInEditor(null, headings, id)).not.toThrow();
      })
    );
  });
});
