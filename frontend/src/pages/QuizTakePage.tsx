import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  Quiz,
  QuizAttemptResult,
  QuizSubmitAnswer,
} from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/Toast";
import { CodeEditor } from "../components/CodeEditor";

interface AnswerState {
  choiceIds: number[];
  text: string;
}

export function QuizTakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [studentLabel, setStudentLabel] = useState("");
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Quiz>(`/api/quizzes/${id}`)
      .then((r) => {
        setQuiz(r.data);
        const a: Record<number, AnswerState> = {};
        for (const q of r.data.questions) {
          a[q.id] = { choiceIds: [], text: "" };
        }
        setAnswers(a);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const totalPoints = useMemo(
    () => quiz?.questions.reduce((s, q) => s + q.points, 0) ?? 0,
    [quiz],
  );

  function setSingle(qid: number, choiceId: number) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], choiceIds: [choiceId] } }));
  }

  function toggleMultiple(qid: number, choiceId: number) {
    setAnswers((prev) => {
      const cur = prev[qid]?.choiceIds || [];
      const next = cur.includes(choiceId) ? cur.filter((x) => x !== choiceId) : [...cur, choiceId];
      return { ...prev, [qid]: { ...prev[qid], choiceIds: next } };
    });
  }

  function setText(qid: number, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], text: value } }));
  }

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    const payload: { student_label: string; answers: QuizSubmitAnswer[] } = {
      student_label: studentLabel,
      answers: quiz.questions.map((q) => ({
        question_id: q.id,
        choice_ids: answers[q.id]?.choiceIds || [],
        text: answers[q.id]?.text || "",
      })),
    };
    try {
      const r = await api.post<QuizAttemptResult>(`/api/quizzes/${quiz.id}/submit`, payload);
      setResult(r.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.push("Erreur de soumission", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    if (!quiz) return;
    const a: Record<number, AnswerState> = {};
    for (const q of quiz.questions) a[q.id] = { choiceIds: [], text: "" };
    setAnswers(a);
  }

  if (loading) {
    return <div className="card p-12 text-center text-muted">Chargement…</div>;
  }
  if (!quiz) {
    return (
      <div className="card p-12 text-center">
        <p className="text-muted">Quiz introuvable.</p>
        <button className="btn-primary mt-4" onClick={() => navigate("/quizzes")}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn-icon" onClick={() => navigate("/quizzes")}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title={quiz.title}
          subtitle={`${quiz.questions.length} question(s) • ${totalPoints} pt(s)`}
        />
      </div>

      {result && (
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                result.score >= result.max_score * 0.5 ? "bg-emerald-500" : "bg-rose-500"
              }`}
            >
              {Math.round((result.score / Math.max(result.max_score, 1)) * 20)}
            </div>
            <div>
              <div className="text-2xl font-bold">
                {result.score} / {result.max_score} pts
              </div>
              <div className="text-sm text-muted">
                Note ramenée sur 20 :{" "}
                {((result.score / Math.max(result.max_score, 1)) * 20).toFixed(2)}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-secondary" onClick={reset}>
                <RotateCcw className="w-4 h-4" /> Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <label className="label mb-0">Élève (optionnel)</label>
          <input
            className="input w-64"
            value={studentLabel}
            onChange={(e) => setStudentLabel(e.target.value)}
            placeholder="Prénom Nom"
          />
        </div>
      )}

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => {
          const detail = result?.detail.questions.find((dq) => dq.id === q.id);
          const ok = detail?.ok;
          return (
            <div
              key={q.id}
              className={`card p-5 ${
                result
                  ? ok
                    ? "ring-1 ring-emerald-300 dark:ring-emerald-500/40"
                    : "ring-1 ring-rose-300 dark:ring-rose-500/40"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-muted">
                  Q{idx + 1} • {q.points} pt(s)
                </div>
                {result && (
                  <span
                    className={`text-xs flex items-center gap-1 ${
                      ok ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {ok ? "Correct" : "Incorrect"}
                  </span>
                )}
              </div>
              <div className="font-medium whitespace-pre-wrap">{q.prompt}</div>
              {q.code_snippet && (
                <div className="mt-3">
                  <CodeEditor
                    value={q.code_snippet}
                    onChange={() => undefined}
                    language="python"
                    readOnly
                    height="auto"
                  />
                </div>
              )}

              <div className="mt-3 space-y-2">
                {q.kind === "text" ? (
                  <input
                    className="input"
                    placeholder="Ta réponse…"
                    disabled={!!result}
                    value={answers[q.id]?.text || ""}
                    onChange={(e) => setText(q.id, e.target.value)}
                  />
                ) : (
                  q.choices.map((c) => {
                    const chosen = answers[q.id]?.choiceIds.includes(c.id);
                    const wasCorrect = c.is_correct;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          result
                            ? wasCorrect
                              ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                              : chosen
                                ? "border-rose-300 bg-rose-50/50 dark:border-rose-500/40 dark:bg-rose-500/10"
                                : "border-slate-200 dark:border-slate-700"
                            : chosen
                              ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
                              : "border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-500/40"
                        }`}
                      >
                        <input
                          type={q.kind === "single" ? "radio" : "checkbox"}
                          name={`q-${q.id}`}
                          checked={!!chosen}
                          disabled={!!result}
                          onChange={() =>
                            q.kind === "single"
                              ? setSingle(q.id, c.id)
                              : toggleMultiple(q.id, c.id)
                          }
                        />
                        <span className="text-sm">{c.text}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {result && q.explanation && (
                <div className="mt-3 text-xs text-muted bg-slate-50 dark:bg-slate-800/50 rounded-md p-2">
                  <strong>Explication :</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            <Send className="w-4 h-4" /> {submitting ? "Envoi…" : "Envoyer mes réponses"}
          </button>
        </div>
      )}
    </div>
  );
}
