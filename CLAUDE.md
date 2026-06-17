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
npm run test             # vscode-testでテスト実行
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

- **WebView → Extension**（`src/message/messageTypeToExtention.ts`）
  - `init`: 初期化リクエスト
  - `update`: Markdownの更新
  - `save`: ファイル保存
  - `reload`: 再読み込みリクエスト

### 主要コンポーネント

- `EditorProvider`（`src/editor/editorProvider.ts`）: CustomTextEditorProviderの実装。WebViewの生成とメッセージハンドリング
- `App`（`webview-ui/src/App.tsx`）: WYSIWYGエディタのReactコンポーネント。@wysimark/reactを使用

### テスト構成（webview-ui）

Vitestで3つのプロジェクトを構成：
- `unit`: jsdom環境でのユニットテスト（`tests/**/*.spec.ts`）
- `storybook`: Playwrightを使用したStorybookコンポーネントテスト
- プロパティベーステスト: fast-checkを使用

### パスエイリアス

- `@/`: `src/`（拡張機能）
- `@message/`: `src/message/`（webview-ui）

