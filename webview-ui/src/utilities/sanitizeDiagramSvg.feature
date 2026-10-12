# language: ja
機能: 図のSVGの無害化
  MermaidやPlantUMLが出力したSVGを画面に挿入する前に無害化する。
  CSPによる制限に加えた多層防御として、描画結果にスクリプトとして実行される要素や属性を残さない。
  一方で、図の見た目に必要な要素・属性・テキストは変化させない。

  シナリオ: 図の描画に必要な要素と属性は保持される
    前提 次の図のSVG:
      """
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="mermaid-1" class="flowchart" viewBox="0 0 120 60">
        <style>#mermaid-1 .node rect{fill:#ECECFF;stroke:#9370DB;}</style>
        <defs><marker id="arrowhead" viewBox="0 0 10 10"><path d="M0,0 L10,5 L0,10 z"></path></marker></defs>
        <g class="node"><rect width="40" height="20" fill="#eaeaea" stroke="#666"></rect><text x="5" y="12" dominant-baseline="middle">開始</text></g>
        <path class="edge" d="M40,10 L80,10" marker-end="url(#arrowhead)"></path>
        <use xlink:href="#arrowhead"></use>
      </svg>
      """
    もし 図のSVGを無害化する
    ならば 無害化した図のSVGに次の要素が残っている:
      | セレクタ                            |
      | svg#mermaid-1.flowchart[viewBox]    |
      | style                               |
      | defs > marker#arrowhead > path      |
      | g.node > rect[fill="#eaeaea"]       |
      | text[dominant-baseline="middle"]    |
      | path.edge[marker-end]               |
      | use                                 |
    かつ 無害化した図のSVGのテキストに"開始"が含まれる
    かつ 無害化した図のSVGのスタイルに"fill:#ECECFF"が含まれる

  シナリオ: foreignObject内のラベルは要素ごと保持される
    前提 次の図のSVG:
      """
      <svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="80" height="20"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">ラベル</span></div></foreignObject></svg>
      """
    もし 図のSVGを無害化する
    ならば 無害化した図のSVGに次の要素が残っている:
      | セレクタ                       |
      | foreignObject div span.nodeLabel |
    かつ 無害化した図のSVGのテキストに"ラベル"が含まれる

  シナリオアウトライン: 描画結果にスクリプトとして実行される要素や属性が含まれない（<種類>）
    前提 次の図のSVG:
      """
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g class="node"><text>安全なラベル</text></g><断片></svg>
      """
    もし 図のSVGを無害化する
    ならば 無害化した図のSVGにスクリプトとして実行される要素や属性が含まれない
    かつ 無害化した図のSVGのテキストに"安全なラベル"が含まれる

    例:
      | 種類                         | 断片                                                                                                           |
      | script要素                   | <script>window.__diagramSvgExecuted = true</script>                                                            |
      | イベントハンドラ属性         | <rect width="10" height="10" onload="window.__diagramSvgExecuted = true"></rect>                               |
      | javascriptスキームのリンク   | <a href="javascript:window.__diagramSvgExecuted = true"><text>link</text></a>                                  |
      | xlink:hrefのjavascriptスキーム | <a xlink:href="javascript:window.__diagramSvgExecuted = true"><text>link</text></a>                          |
      | アニメーションによる属性書き換え | <a><animate attributeName="href" values="javascript:window.__diagramSvgExecuted = true"></animate><text>x</text></a> |
      | foreignObject内のHTMLのイベント | <foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="window.__diagramSvgExecuted = true"></div></foreignObject> |
      | foreignObject内のiframe      | <foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" srcdoc="&lt;script&gt;parent.__diagramSvgExecuted = true&lt;/script&gt;"></iframe></foreignObject> |

  シナリオ: SVGとして解釈できない文字列でもスクリプトとして実行される要素は含まれない
    前提 次の図のSVG:
      """
      </svg><script>window.__diagramSvgExecuted = true</script><svg>
      """
    もし 図のSVGを無害化する
    ならば 無害化した図のSVGにスクリプトとして実行される要素や属性が含まれない

  シナリオ: useの参照先は同一文書内の断片だけに限定される
    前提 次の図のSVG:
      """
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><g id="shape"><rect width="5" height="5"></rect></g></defs><use xlink:href="#shape"></use><use xlink:href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="></use><use href="https://example.com/a.svg#x"></use></svg>
      """
    もし 図のSVGを無害化する
    ならば 無害化した図のSVGのuse要素の参照先はすべて"#"で始まる
