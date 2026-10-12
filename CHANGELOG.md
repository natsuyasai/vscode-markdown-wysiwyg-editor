# Change Log

「markdown-wysiwyg-editor」の主な変更点をこのファイルに記録します。

形式は [Keep a Changelog](http://keepachangelog.com/) に準拠します。

## [Unreleased]

## [0.1.1]

### 追加

- エクスポート（HTML / ブログ用HTML / PDF）でPlantUMLの図を画像として出力 (#26)

### 変更

- 開発依存のメジャー更新、katexを0.19系へ引き上げ (#16, #17)

### 修正

- Readonly表示のrehype-raw出力をrehype-sanitizeで無害化（XSS対策） (#19)
- 3-wayマージで、空行ではなく内容のある行で対応付けを行うように修正 (#24)

## [0.1.0]

issue #11（全体レビューに基づく不具合修正と仕様の整理）の内容です。

### 追加

- PlantUMLのjarのパスを指定する設定 `markdownWysiwygEditor.plantumlJarPath` を追加（jarは同梱しません）
- `javaPath` と `plantumlJarPath` を制限モード（信頼されていないワークスペース）で使用しない設定に変更
- PDFエクスポートでもMermaidを画像として出力
- 外部で文書が変更されたときの競合を知らせるバナーを追加
- PR用のCIとリリース用のワークフローを追加
- Gherkin（cucumber）によるテスト基盤を追加

### 変更

- WebViewでの編集をTextDocumentへ反映し、未保存の印（●）と閉じるときの確認が出るように変更。Cmd+S（macOS）でも保存
- 編集モードではYAMLフロントマターを非表示にして内容を保全（Readonlyでは表で表示）
- エクスポートでYAMLフロントマターを出力しないように変更。未保存の編集も出力に反映
- `customCssPaths` の相対パスを、文書が属するワークスペースフォルダ基準で解決
- Mermaidの `securityLevel` を `strict` に変更し、図のSVGをサニタイズ
- 設定の説明文を日本語に統一
- 依存関係を更新（脆弱性対応）

### 修正

- 編集後のモード切替・テーマ変更や、CRLFの文書で編集が失われる・改行コードが変わる問題
- 未編集の文書が保存で書き換わる問題。画像・リンクのパス（範囲外、日本語名、title付き、コードブロック内など）が保存で変化する問題
- WebViewからの保存が完了しない問題
- PlantUMLの再起動、Javaパス、文字化け、ポート設定の反映、応答待ちの上限
- 画像保存・ファイルを開く要求・WebViewメッセージの入力検証
- アウトラインのジャンプ（装飾付き見出し、setext見出し、フェンス内の `#` など）
- 購読の解除漏れ、nonceの生成、WebViewのタイトルと言語
