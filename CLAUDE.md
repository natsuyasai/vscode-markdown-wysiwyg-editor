# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発フロー

機能追加・修正・挙動変更などのアプリ開発は、**常に `feature-development-flow` スキルが定義するフローで進めること**。
（要求明確化 → プラン策定 → 作業ブランチでのサブエージェント委譲＋TDD実装 → プロパティベーステスト → 完了処理）。各フェーズの詳細は対応スキル（`clarify-requirements` / `implementation-planning` / `subagent-tdd-implementation` / `property-based-testing` / `check-creation`）に従う。
同様のミスの指摘が複数回発生した場合は、`record-recurring-mistakes` に従い本ファイルへ再発防止ルールを追記する。

## 基本ルール

- 必ず日本語で回答してください。
- ユーザーからの指示や仕様に疑問などがあれば作業を中断し、質問すること。
- Robert C. Martinが提唱する原則に従ってコードを作成してください。
- TDDおよびテスト駆動開発で実装する際は、すべてt-wadaの推奨する進め方に従ってください。
- リファクタリングはMartin Fowlerが推奨する進め方に従ってください。
- セキュリティルールに従うこと。
- 実装完了時に必ず「npm run check-types」と「npm run lint」を実行し、エラーや警告がない状態としてください。
- エラーや警告が発生する場合は、必ず修正してください。
- Before doing any UI, frontend or React development, ALWAYS call the storybook MCP server to get further instructions.
- SKILLとして定義が必要なものが出てきた場合は、skilsフォルダに専用のskillとして保存してください

## コマンド

### ルートディレクトリ（VSCode拡張機能）

```bash
npm run install:all      # ルートとwebview-uiの両方の依存関係をインストール
npm run compile          # 型チェック、lint、ビルドを実行
npm run watch            # 開発時のウォッチモード（esbuildとtsc）
npm run package          # 本番ビルド（webview-uiのビルドも含む）
npm run check-types      # TypeScriptの型チェック
npm run lint             # ESLintの実行
npm run test             # 拡張機能（vscode-test）とwebview-uiのテストを実行
npm run test:extension   # 拡張機能側のみ（事前に compile-tests と dist のビルドが必要）
npm run format           # Prettierでフォーマット
```

### webview-ui ディレクトリ（React UI）

```bash
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

### 品質チェック（実装完了時に両方のディレクトリで実行）

```bash
# ルートディレクトリ
npm run check-types && npm run lint && npm test

# webview-uiディレクトリ
npm run check-types && npm run lint && npm test
```

## アーキテクチャ

### プロジェクト構造

VSCode用のMarkdown WYSIWYGエディタ拡張機能。2つの主要コンポーネントで構成：

1. **VSCode拡張機能**（`src/`）- esbuildでバンドル
2. **WebView UI**（`webview-ui/`）- ReactアプリケーションをViteでビルド

### 拡張機能とWebView間の通信

`postMessage` APIを使用した双方向メッセージング：

- **Extension → WebView**（`src/message/messageTypeToWebview.ts`）
  - `update`: Markdownテキストの更新
  - `updateTheme`: テーマ（light/dark）の変更
  - `updateSettings`: テーマ設定とカスタムCSSの更新
  - `saveImageResult`: 画像保存の結果
  - `documentInfo`: 文書のディレクトリとベースURI
  - `plantUmlResult`: PlantUMLの描画結果
  - `exportResult`: エクスポートの結果

- **WebView → Extension**（`src/message/messageTypeToExtention.ts`）
  - `init`: 初期化リクエスト
  - `update`: 編集内容をTextDocumentへ反映（保存はしない）
  - `save`: 反映してから保存
  - `reload`: 再読み込みリクエスト
  - `saveImage`: 画像の保存
  - `renderPlantUml`: PlantUMLの描画要求
  - `saveSettings`: テーマ設定の保存
  - `openFile`: リンク先ファイルを開く
  - `exportHtml` / `exportBlogHtml` / `exportPdf`: エクスポート

WebViewから受け取るメッセージは `src/message/validateWebviewMessage.ts` が実行時に検証する。`PAYLOAD_VALIDATORS` は `Record<MessageType, PayloadValidator>` のため、メッセージ種別を追加したら検証関数も追加すること。payloadに必須項目を足す場合も検証を更新する。

### 主要コンポーネント

- `EditorProvider`（`src/editor/editorProvider.ts`）: CustomTextEditorProviderの実装。WebViewの生成とメッセージハンドリング
- `App`（`webview-ui/src/App.tsx`）: WYSIWYGエディタのReactコンポーネント。編集はMilkdown（Crepe）、Readonly表示はreact-markdownを使用

### テスト構成（webview-ui）

Vitestで4つのプロジェクトを構成（`webview-ui/vitest.config.ts`）：
- `unit`: jsdom環境でのユニットテスト（`src/**/*.{test,spec}.*`）。プロパティベーステスト（fast-check、`*.property.spec.ts`）もここで実行
- `storybook`: Playwrightを使用したStorybookコンポーネントテスト
- `gherkin`: jsdom環境のGherkin（`src/**/*.feature` + `*.steps.ts`、quickpickle）
- `gherkin-browser`: 実ブラウザのGherkin（`src/**/*.browser.feature` + `*.browser.steps.ts`）

### テスト構成（拡張機能）

vscode-test（mocha）で実行する。`src/test/cucumber.test.ts` の中でcucumber-jsを `strict` モードで起動し、`src/test/features/**/*.feature` を実行する。step定義は `src/test/features/steps/**`（コンパイル後の `out/` を読み込む）。step定義からは `vscode` APIを使える。

### Gherkinの規約

- webview-ui（jsdom）: `*.feature` + `*.steps.ts`。webview-ui（実ブラウザ）: `*.browser.feature` + `*.browser.steps.ts`。拡張機能: `src/test/features/**`（strictモード）。
- stepの名前空間は1つにまとまっている。stepが衝突（ambiguous）しないよう、ドメインごとに名前を付ける。
- featureは、対応するstep定義と一緒にコミットする（片方だけだとテストが失敗する）。
- 状態はシナリオ内で `world.data` に持たせる（quickpickle）。
- 未定義・保留中のstepと、シナリオが0件の場合は失敗になる。

### テストの落とし穴

- `webview-ui/.storybook/vitest.setup.ts` に `setProjectAnnotations` という文字列を書かない。コメント内でも、addon-vitestがpreviewの自動適用をスキップしStorybookテストがすべて失敗する。
- jsdomのstepでは `vi.mock` を使わず、`vi.spyOn` を使い、後で必ず復元する。
- ブラウザのstepでは `expect.element(..., { timeout: 1000 })` のようにtimeoutを明示する。指定しないと失敗が「Step timed out」としか表示されない。
- `out/` に古いコンパイル済みstepが残っていると、ambiguous stepのエラーになる。step定義を移動・改名したときは `out/` を削除してから `npm run compile-tests` をやり直す。
- `npm run test:extension` は `dist/` が必要。先に `node esbuild.js`（または `npm run compile`）でビルドする。
- Viteの依存再最適化によるリロードで、`Failed to fetch dynamically imported module` が一度だけ発生することがある。コードの問題ではないので、もう一度実行する。

### パスエイリアス

- `@/`: `src/`（拡張機能）
- `@message/`: `src/message/`（webview-ui）

