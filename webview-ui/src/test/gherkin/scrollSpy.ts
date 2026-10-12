/**
 * scrollIntoView の呼び出しを記録する。
 * 短い文書では全見出しが最初から画面内にあり、表示位置ではジャンプ先の誤りを検出できないため、
 * 「どの要素に対して scrollIntoView が呼ばれたか」で判定する。
 */
let scrolled: Element[] = [];
let original: typeof Element.prototype.scrollIntoView | undefined;

export function installScrollSpy(): void {
  scrolled = [];
  original = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
}

export function restoreScrollSpy(): void {
  if (original) {
    Element.prototype.scrollIntoView = original;
    original = undefined;
  }
}

export function scrolledElements(): readonly Element[] {
  return scrolled;
}
