import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Loader2, Code2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { CodeEditor, type CodeLanguage } from "../components/CodeEditor";

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInstance>;
  }
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched?: (s: string) => void }) => void;
  setStderr: (opts: { batched?: (s: string) => void }) => void;
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const SAMPLES: Record<"python" | "javascript", string> = {
  python: `# Bienvenue dans le sandbox Python
# Tout s'exécute dans ton navigateur grâce à Pyodide.

def factorielle(n: int) -> int:
    return 1 if n <= 1 else n * factorielle(n - 1)

for i in range(1, 8):
    print(f"{i}! = {factorielle(i)}")
`,
  javascript: `// Bienvenue dans le sandbox JavaScript
// Le code tourne dans une iframe sandbox isolée.

function fibonacci(n) {
  const out = [0, 1];
  for (let i = 2; i < n; i++) out.push(out[i - 1] + out[i - 2]);
  return out;
}

console.log("Fib:", fibonacci(10));
`,
};

let pyodidePromise: Promise<PyodideInstance> | null = null;

async function loadPyodide(): Promise<PyodideInstance> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${PYODIDE_BASE}pyodide.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Impossible de charger Pyodide"));
        document.head.appendChild(script);
      });
    }
    if (!window.loadPyodide) throw new Error("Pyodide indisponible");
    return window.loadPyodide({ indexURL: PYODIDE_BASE });
  })();
  return pyodidePromise;
}

export function SandboxPage() {
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [code, setCode] = useState(SAMPLES.python);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [pyState, setPyState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const pyRef = useRef<PyodideInstance | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setCode(SAMPLES[language]);
    setOutput("");
  }, [language]);

  useEffect(() => {
    if (language === "javascript") return;
    if (pyRef.current || pyState === "loading") return;
    setPyState("loading");
    loadPyodide()
      .then((py) => {
        pyRef.current = py;
        py.setStdout({ batched: (s: string) => setOutput((prev) => prev + s + "\n") });
        py.setStderr({ batched: (s: string) => setOutput((prev) => prev + s + "\n") });
        setPyState("ready");
      })
      .catch((err) => {
        setPyState("error");
        setOutput(`Erreur de chargement de Pyodide : ${err}`);
      });
  }, [language, pyState]);

  async function runPython() {
    if (!pyRef.current) return;
    setRunning(true);
    setOutput("");
    try {
      await pyRef.current.runPythonAsync(code);
    } catch (err) {
      setOutput((prev) => prev + String(err) + "\n");
    } finally {
      setRunning(false);
    }
  }

  function runJavascript() {
    setOutput("");
    setRunning(true);
    if (!iframeRef.current) {
      setOutput("Sandbox JS indisponible.");
      setRunning(false);
      return;
    }
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.kind === "log") {
        setOutput((prev) => prev + e.data.text + "\n");
      } else if (e.data.kind === "done") {
        window.removeEventListener("message", handler);
        setRunning(false);
      }
    };
    window.addEventListener("message", handler);
    iframeRef.current.contentWindow?.postMessage({ kind: "run", code }, "*");
    // Safety stop
    setTimeout(() => {
      window.removeEventListener("message", handler);
      setRunning((r) => (r ? false : r));
    }, 5000);
  }

  function run() {
    if (running) return;
    if (language === "python") runPython();
    else runJavascript();
  }

  function reset() {
    setCode(SAMPLES[language]);
    setOutput("");
  }

  const editorLang: CodeLanguage = language === "python" ? "python" : "javascript";

  const iframeSrcdoc = `
    <!doctype html><html><body><script>
      (function () {
        function send(text) { parent.postMessage({ kind: 'log', text: String(text) }, '*'); }
        const origLog = console.log;
        const origErr = console.error;
        const origWarn = console.warn;
        console.log = function (...a) { send(a.join(' ')); origLog.apply(console, a); };
        console.error = function (...a) { send('Erreur: ' + a.join(' ')); origErr.apply(console, a); };
        console.warn = function (...a) { send('Avertissement: ' + a.join(' ')); origWarn.apply(console, a); };
        window.addEventListener('message', function (e) {
          if (!e.data || e.data.kind !== 'run') return;
          try {
            new Function(e.data.code)();
          } catch (err) {
            send('Erreur: ' + err.message);
          }
          parent.postMessage({ kind: 'done' }, '*');
        });
      })();
    </script></body></html>`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sandbox de code"
        subtitle="Exécute du Python (Pyodide) ou du JavaScript directement dans ton navigateur."
        actions={
          <button className="btn-secondary" onClick={reset} title="Réinitialiser">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </button>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(["python", "javascript"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                language === l
                  ? "bg-white dark:bg-slate-900 shadow text-brand-600 dark:text-brand-300"
                  : "text-muted"
              }`}
            >
              <Code2 className="inline w-4 h-4 mr-1" />
              {l === "python" ? "Python" : "JavaScript"}
            </button>
          ))}
        </div>
        {language === "python" && (
          <span className="text-xs text-muted">
            {pyState === "loading" && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Chargement Pyodide…
              </span>
            )}
            {pyState === "ready" && "Pyodide prêt"}
            {pyState === "error" && "Pyodide indisponible"}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            className="btn-primary"
            onClick={run}
            disabled={running || (language === "python" && pyState !== "ready")}
          >
            {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Exécution…" : "Exécuter"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-2 text-muted">Code</div>
          <CodeEditor value={code} onChange={setCode} language={editorLang} height="420px" />
        </div>
        <div>
          <div className="text-sm font-medium mb-2 text-muted">Sortie</div>
          <pre className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-200 text-xs p-4 min-h-[420px] whitespace-pre-wrap overflow-auto font-mono">
            {output || "(aucune sortie)"}
          </pre>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        title="js-sandbox"
        sandbox="allow-scripts"
        srcDoc={iframeSrcdoc}
        style={{ display: "none" }}
      />
    </div>
  );
}
