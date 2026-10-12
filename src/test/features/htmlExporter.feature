# language: ja
機能: エクスポート用のMarkdownからHTMLへの変換
  HTML/PDFエクスポートでは、MarkdownをHTMLに変換する。
  WebViewで描画済みのMermaid図は、コードブロックの代わりに画像として埋め込む。

  シナリオ: 見出しと段落がHTML要素に変換される
    前提 次のMarkdown:
      """
      # タイトル

      本文の段落です。
      """
    もし HTMLに変換する
    ならば HTMLに"<h1>タイトル</h1>"が含まれる
    かつ HTMLに"<p>本文の段落です。</p>"が含まれる

  シナリオ: 描画済みのMermaid図は画像として埋め込まれる
    前提 次のMarkdown:
      """
      ```mermaid
      graph TD;
      A-->B;
      ```
      """
    かつ 次のMermaidコードには画像"data:image/png;base64,AAAA"が対応している:
      """
      graph TD;
      A-->B;
      """
    もし HTMLに変換する
    ならば HTMLに"<img src=\"data:image/png;base64,AAAA\" alt=\"mermaid diagram\""が含まれる
    かつ HTMLに"language-mermaid"が含まれない

  シナリオ: 画像が対応していないMermaid図はコードブロックのまま出力される
    前提 次のMarkdown:
      """
      ```mermaid
      graph LR;
      X-->Y;
      ```
      """
    かつ 次のMermaidコードには画像"data:image/png;base64,AAAA"が対応している:
      """
      graph TD;
      A-->B;
      """
    もし HTMLに変換する
    ならば HTMLに"<code class=\"language-mermaid\">"が含まれる
    かつ HTMLに"<img"が含まれない
