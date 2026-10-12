/**
 * 図のSVGなどから、スクリプトとして実行される要素や属性
 * （script等の要素、イベントハンドラ属性、javascriptスキームの値）を検出する。
 * Gherkinのstep定義（jsdom / ブラウザ）で共有する。
 */
const FORBIDDEN_TAGS = ["script", "iframe", "object", "embed", "animate", "set"];

export function findExecutableMarkup(root: Element): string[] {
  const found: string[] = [];
  const elements = [root, ...root.querySelectorAll("*")];
  for (const element of elements) {
    if (FORBIDDEN_TAGS.includes(element.localName.toLowerCase())) {
      found.push(`<${element.localName}>`);
    }
    for (const attr of element.attributes) {
      if (/^on/i.test(attr.name)) {
        found.push(`${element.localName}[${attr.name}]`);
      }
      if (/^\s*javascript:/i.test(attr.value)) {
        found.push(`${element.localName}[${attr.name}=javascript:]`);
      }
    }
  }
  return found;
}
