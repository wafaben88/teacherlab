import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-json";
import "../styles/prism-theme.css";

export type CodeLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "c"
  | "cpp"
  | "java"
  | "bash"
  | "sql"
  | "css"
  | "html"
  | "json";

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
  className?: string;
}

const LANG_TO_PRISM: Record<CodeLanguage, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "javascript",
  c: "c",
  cpp: "cpp",
  java: "java",
  bash: "bash",
  sql: "sql",
  css: "css",
  html: "markup",
  json: "json",
};

export function CodeEditor({
  value,
  onChange,
  language = "python",
  readOnly,
  placeholder,
  height = "240px",
  className = "",
}: Props) {
  const [, force] = useState(0);
  useEffect(() => {
    // Force a re-highlight when language changes
    force((x) => x + 1);
  }, [language]);

  const grammar = Prism.languages[LANG_TO_PRISM[language]] || Prism.languages.javascript;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 overflow-hidden ${className}`}
      style={{ minHeight: height }}
    >
      <Editor
        value={value}
        onValueChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        highlight={(code) => Prism.highlight(code, grammar, LANG_TO_PRISM[language])}
        padding={12}
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: 13,
          minHeight: height,
        }}
      />
    </div>
  );
}
