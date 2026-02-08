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
import { FC, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useImageUpload } from "../../hooks/useImageUpload";
import {
  handlePlantUmlResult,
  renderMermaidPreview,
  renderPlantUmlPreview,
} from "./diagramPreview";
import { htmlBlockSchema, htmlSchema } from "./htmlPlugin";
import "./MilkdownTheme.css";
import { createRemarkStringifyOptions } from "./remarkConfig";

interface MilkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  theme: "light" | "dark";
  readonly?: boolean;
  baseUri?: string;
}

export const MilkdownEditor: FC<MilkdownEditorProps> = ({
  value,
  onChange,
  theme,
  readonly = false,
  baseUri = "",
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const isEditorReadyRef = useRef(false);
  const lastKnownValueRef = useRef(value);
  const readonlyRef = useRef(readonly);
  const themeRef = useRef(theme);

  // refを最新の値で更新
  readonlyRef.current = readonly;
  themeRef.current = theme;

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

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: lastKnownValueRef.current,
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
        lastKnownValueRef.current = markdown;
        onChange(markdown);
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
      }
    };

    const initPromise = initializeEditor();

    return () => {
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
  }, [onChange, createUploadImage]);

  // 外部からの値変更時にエディタを更新
  useLayoutEffect(() => {
    // エディタが準備できていない場合はスキップ
    if (!isEditorReadyRef.current || !crepeRef.current) {
      return;
    }

    // 内部変更の場合はスキップ（最後に知っている値と同じ場合）
    if (value === lastKnownValueRef.current) {
      return;
    }

    try {
      // flush=true でカーソル位置をリセットして安全に置換
      crepeRef.current.editor.action(replaceAll(value, true));
      lastKnownValueRef.current = value;
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
    <div
      ref={divRef}
      data-theme={theme}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};
