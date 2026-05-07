import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Calculator,
  GraduationCap,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  Level,
  Rubric,
  RubricCriterion,
  RubricEvaluation,
  SchoolClass,
  Student,
  Subject,
} from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

interface RubricFormProps {
  open: boolean;
  rubric: Rubric | null;
  subjects: Subject[];
  levels: Level[];
  onClose: () => void;
  onSaved: () => void;
}

type CriterionDraft = Omit<RubricCriterion, "id"> & { id?: number };

function RubricForm({ open, rubric, subjects, levels, onClose, onSaved }: RubricFormProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [maxScore, setMaxScore] = useState(20);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (rubric) {
      setTitle(rubric.title);
      setDescription(rubric.description || "");
      setSubjectId(rubric.subject_id ? String(rubric.subject_id) : "");
      setLevelId(rubric.level_id ? String(rubric.level_id) : "");
      setMaxScore(rubric.max_score || 20);
      setCriteria(
        rubric.criteria.map((c) => ({
          id: c.id,
          position: c.position,
          name: c.name,
          description: c.description,
          weight: c.weight,
          max_score: c.max_score,
        })),
      );
    } else {
      setTitle("");
      setDescription("");
      setSubjectId("");
      setLevelId("");
      setMaxScore(20);
      setCriteria([
        { position: 0, name: "Critère 1", description: "", weight: 1, max_score: 4 },
      ]);
    }
  }, [rubric, open]);

  function updateCriterion(idx: number, patch: Partial<CriterionDraft>) {
    setCriteria((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addCriterion() {
    setCriteria((cs) => [
      ...cs,
      {
        position: cs.length,
        name: `Critère ${cs.length + 1}`,
        description: "",
        weight: 1,
        max_score: 4,
      },
    ]);
  }

  function removeCriterion(idx: number) {
    setCriteria((cs) => cs.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.push("Donne un titre à la grille", "error");
      return;
    }
    if (criteria.length === 0) {
      toast.push("Ajoute au moins un critère", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      title,
      description,
      subject_id: subjectId ? Number(subjectId) : null,
      level_id: levelId ? Number(levelId) : null,
      max_score: maxScore,
      criteria: criteria.map((c, i) => ({
        position: i,
        name: c.name,
        description: c.description,
        weight: c.weight,
        max_score: c.max_score,
      })),
    };
    try {
      if (rubric) {
        await api.put(`/api/rubrics/${rubric.id}`, payload);
        toast.push("Grille mise à jour", "success");
      } else {
        await api.post("/api/rubrics", payload);
        toast.push("Grille créée", "success");
      }
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rubric ? "Modifier la grille" : "Nouvelle grille d'évaluation"}
      width="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Projet algorithme — fin de semestre"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Niveau</label>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">— Aucun —</option>
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
              <option value="">— Aucune —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Note finale sur</label>
            <input
              className="input"
              type="number"
              step="0.5"
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="label !mb-0">Critères pondérés</div>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={addCriterion}
            >
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {criteria.map((c, idx) => (
              <div
                key={idx}
                className="card p-3 grid grid-cols-12 gap-2 items-start"
              >
                <input
                  className="input col-span-4"
                  value={c.name}
                  onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                  placeholder="Nom du critère"
                />
                <input
                  className="input col-span-4"
                  value={c.description}
                  onChange={(e) =>
                    updateCriterion(idx, { description: e.target.value })
                  }
                  placeholder="Description"
                />
                <input
                  className="input col-span-1"
                  type="number"
                  step="0.5"
                  value={c.weight}
                  onChange={(e) =>
                    updateCriterion(idx, { weight: Number(e.target.value) })
                  }
                  title="Poids"
                />
                <input
                  className="input col-span-2"
                  type="number"
                  step="0.5"
                  value={c.max_score}
                  onChange={(e) =>
                    updateCriterion(idx, { max_score: Number(e.target.value) })
                  }
                  title="Niveau max"
                />
                <button
                  type="button"
                  className="btn-icon col-span-1 text-rose-500"
                  onClick={() => removeCriterion(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Note finale = somme(score_critère / max_critère × poids) ÷ somme(poids) × note finale.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : rubric ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface EvalFormProps {
  rubric: Rubric;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  classes: SchoolClass[];
  students: Student[];
}

function EvaluateModal({ rubric, open, onClose, onSaved, classes, students }: EvalFormProps) {
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentLabel, setStudentLabel] = useState("");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setClassId("");
      setStudentId("");
      setStudentLabel("");
      setScores(Object.fromEntries(rubric.criteria.map((c) => [c.id, 0])));
      setNotes("");
    }
  }, [rubric, open]);

  const finalPreview = useMemo(() => {
    if (rubric.criteria.length === 0) return 0;
    let total = 0;
    let weight = 0;
    for (const c of rubric.criteria) {
      const raw = Number(scores[c.id] || 0);
      const ratio = raw / (c.max_score || 1);
      total += ratio * (c.weight || 0);
      weight += c.weight || 0;
    }
    if (weight <= 0) return 0;
    return Math.round((total / weight) * (rubric.max_score || 20) * 100) / 100;
  }, [rubric, scores]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/rubric-evaluations", {
        rubric_id: rubric.id,
        student_id: studentId ? Number(studentId) : null,
        student_label: studentLabel,
        class_id: classId ? Number(classId) : null,
        scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Number(v)])),
        notes,
      });
      toast.push("Évaluation enregistrée", "success");
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredStudents = classId
    ? students.filter((s) => String(s.class_id) === classId)
    : students;

  return (
    <Modal open={open} onClose={onClose} title={`Évaluer : ${rubric.title}`} width="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Classe</label>
            <select
              className="input"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStudentId("");
              }}
            >
              <option value="">— Aucune —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Élève</label>
            <select
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">— Manuel —</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ou nom libre</label>
            <input
              className="input"
              value={studentLabel}
              onChange={(e) => setStudentLabel(e.target.value)}
              placeholder="Prénom Nom"
            />
          </div>
        </div>

        <div className="space-y-2">
          {rubric.criteria.map((c) => (
            <div key={c.id} className="card p-3 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <div className="font-medium text-sm">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-slate-500">{c.description}</div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  Poids {c.weight} • Sur {c.max_score}
                </div>
              </div>
              <input
                className="input col-span-3"
                type="number"
                min={0}
                step="0.25"
                max={c.max_score}
                value={scores[c.id] ?? 0}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))
                }
              />
              <div className="col-span-3 text-xs text-slate-500">
                / {c.max_score}
              </div>
            </div>
          ))}
        </div>

        <div className="card p-3 flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30">
          <Calculator className="w-5 h-5 text-brand-600" />
          <span className="font-semibold">
            Note finale prévisionnelle : {finalPreview} / {rubric.max_score}
          </span>
        </div>

        <div>
          <label className="label">Notes / commentaires</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RubricsPage() {
  const toast = useToast();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [evaluations, setEvaluations] = useState<RubricEvaluation[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rubric | null>(null);
  const [evaluating, setEvaluating] = useState<Rubric | null>(null);

  async function load() {
    setLoading(true);
    const [r, e, s, l, c, st] = await Promise.all([
      api.get<Rubric[]>("/api/rubrics"),
      api.get<RubricEvaluation[]>("/api/rubric-evaluations"),
      api.get<Subject[]>("/api/subjects"),
      api.get<Level[]>("/api/levels"),
      api.get<SchoolClass[]>("/api/classes"),
      api.get<Student[]>("/api/students"),
    ]);
    setRubrics(r.data);
    setEvaluations(e.data);
    setSubjects(s.data);
    setLevels(l.data);
    setClasses(c.data);
    setStudents(st.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(r: Rubric) {
    if (!confirm(`Supprimer la grille "${r.title}" ?`)) return;
    try {
      await api.delete(`/api/rubrics/${r.id}`);
      toast.push("Supprimée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  async function deleteEval(ev: RubricEvaluation) {
    if (!confirm("Supprimer cette évaluation ?")) return;
    try {
      await api.delete(`/api/rubric-evaluations/${ev.id}`);
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Grilles d'évaluation"
        subtitle="Crée des grilles pondérées et évalue tes élèves de façon structurée."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Nouvelle grille
          </button>
        }
      />

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : rubrics.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardCheck}
            title="Aucune grille"
            description="Crée ta première grille d'évaluation pour structurer tes corrections."
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Nouvelle grille
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {rubrics.map((r) => {
            const evals = evaluations.filter((e) => e.rubric_id === r.id);
            const avg =
              evals.length > 0
                ? (
                    evals.reduce((acc, e) => acc + e.final_score, 0) / evals.length
                  ).toFixed(2)
                : null;
            return (
              <div key={r.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {r.title}
                    </div>
                    {r.description && (
                      <div className="text-sm text-slate-500 mt-1">{r.description}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.level && (
                        <span
                          className="badge text-white"
                          style={{ background: r.level.color }}
                        >
                          {r.level.name}
                        </span>
                      )}
                      {r.subject && (
                        <span
                          className="badge text-white"
                          style={{ background: r.subject.color }}
                        >
                          {r.subject.name}
                        </span>
                      )}
                      <span className="badge bg-slate-100 text-slate-700">
                        /{r.max_score}
                      </span>
                      <span className="badge bg-slate-100 text-slate-700">
                        {r.criteria.length} critère{r.criteria.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn-icon"
                      onClick={() => setEvaluating(r)}
                      title="Évaluer un élève"
                    >
                      <GraduationCap className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-icon text-rose-500"
                      onClick={() => onDelete(r)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {evals.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold">Évaluations ({evals.length})</span>
                      <span className="text-slate-500">
                        Moyenne {avg}/{r.max_score}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {evals.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/40 rounded-lg px-3 py-1.5"
                        >
                          <span className="truncate">
                            {ev.student
                              ? `${ev.student.first_name} ${ev.student.last_name}`
                              : ev.student_label || "Anonyme"}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold">
                              {ev.final_score}/{r.max_score}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(ev.date)}
                            </span>
                            <button
                              className="text-rose-500 hover:underline text-xs"
                              onClick={() => deleteEval(ev)}
                            >
                              Suppr.
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RubricForm
        open={formOpen}
        rubric={editing}
        subjects={subjects}
        levels={levels}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      {evaluating && (
        <EvaluateModal
          rubric={evaluating}
          open={!!evaluating}
          onClose={() => setEvaluating(null)}
          onSaved={load}
          classes={classes}
          students={students}
        />
      )}
    </div>
  );
}
