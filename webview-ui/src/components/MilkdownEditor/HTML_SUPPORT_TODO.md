# HTMLサポート実装メモ

## 現状

MilkdownエディタでHTMLタグをレンダリングする機能を実装済み。CommonMark仕様に基づくブロックレベルHTMLタグを含む多くのHTMLが正しくレンダリングされる。

## 実装済みのファイル

### htmlPlugin.ts
- `htmlSchema`: すべてのHTML用のProseMirrorノード定義（`html`スキーマを上書き）
- `htmlBlockSchema`: 後方互換性のためのスキーマ（現在は使用されない）
- `isBlockHtml()`: HTMLがブロックレベルかどうかを判定する関数
- `createHtmlElement()`: HTMLを安全にDOM要素に変換する関数
- `BLOCK_TAGS`: CommonMark仕様に基づくブロックレベルHTML要素のセット
- `VOID_ELEMENTS`: void要素（br, hr, imgなど）のセット

### MilkdownEditor.tsx
- `htmlSchema`と`htmlBlockSchema`をCrepeエディタに追加
- `crepe.editor.use(htmlSchema).use(htmlBlockSchema)` でプラグインを登録

## 動作確認済みの機能

### インラインHTML
- `<strong>`, `<b>` → 太字として表示 ✓
- `<em>`, `<i>` → イタリックとして表示 ✓
- `<u>` → 下線として表示 ✓
- `<s>`, `<del>` → 取り消し線として表示 ✓
- `<code>` → インラインコードとして表示 ✓
- `<a href="...">` → リンクとして表示 ✓
- `<span>` → スパン要素として表示 ✓

### ブロックHTML
- `<div>` → スタイル（背景色、パディング、角丸等）が適用 ✓
- `<p>` → 段落として表示、スタイル適用 ✓
- `<details>` / `<summary>` → 折りたたみ要素として表示 ✓
- `<table>` → テーブルとして表示 ✓
- `<blockquote>` → 引用として表示 ✓
- `<pre>` → 整形済みテキストとして表示 ✓
- `<ul>`, `<ol>`, `<li>` → リストとして表示 ✓
- `<h1>` ~ `<h6>` → 見出しとして表示 ✓
- `<hr>` → 水平線として表示 ✓
- `<iframe>` → 埋め込みフレームとして表示 ✓

### void要素
- `<img>` → 画像として表示 ✓
- `<hr>` → 水平線として表示 ✓
- `<input>` → 入力要素として表示 ✓

## 既知の制限事項

1. **`<br>` タグ（インライン）**
   - 段落内の`<br>`タグが改行として機能しない
   - remarkがテキストと`<br>`を単一のノードとして解析するため
   - 回避策: 改行が必要な場合は`<br>`の代わりにMarkdownの改行構文（行末の2スペースまたは`\`）を使用

2. **インラインスタイルの一部**
   - `<span style="color: red;">` などの一部のインラインスタイルが反映されない場合がある
   - ブラウザのセキュリティポリシーによる制限の可能性

## 技術的な実装詳細

### CommonMark仕様に基づくブロック要素判定
以下のタグをブロックレベルとして判定:
- CommonMark Type 6タグ: address, article, aside, blockquote, details, dialog, div, dl, fieldset, figure, footer, form, h1-h6, header, hr, li, main, menu, nav, ol, p, pre, section, summary, table, ul など
- CommonMark Type 1タグ: pre, script, style, textarea
- HTMLコメント、処理命令、DOCTYPE、CDATA

### void要素の特別処理
br, hr, img, input などのvoid要素は、template要素を使用してパースし、直接DOM要素として返す。

### template要素によるHTML解析
HTMLコンテンツは`<template>`要素を使用して安全にパースされ、XSS攻撃のリスクを軽減。

## テスト用ストーリー

`stories/MilkdownEditor.stories.tsx`に以下のストーリーを追加済み:
- `HtmlTagsLight`: Lightテーマでの HTMLレンダリング確認
- `HtmlTagsDark`: Darkテーマでの HTMLレンダリング確認

## 更新日

2026-01-27
