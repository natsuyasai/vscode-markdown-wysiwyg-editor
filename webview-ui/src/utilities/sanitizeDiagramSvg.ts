import DOMPurify from "dompurify";

/** foreignObject内のラベルに使われるHTML要素（HTML統合点の内側でのみ解釈される） */
const FOREIGN_OBJECT_HTML_TAGS = ["div", "span", "p", "br", "b", "i", "em", "strong", "code"];

/** `<use>`の参照先は同一文書内の断片（`#id`）だけに限定する */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.nodeName.toLowerCase() !== "use") return;
  for (const name of ["href", "xlink:href"]) {
    const value = node.getAttribute(name);
    if (value !== null && !value.trim().startsWith("#")) {
      node.removeAttribute(name);
    }
  }
});

/**
 * 図（Mermaid / PlantUML）のSVG文字列を無害化する。
 *
 * CSPによる制限に加えた多層防御として、スクリプトとして実行される要素・属性
 * （script要素、イベントハンドラ属性、javascriptスキームのリンクなど）を取り除く。
 * 図の描画に必要なstyle・defs・marker・use・foreignObject内のラベルは保持する。
 *
 * DOMへ挿入する直前（配色の置換などの文字列加工のあと）に呼び出すこと。
 */
export function sanitizeDiagramSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["foreignObject", "use", ...FOREIGN_OBJECT_HTML_TAGS],
    ADD_ATTR: ["dominant-baseline"],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
  });
}
