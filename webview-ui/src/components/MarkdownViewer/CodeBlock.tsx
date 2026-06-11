import hljs from "highlight.js/lib/common";
import { FC, useEffect, useMemo, useState } from "react";

const PLAINTEXT = "plaintext";

// highlight.js（commonセット）に登録済みの言語一覧
const REGISTERED_LANGUAGES = [...hljs.listLanguages()].sort();

interface CodeBlockProps {
  code: string;
  initialLanguage: string;
}

function normalizeLanguage(language: string): string {
  return language === "" ? PLAINTEXT : language;
}

/**
 * シンタックスハイライト付きコードブロック
 * 言語セレクタでコードブロック毎にハイライト言語を切り替えられる（表示のみの一時的な変更）
 */
export const CodeBlock: FC<CodeBlockProps> = ({ code, initialLanguage }) => {
  const normalizedInitial = normalizeLanguage(initialLanguage);
  const [language, setLanguage] = useState(normalizedInitial);

  // ソース側のフェンス言語が変わった場合は選択をリセットする
  useEffect(() => {
    setLanguage(normalizedInitial);
  }, [normalizedInitial]);

  // フェンス言語がhighlight.js未登録（独自言語など）でも選択肢として保持する
  const languageOptions = useMemo(() => {
    const options = [PLAINTEXT, ...REGISTERED_LANGUAGES];
    if (!options.includes(normalizedInitial)) {
      options.push(normalizedInitial);
    }
    return options;
  }, [normalizedInitial]);

  const highlightedHtml = useMemo(() => {
    if (language === PLAINTEXT || !hljs.getLanguage(language)) {
      return null;
    }
    // highlight.jsはコードをエスケープして出力するためdangerouslySetInnerHTMLでも安全
    return hljs.highlight(code, { language }).value;
  }, [code, language]);

  return (
    <div className="markdown-viewer-code-block">
      <select
        className="markdown-viewer-code-language"
        aria-label="コード言語"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {languageOptions.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre>
        {highlightedHtml !== null ? (
          <code
            className={`hljs language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
};
