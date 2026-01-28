import { SaveImageMessage } from "@message/messageTypeToExtention";
import { Message, PlantUmlResultMessage, SaveImageResultMessage } from "@message/messageTypeToWebview";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { replaceAll } from "@milkdown/utils";
import { FC, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { vscode } from "../../utilities/vscode";
import {
  handlePlantUmlResult,
  renderMermaidPreview,
  renderPlantUmlPreview,
} from "./diagramPreview";
import { htmlBlockSchema, htmlSchema } from "./htmlPlugin";
import "./MilkdownTheme.css";

// 画像アップロードのコールバック管理
const imageUploadCallbacks = new Map<string, (result: string | null) => void>();

/**
 * 画像アップロード結果を処理する
 */
function handleImageUploadResult(message: SaveImageResultMessage): void {
  // 最新のコールバックを取得（IDが不明なため、最初のものを使用）
  const entries = Array.from(imageUploadCallbacks.entries());
  if (entries.length > 0) {
    const [requestId, callback] = entries[0];
    if (message.payload.success && message.payload.localPath) {
      callback(message.payload.localPath);
    } else {
      console.error("Failed to upload image:", message.payload.error);
      callback(null);
    }
    imageUploadCallbacks.delete(requestId);
  }
}

/**
 * 画像をアップロードする（Extension経由でローカル保存）
 */
async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64Data = reader.result as string;
      const requestId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // コールバックを登録
      imageUploadCallbacks.set(requestId, (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Failed to save image"));
        }
      });

      // Extensionに画像保存をリクエスト
      vscode.postMessage({
        type: "saveImage",
        payload: {
          imageData: base64Data,
          fileName: file.name || `image_${Date.now()}`,
          mimeType: file.type || "image/png",
        },
      } satisfies SaveImageMessage);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };

    reader.readAsDataURL(file);
  });
}

interface MilkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  theme: "light" | "dark";
  readonly?: boolean;
}

export const MilkdownEditor: FC<MilkdownEditorProps> = ({
  value,
  onChange,
  theme,
  readonly = false,
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

  // PlantUML結果と画像アップロード結果のメッセージハンドラ
  const handleExtensionMessage = useCallback((event: MessageEvent<Message>) => {
    const message = event.data;
    if (message.type === "plantUmlResult") {
      const result = message as PlantUmlResultMessage;
      handlePlantUmlResult(result.payload.requestId, result.payload.svg, result.payload.error);
    } else if (message.type === "saveImageResult") {
      const result = message as SaveImageResultMessage;
      handleImageUploadResult(result);
    }
  }, []);

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
          onUpload: uploadImage,
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

      await crepe.create();
      if (isMounted) {
        crepeRef.current = crepe;
        isEditorReadyRef.current = true;
        // 初期化後にreadonlyを適用
        crepe.setReadonly(readonlyRef.current);
      }
    };

    initializeEditor().catch(console.error);

    return () => {
      isMounted = false;
      isEditorReadyRef.current = false;
      crepeRef.current = null;
      const destroyEditor = async () => {
        await crepe.destroy();
      };
      destroyEditor().catch(console.error);
    };
  }, [onChange]);

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
