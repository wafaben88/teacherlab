import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Code2,
  ListChecks,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  Level,
  Quiz,
  QuizChoice,
  QuizQuestion,
  QuizQuestionKind,
  Subject,
} from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/Toast";
import { CodeEditor } from "../components/CodeEditor";

interface DraftQuestion extends Omit<QuizQuestion, "id" | "choices"> {
  id?: number;
  choices: DraftChoice[];
}

interface DraftChoice extends Omit<QuizChoice, "id"> {
  id?: number;
}

const KIND_LABEL: Record<QuizQuestionKind, string> = {
  single: "Choix unique",
  multiple: "Choix multiples",
  text: "Réponse texte",
};

function emptyQuestion(position: number): DraftQuestion {
  return {
    position,
    kind: "single",
    prompt: "",
    code_snippet: "",
    explanation: "",
    points: 1,
    expected_text: "",
    choices: [
      { position: 0, text: "", is_correct: false },
      { position: 1, text: "", is_correct: false },
    ],
  };
}

export function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const editing = id !== undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [timeLimit, setTimeLimit] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [published, setPublished] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion(0)]);

  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    api.get<Level[]>("/api/levels").then((r) => setLevels(r.data));
    api.get<Subject[]>("/api/subjects").then((r) => setSubjects(r.data));
    if (editing) {
      api
        .get<Quiz>(`/api/quizzes/${id}`)
        .then((r) => {
          const q = r.data;
          setTitle(q.title);
          setDescription(q.description);
          setLevelId(q.level_id ? String(q.level_id) : "");
          setSubjectId(q.subject_id ? String(q.subject_id) : "");
          setTimeLimit(q.time_limit_min);
          setShuffle(q.shuffle);
          setPublished(q.is_published);
          setQuestions(
            q.questions.length
              ? q.questions.map((qq) => ({
                  id: qq.id,
                  position: qq.position,
                  kind: qq.kind,
                  prompt: qq.prompt,
                  code_snippet: qq.code_snippet,
                  explanation: qq.explanation,
                  points: qq.points,
                  expected_text: qq.expected_text,
                  choices: qq.choices.map((c) => ({
                    id: c.id,
                    position: c.position,
                    text: c.text,
                    is_correct: c.is_correct,
                  })),
                }))
              : [emptyQuestion(0)],
          );
        })
        .finally(() => setLoading(false));
    }
  }, [id, editing]);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0),
    [questions],
  );

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((q, idx) => ({ ...q, position: idx })),
    );
  }

  function addChoice(qi: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? {
              ...q,
              choices: [
                ...q.choices,
                { position: q.choices.length, text: "", is_correct: false },
              ],
            }
          : q,
      ),
    );
  }

  function updateChoice(qi: number, ci: number, patch: Partial<DraftChoice>) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const choices = q.choices.map((c, jdx) => (jdx === ci ? { ...c, ...patch } : c));
        // For single-choice, ensure only one is_correct
        if (q.kind === "single" && patch.is_correct) {
          for (let k = 0; k < choices.length; k++) {
            if (k !== ci) choices[k].is_correct = false;
          }
        }
        return { ...q, choices };
      }),
    );
  }

  function removeChoice(qi: number, ci: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? {
              ...q,
              choices: q.choices
                .filter((_, jdx) => jdx !== ci)
                .map((c, jdx) => ({ ...c, position: jdx })),
            }
          : q,
      ),
    );
  }

  async function save() {
    if (!title.trim()) {
      toast.push("Le titre est requis", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title,
      description,
      level_id: levelId ? Number(levelId) : null,
      subject_id: subjectId ? Number(subjectId) : null,
      time_limit_min: timeLimit,
      shuffle,
      is_published: published,
      questions: questions.map((q, idx) => ({
        position: idx,
        kind: q.kind,
        prompt: q.prompt,
        code_snippet: q.code_snippet,
        explanation: q.explanation,
        points: Number(q.points) || 0,
        expected_text: q.expected_text,
        choices:
          q.kind === "text"
            ? []
            : q.choices.map((c, cidx) => ({
                position: cidx,
                text: c.text,
                is_correct: c.is_correct,
              })),
      })),
    };
    try {
      if (editing) {
        await api.put(`/api/quizzes/${id}`, payload);
        toast.push("Quiz enregistré", "success");
      } else {
        const r = await api.post<Quiz>("/api/quizzes", payload);
        toast.push("Quiz créé", "success");
        navigate(`/quizzes/${r.data.id}/edit`, { replace: true });
        return;
      }
    } catch {
      toast.push("Erreur d'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-12 text-center text-muted">Chargement…</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn-icon" onClick={() => navigate("/quizzes")}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title={editing ? "Modifier le quiz" : "Nouveau quiz"}
          subtitle={`${questions.length} question(s) • ${totalPoints} pt(s)`}
          actions={
            <button className="btn-primary" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "…" : "Enregistrer"}
            </button>
          }
        />
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Titre *</label>
            <input
              className="input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="QCM Algorithmes - Niveau 1"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="label">Niveau</label>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">—</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Matière</label>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">—</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Limite de temps (min)</label>
            <input
              type="number"
              className="input"
              value={timeLimit}
              min={0}
              onChange={(e) => setTimeLimit(Number(e.target.value) || 0)}
              placeholder="0 = sans limite"
            />
          </div>
          <div className="flex flex-col gap-2 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
              />
              Mélanger les questions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publié
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-400" />
              <div className="font-semibold text-sm">Question {qi + 1}</div>
              <select
                className="input w-auto py-1 text-xs"
                value={q.kind}
                onChange={(e) =>
                  updateQuestion(qi, { kind: e.target.value as QuizQuestionKind })
                }
              >
                {(["single", "multiple", "text"] as QuizQuestionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input w-24 py-1 text-xs"
                step={0.5}
                min={0}
                value={q.points}
                onChange={(e) =>
                  updateQuestion(qi, { points: Number(e.target.value) || 0 })
                }
                placeholder="Points"
              />
              <button
                className="btn-icon ml-auto text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                onClick={() => removeQuestion(qi)}
                title="Supprimer la question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <textarea
              className="input min-h-[60px]"
              placeholder="Énoncé de la question"
              value={q.prompt}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            />

            <details>
              <summary className="text-xs text-muted cursor-pointer inline-flex items-center gap-1">
                <Code2 className="w-3 h-3" /> Ajouter un extrait de code (optionnel)
              </summary>
              <div className="mt-2">
                <CodeEditor
                  value={q.code_snippet}
                  onChange={(v) => updateQuestion(qi, { code_snippet: v })}
                  language="python"
                  height="120px"
                />
              </div>
            </details>

            {q.kind === "text" ? (
              <div>
                <label className="label">Réponse attendue (insensible à la casse)</label>
                <input
                  className="input"
                  value={q.expected_text}
                  onChange={(e) => updateQuestion(qi, { expected_text: e.target.value })}
                  placeholder="ex: 42"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted">Choix (coche la/les bonne(s) réponse(s))</div>
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type={q.kind === "single" ? "radio" : "checkbox"}
                      name={`q${qi}-correct`}
                      checked={c.is_correct}
                      onChange={(e) =>
                        updateChoice(qi, ci, { is_correct: e.target.checked })
                      }
                    />
                    <input
                      className="input flex-1"
                      value={c.text}
                      onChange={(e) => updateChoice(qi, ci, { text: e.target.value })}
                      placeholder={`Choix ${ci + 1}`}
                    />
                    <button
                      className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={() => removeChoice(qi, ci)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button className="btn-secondary" onClick={() => addChoice(qi)}>
                  <Plus className="w-4 h-4" /> Ajouter un choix
                </button>
              </div>
            )}

            <textarea
              className="input min-h-[40px] text-xs"
              placeholder="Explication / correction (affichée après réponse)"
              value={q.explanation}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
            />
          </div>
        ))}
        <button className="btn-secondary" onClick={addQuestion}>
          <ListChecks className="w-4 h-4" /> Ajouter une question
        </button>
      </div>
    </div>
  );
}
