# VSCode Markdown WYSIWYG Editor

Visual Studio Code用のMarkdown WYSIWYGエディタ拡張機能です。

## 概要

Milkdown（Crepe）を使用したリッチなMarkdownエディタで、従来のテキストベースのMarkdown編集とは異なり、WYSIWYGスタイルでの直感的な編集が可能です。読み取り専用（Readonly）表示にはreact-markdownを使用します。

## 主要機能

- **WYSIWYG編集**: Milkdown（Crepe）を使用した直感的なMarkdown編集
- **Readonlyモード**: ツールバーのボタンで編集モードと読み取り専用の表示を切り替えます。Readonlyの表示はreact-markdownで描画し、画像の貼り付けとドロップは無効になります
- **アウトライン**: 見出しの一覧をサイドバーに表示し、クリックで該当の見出しへジャンプします（編集モード、Readonlyの両方）
- **フロントマター**: 文書先頭のYAMLフロントマターを、Readonlyでは表の形で表示します。編集モードでは表示せず、内容はそのまま保全されます（編集しても保存時に変化しません）
- **エクスポート**: エディタ上の右クリックメニューから実行します。未保存の編集も出力に反映され、エクスポートしても文書は保存されません。YAMLフロントマターは出力に含まれません
  - HTML
  - ブログ用HTML（`markdownWysiwygEditor.blogExport.useShadowDom` でShadow DOMによるスタイル分離を選べます）
  - PDF（印刷用のHTMLをブラウザで開き、ブラウザの印刷機能でPDFとして保存します）
- **カスタムCSS**: `markdownWysiwygEditor.customCssPaths` で指定したCSSを、エディタ、プレビュー、HTML/PDFエクスポートに適用します
- **キーボードショートカット**: Ctrl+S（macOSではCmd+S）で保存、Undo、Redoなどの基本操作
- **画像サポート**:
  - ドラッグ&ドロップまたはペーストで画像を挿入
  - Markdownファイルと同じディレクトリに保存し、相対パスを自動生成（ファイルとして保存されていない文書では、先に文書を保存する必要があります）
  - ワークスペースフォルダまたは文書のディレクトリ内の画像は、相対パス・絶対パスのどちらでも表示できます
- **ダイアグラムサポート**:
  - Mermaidのプレビュー表示・編集（HTML/ブログ用HTML/PDFのエクスポートでは画像として出力）
  - PlantUMLのプレビュー表示・編集（ローカルのPlantUMLサーバーで動作。JavaとPlantUMLのjarが必要です。後述の「PlantUMLの準備」を参照）
- **テーマ対応**: VSCodeのテーマに自動追従（light/dark）。設定で固定することもできます

## 保存の動作

- WebView上で編集すると、少し間を置いてVS Codeの文書に反映され、タブに未保存の印（●）が表示されます
- Ctrl+S（macOSではCmd+S）で保存します。メニューの「ファイル > 保存」でも保存できます。`files.autoSave` を有効にしている場合は、VS Codeの自動保存として動作します
- 未保存の変更があるタブを閉じようとすると、VS Codeが保存するかどうかを確認します
- 編集していない文書を保存しても、ファイルの内容は変化しません。改行コード（CRLF/LF）も文書に合わせて保たれます
- 文書が外部（別のエディタなど）で変更された場合は、未反映の編集と3-wayマージして取り込みます。競合した箇所は編集中の内容を優先し、ツールバー下のバナーで通知します

## インストール

### 開発環境のセットアップ

```bash
# すべての依存関係をインストール（ルート + webview-ui）
npm run install:all
```

### ビルド

```bash
# 開発ビルド
npm run compile

# 本番ビルド（VSIXパッケージ作成用）
npm run package
```

## 開発

### ウォッチモード

```bash
# 拡張機能とWebView UIの自動ビルド
npm run watch
```

### デバッグ

1. VSCodeで本プロジェクトを開く
2. F5キーを押してExtension Development Hostを起動
3. `.md`ファイルを開き、エディタタイトルのアイコンから「Open Markdown Editor」を選択

## コマンド一覧

### ルートディレクトリ（VSCode拡張機能）

```bash
npm run install:all      # ルートとwebview-uiの両方の依存関係をインストール
npm run compile          # 型チェック、lint、ビルドを実行
npm run watch            # 開発時のウォッチモード（esbuildとtsc）
npm run package          # 本番ビルド（webview-uiのビルドも含む）
npm run check-types      # TypeScriptの型チェック
npm run lint             # ESLintの実行
npm run test             # vscode-testでテスト実行
npm run format           # Prettierでフォーマット
```

### webview-ui ディレクトリ（React UI）

```bash
cd webview-ui

npm run start            # Vite開発サーバー起動
npm run build            # 本番ビルド
npm run test             # 全テスト実行（unit + storybook）
npm run test:unit        # ユニットテストのみ
npm run test:story       # Storybookテストのみ
npm run test:property    # プロパティベーステスト
npm run storybook        # Storybook開発サーバー（ポート6006）
npm run check-types      # TypeScriptの型チェック
npm run lint             # ESLint + Markuplintの実行
npm run format           # Prettierでフォーマット
```

## テスト

### 品質チェック（実装完了時に実行）

```bash
# ルートディレクトリ
npm run check-types && npm run lint && npm test

# webview-uiディレクトリ
cd webview-ui
npm run check-types && npm run lint && npm test
```

### テスト構成

webview-ui（Vitest）では次のテストプロジェクトを構成しています：
- `unit`: jsdom環境でのユニットテスト（`src/**/*.{test,spec}.*`）。fast-checkによるプロパティベーステストを含む
- `storybook`: Playwrightを使用したStorybookコンポーネントテスト
- `gherkin`: jsdom環境で実行するGherkin（`*.feature` + `*.steps.ts`）
- `gherkin-browser`: 実ブラウザで実行するGherkin（`*.browser.feature` + `*.browser.steps.ts`）

拡張機能側は、vscode-test（mocha）の中でcucumber-jsを実行します（`src/test/features/**`）。
`npm run test:extension` を実行する前に、`npm run compile-tests` と `node esbuild.js` で `out/` と `dist/` を用意してください（`npm test` の `pretest` が実施します）。

## アーキテクチャ

### プロジェクト構造

本プロジェクトは2つの主要コンポーネントで構成されています：

1. **VSCode拡張機能**（`src/`）- esbuildでバンドル
2. **WebView UI**（`webview-ui/`）- ReactアプリケーションをViteでビルド

### 拡張機能とWebView間の通信

`postMessage` APIを使用した双方向メッセージング：

**Extension → WebView**（`src/message/messageTypeToWebview.ts`）
- `update`: Markdownテキストの更新
- `updateTheme`: テーマ（light/dark）の変更
- `updateSettings`: テーマ設定とカスタムCSSの更新
- `saveImageResult`: 画像保存の結果
- `documentInfo`: 文書のディレクトリとベースURI
- `plantUmlResult`: PlantUMLの描画結果（SVGまたはエラー）
- `exportResult`: エクスポートの結果

**WebView → Extension**（`src/message/messageTypeToExtention.ts`）
- `init`: 初期化リクエスト
- `update`: 編集内容を文書へ反映（保存はしない）
- `save`: 編集内容を反映して保存
- `reload`: 再読み込みリクエスト
- `saveImage`: 画像の保存
- `renderPlantUml`: PlantUMLの描画要求
- `saveSettings`: テーマ設定の保存
- `openFile`: リンク先ファイルを開く
- `exportHtml` / `exportBlogHtml` / `exportPdf`: エクスポート

WebViewから受け取るメッセージは、拡張機能側で実行時に形式を検証します。不正な形式のメッセージは無視されます。

### 主要コンポーネント

- **EditorProvider**（`src/editor/editorProvider.ts`）: CustomTextEditorProviderの実装。WebViewの生成とメッセージハンドリング
- **App**（`webview-ui/src/App.tsx`）: WYSIWYGエディタのReactコンポーネント。Milkdown（Crepe）を使用

### パスエイリアス

- `@/`: `src/`（拡張機能）
- `@message/`: `src/message/`（webview-ui）

## 設定

設定のキーはすべて `markdownWysiwygEditor.` で始まります。

| 設定 | 既定値 | 説明 |
|---|---|---|
| `plantumlJarPath` | `""` | PlantUMLのjar（`plantuml.jar`）の絶対パス。先頭の `~` はホームディレクトリに展開します。PlantUMLのプレビューに必要です。スコープはmachineです |
| `javaPath` | `""` | Java実行ファイルのパス。未設定の場合は `JAVA_HOME` または `PATH` から検出します。スコープはmachineです |
| `plantumlServerPort` | `8888` | ローカルのPlantUMLサーバーのポート番号。変更は反映されます。使用中のポートを指定するとエラーになります |
| `theme` | `"auto"` | `auto`（VS Codeのテーマに追従）/ `light` / `dark`。ツールバーから変更した場合、ワークスペース設定に値があればワークスペース設定へ、なければユーザー設定へ保存します |
| `customCssPaths` | `[]` | カスタムCSSファイルのパス（複数指定可）。エディタ、プレビュー、HTML/PDFエクスポートに適用します。相対パスは、文書が属するワークスペースフォルダを基準に解決します。先頭の `~` はホームディレクトリに展開します。どのワークスペースフォルダにも属さない文書では、相対パスは使えません |
| `blogExport.useShadowDom` | `false` | ブログ用HTMLのエクスポートで、Shadow DOMを使ってスタイルを完全に分離します。ブログプラットフォームがJavaScriptを許可している場合に有効です |

```json
{
  "markdownWysiwygEditor.plantumlJarPath": "~/tools/plantuml.jar",
  "markdownWysiwygEditor.javaPath": "/path/to/java",
  "markdownWysiwygEditor.plantumlServerPort": 8888,
  "markdownWysiwygEditor.theme": "auto", // "auto" | "light" | "dark"
  "markdownWysiwygEditor.customCssPaths": ["styles/custom.css"],
  "markdownWysiwygEditor.blogExport.useShadowDom": false
}
```

### PlantUMLの準備

PlantUMLのjarは拡張機能に同梱していません。https://plantuml.com/download から `plantuml.jar` をダウンロードし、`plantumlJarPath` に絶対パスを指定してください。あわせて、Javaが実行できる必要があります。

`plantumlJarPath` が未設定、またはファイルが存在しない場合、PlantUMLのプレビューは描画されず、設定エラーが通知されます（「設定を開く」ボタン付き。通知は1回だけ表示されます）。PlantUMLの描画要求には応答待ちの上限（既定60秒）があり、超えるとエラーを表示します。

### 制限モード（信頼されていないワークスペース）

`javaPath` と `plantumlJarPath` はmachineスコープの設定で、実行ファイルのパスを指すため、ワークスペース側の設定では上書きできません。また、信頼されていないワークスペース（制限モード）では、これらの設定は使用されません。PlantUMLを使う場合は、ワークスペースを信頼するか、ユーザー設定で指定してください。

## ライセンス

このプロジェクトのライセンス情報については、リポジトリを参照してください。

## リポジトリ

https://github.com/natsuyasai/vscode-markdown-wysiwyg-editor