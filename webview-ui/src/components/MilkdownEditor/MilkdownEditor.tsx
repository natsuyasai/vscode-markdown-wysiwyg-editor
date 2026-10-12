import {
  Message,
  PlantUmlResultMessage,
  SaveImageResultMessage,
} from "@message/messageTypeToWebview";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/utils";
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useImageUpload } from "../../hooks/useImageUpload";
import { extractHeadings } from "../../utilities/extractHeadings";
import { splitForEditor } from "../../utilities/parseFrontmatter";
import { OutlineSidebar } from "../OutlineSidebar";
import {
  handlePlantUmlResult,
  renderMermaidPreview,
  renderPlantUmlPreview,
} from "./diagramPreview";
import { htmlBlockSchema, htmlSchema } from "./htmlPlugin";
import "./MilkdownTheme.css";
import { createRemarkStringifyOptions } from "./remarkConfig";
import { scrollToHeadingInEditor } from "./scrollToHeading";

/** CRLFをLFに正規化する（CodeMirror/ProseMirror間の位置ずれ防止） */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

interface MilkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  theme: "light" | "dark";
  readonly?: boolean;
  baseUri?: string;
  /** エディタがコンテンツを読み込んだ直後に、シリアライズ結果（ラウンドトリップ後のMarkdown）を通知する */
  onContentLoaded?: (serialized: string) => void;
}

export const MilkdownEditor: FC<MilkdownEditorProps> = ({
  value,
  onChange,
  theme,
  readonly = false,
  baseUri = "",
  onContentLoaded,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const isEditorReadyRef = useRef(false);
  // フロントマターは編集領域に渡さず、元の文字列のまま保持して出力のたびに先頭へ付け直す
  const frontmatterRef = useRef("");
  // エディタに渡した、またはエディタが出力した最後の本文（フロントマターを除く）
  const lastKnownBodyRef = useRef<string | null>(null);
  const initialValueRef = useRef(normalizeLineEndings(value));
  const readonlyRef = useRef(readonly);
  const themeRef = useRef(theme);
  const onContentLoadedRef = useRef(onContentLoaded);
  const valueRef = useRef(value);

  // refを最新の値で更新
  valueRef.current = value;
  readonlyRef.current = readonly;
  themeRef.current = theme;
  onContentLoadedRef.current = onContentLoaded;

  // markdownからリアルタイムに見出しを抽出（フロントマターは編集領域に表示しないので対象外）
  const headings = useMemo(() => extractHeadings(splitForEditor(value).body), [value]);

  // 最新のheadingsをrefで保持し、スクロールハンドラを安定させる
  const headingsRef = useRef(headings);
  headingsRef.current = headings;

  // アウトラインの見出しクリック時、エディタ内の該当見出しへスムーズスクロールする
  const handleHeadingClick = useCallback((id: string) => {
    scrollToHeadingInEditor(divRef.current, headingsRef.current, id);
  }, []);

  // 画像アップロード機能
  const { handleImageUploadResult, createUploadImage } = useImageUpload(baseUri);

  // PlantUML結果と画像アップロード結果のメッセージハンドラ
  const handleExtensionMessage = useCallback(
    (event: MessageEvent<Message>) => {
      const message = event.data;
      if (message.type === "plantUmlResult") {
        const result = message as PlantUmlResultMessage;
        handlePlantUmlResult(result.payload.requestId, result.payload.svg, result.payload.error);
      } else if (message.type === "saveImageResult") {
        const result = message as SaveImageResultMessage;
        handleImageUploadResult(result);
      }
    },
    [handleImageUploadResult]
  );

  // メッセージリスナーを登録
  useEffect(() => {
    window.addEventListener("message", handleExtensionMessage);
    return () => {
      window.removeEventListener("message", handleExtensionMessage);
    };
  }, [handleExtensionMessage]);

  useLayoutEffect(() => {
    if (!divRef.current) return;

    let isMounted = true;
    let previewIdCounter = 0;

    // 作り直しのときは、最後にエディタが知っていた前置き(フロントマター)と本文から始める（再分割はしない）
    const initialSplit =
      lastKnownBodyRef.current === null
        ? splitForEditor(initialValueRef.current)
        : { prefix: frontmatterRef.current, body: lastKnownBodyRef.current };
    const initialValue = initialSplit.prefix + initialSplit.body;
    frontmatterRef.current = initialSplit.prefix;
    lastKnownBodyRef.current = initialSplit.body;
    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: initialSplit.body,
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: {
          renderPreview: (language, content, applyPreview) => {
            if (language === "mermaid") {
              const id = `inline-${Date.now()}-${previewIdCounter++}`;
              renderMermaidPreview(content, id, themeRef.current, applyPreview);
              return undefined; // 非同期処理中
            }
            if (language === "plantuml") {
              const requestId = `inline-${Date.now()}-${previewIdCounter++}`;
              renderPlantUmlPreview(content, requestId, applyPreview);
              return undefined; // 非同期処理中
            }
            return null; // その他の言語はプレビューなし
          },
          previewToggleButton: (previewOnly: boolean) =>
            previewOnly ? "Show Source" : "Show Preview",
          previewLabel: "Preview",
          previewLoading: "Loading...",
          previewOnlyByDefault: true,
        },
        [Crepe.Feature.ImageBlock]: {
          onUpload: createUploadImage(),
        },
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        const body = normalizeLineEndings(markdown);
        lastKnownBodyRef.current = body;
        onChange(frontmatterRef.current + body);
      });
    });

    const initializeEditor = async () => {
      // HTMLサポート: デフォルトのhtmlスキーマを上書き
      crepe.editor.use(htmlSchema).use(htmlBlockSchema);

      // remark-stringifyのオプションをカスタマイズ（箇条書きマーカー、改行方式など）
      crepe.editor.config((ctx) => {
        const customOptions = createRemarkStringifyOptions();
        ctx.update(remarkStringifyOptionsCtx, (prev) => ({
          ...prev,
          ...customOptions,
          handlers: {
            ...prev.handlers,
            ...customOptions.handlers,
          },
        }));
      });

      await crepe.create();
      if (isMounted) {
        crepeRef.current = crepe;
        isEditorReadyRef.current = true;
        // 初期化後にreadonlyを適用
        crepe.setReadonly(readonlyRef.current);
        // 初期化中に値が変わっていた場合は、最新の値へ置き換える（初期化中は値の変更が反映されないため）
        const latestValue = normalizeLineEndings(valueRef.current);
        if (latestValue !== initialValue) {
          const latest = splitForEditor(latestValue);
          frontmatterRef.current = latest.prefix;
          if (latest.body !== initialSplit.body) {
            crepe.editor.action(replaceAll(latest.body, true));
          }
          lastKnownBodyRef.current = latest.body;
        }
        // 初期コンテンツのシリアライズ結果（ラウンドトリップ後のMarkdown）を、フロントマターを付けて通知
        onContentLoadedRef.current?.(
          frontmatterRef.current + normalizeLineEndings(crepe.getMarkdown())
        );
      }
    };

    const initPromise = initializeEditor();

    return () => {
      // 作り直し・破棄の前に、通知が間に合っていない最新の編集内容を取り込む（編集を失わないため）
      if (isEditorReadyRef.current) {
        try {
          const latestBody = normalizeLineEndings(crepe.getMarkdown());
          if (latestBody !== lastKnownBodyRef.current) {
            lastKnownBodyRef.current = latestBody;
            onChange(frontmatterRef.current + latestBody);
          }
        } catch {
          // エディタが既に破棄されている場合は取り込めない
        }
      }
      isMounted = false;
      isEditorReadyRef.current = false;
      crepeRef.current = null;
      const destroyEditor = async () => {
        // 初期化完了を待ってからdestroyする（初期化中のアンマウント対策）
        await initPromise.catch(() => {});
        try {
          await crepe.destroy();
        } catch {
          // エディタコンテキストが既にクリーンアップ済みの場合を許容
        }
      };
      destroyEditor().catch(console.error);
    };
  }, [onChange, createUploadImage, theme]);

  // 外部からの値変更時にエディタを更新
  useLayoutEffect(() => {
    // エディタが準備できていない場合はスキップ
    if (!isEditorReadyRef.current || !crepeRef.current) {
      return;
    }

    // 内部変更の場合はスキップ（最後に知っている値と同じ場合）
    const normalizedValue = normalizeLineEndings(value);
    if (normalizedValue === frontmatterRef.current + (lastKnownBodyRef.current ?? "")) {
      return;
    }

    try {
      const next = splitForEditor(normalizedValue);
      frontmatterRef.current = next.prefix;
      // フロントマターだけが変わった場合は本文を置き換えない（カーソル位置を保つ）
      if (next.body !== lastKnownBodyRef.current) {
        // flush=true でカーソル位置をリセットして安全に置換
        crepeRef.current.editor.action(replaceAll(next.body, true));
        lastKnownBodyRef.current = next.body;
      }
      // 外部から与えた内容の読み込み完了として、フロントマターを付けたシリアライズ結果（ラウンドトリップ後のMarkdown）を通知
      onContentLoadedRef.current?.(
        frontmatterRef.current + normalizeLineEndings(crepeRef.current.getMarkdown())
      );
    } catch (error) {
      console.error("Failed to update editor content:", error);
    }
  }, [value]);

  // readonly状態の変更を監視
  useLayoutEffect(() => {
    if (isEditorReadyRef.current && crepeRef.current) {
      crepeRef.current.setReadonly(readonly);
    }
  }, [readonly]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        ref={divRef}
        data-theme={theme}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
      <OutlineSidebar headings={headings} onHeadingClick={handleHeadingClick} theme={theme} />
    </div>
  );
};
