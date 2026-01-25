import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "./MilkdownTheme.css";
import { replaceAll } from "@milkdown/utils";
import { FC, useLayoutEffect, useRef } from "react";

interface MilkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  theme: "light" | "dark";
  readonly?: boolean;
}

export const MilkdownEditor: FC<MilkdownEditorProps> = ({ value, onChange, theme, readonly = false }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const isEditorReadyRef = useRef(false);
  const lastKnownValueRef = useRef(value);
  const readonlyRef = useRef(readonly);

  // refを最新の値で更新
  readonlyRef.current = readonly;

  useLayoutEffect(() => {
    if (!divRef.current) return;

    let isMounted = true;

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: lastKnownValueRef.current,
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        lastKnownValueRef.current = markdown;
        onChange(markdown);
      });
    });

    const initializeEditor = async () => {
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
        overflow: "auto",
      }}
    />
  );
};
