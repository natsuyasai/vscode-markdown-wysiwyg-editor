/**
 * scrollIntoView の呼び出しを記録する。
 * 短い文書では全見出しが最初から画面内にあり、表示位置ではジャンプ先の誤りを検出できないため、
 * 「どの要素に対して scrollIntoView が呼ばれたか」で判定する。
 */
let scrolled: Element[] = [];
let originalDescriptor: PropertyDescriptor | undefined;

export function installScrollSpy(): void {
  scrolled = [];
  originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: function (this: Element) {
      scrolled.push(this);
    },
  });
}

export function restoreScrollSpy(): void {
  if (originalDescriptor) {
    Object.defineProperty(Element.prototype, "scrollIntoView", originalDescriptor);
    originalDescriptor = undefined;
  }
}

export function scrolledElements(): readonly Element[] {
  return scrolled;
}
