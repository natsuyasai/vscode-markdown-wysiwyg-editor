import type { HeadingItem } from "@/utilities/extractHeadings";

export function scrollToHeadingInEditor(
  container: HTMLElement | null,
  headings: HeadingItem[],
  id: string
): void {
  if (container === null) {
    return;
  }

  const index = headings.findIndex((heading) => heading.id === id);
  if (index === -1) {
    return;
  }

  const headingElements = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const target = headingElements[index];
  if (target === undefined) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth" });
}
