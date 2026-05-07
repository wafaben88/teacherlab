import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  FileDown,
} from "lucide-react";
import { api, downloadPdf } from "../lib/api";
import type { Exercise, Level, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { difficultyBadgeClass, formatDate } from "../lib/format";

const DIFFICULTIES = ["facile", "moyen", "difficile"];

interface FormProps {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  levels: Level[];
  subjects: Subject[];
}

function ExerciseForm({ exercise, open, onClose, onSaved, levels, subjects }: FormProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [solution, setSolution] = useState("");
  const [difficulty, setDifficulty] = useState("moyen");
  const [levelId, setLevelId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (exercise) {
      setTitle(exercise.title);
      setStatement(exercise.statement);
      setSolution(exercise.solution);
      setDifficulty(exercise.difficulty);
      setLevelId(exercise.level_id ? String(exercise.level_id) : "");
      setSubjectId(exercise.subject_id ? String(exercise.subject_id) : "");
      setTags(exercise.tags);
    } else {
      setTitle("");
      setStatement("");
      setSolution("");
      setDifficulty("moyen");
      setLevelId("");
      setSubjectId("");
      setTags("");
    }
  }, [exercise, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title,
      statement,
      solution,
      difficulty,
      level_id: levelId ? Number(levelId) : null,
      subject_id: subjectId ? Number(subjectId) : null,
      tags,
    };
    try {
      if (exercise) {
        await api.put(`/api/exercises/${exercise.id}`, payload);
        toast.push("Exercice mis à jour", "success");
      } else {
        await api.post("/api/exercises", payload);
        toast.push("Exercice créé", "success");
      }
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur de sauvegarde", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise ? "Modifier l'exercice" : "Nouvel exercice"}
      width="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Difficulté</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
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
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— Aucune —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Énoncé</label>
          <textarea
            className="input min-h-[140px] font-mono text-xs"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Énoncé de l'exercice (markdown supporté)"
          />
        </div>
        <div>
          <label className="label">Solution / Correction</label>
          <textarea
            className="input min-h-[120px] font-mono text-xs"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Solution ou indications pour le corrigé"
          />
        </div>
        <div>
          <label className="label">Tags</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tableaux, tri, récursivité"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : exercise ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewExercise({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  return (
    <Modal open={!!exercise} onClose={onClose} title={exercise?.title || ""} width="xl">
      {exercise && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${difficultyBadgeClass(exercise.difficulty)}`}>
              {exercise.difficulty}
            </span>
            {exercise.level && (
              <span className="badge text-white" style={{ background: exercise.level.color }}>
                {exercise.level.name}
              </span>
            )}
            {exercise.subject && (
              <span className="badge text-white" style={{ background: exercise.subject.color }}>
                {exercise.subject.name}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Énoncé</h3>
            <div className="bg-slate-50 rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-800 font-mono">
              {exercise.statement || <span className="text-slate-400">Aucun énoncé</span>}
            </div>
          </div>
          {exercise.solution && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Solution</h3>
              <div className="bg-emerald-50 rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-800 font-mono">
                {exercise.solution}
              </div>
            </div>
          )}
          {exercise.tags && (
            <div className="flex flex-wrap gap-1">
              {exercise.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => (
                <span key={i} className="badge bg-slate-100 text-slate-600">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ExercisesPage() {
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [viewing, setViewing] = useState<Exercise | null>(null);

  async function load() {
    setLoading(true);
    const [e, l, s] = await Promise.all([
      api.get<Exercise[]>("/api/exercises"),
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setExercises(e.data);
    setLevels(l.data);
    setSubjects(s.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (filterLevel && String(ex.level_id) !== filterLevel) return false;
      if (filterDifficulty && ex.difficulty !== filterDifficulty) return false;
      if (s) {
        const h = `${ex.title} ${ex.statement} ${ex.tags}`.toLowerCase();
        if (!h.includes(s)) return false;
      }
      return true;
    });
  }, [exercises, search, filterLevel, filterDifficulty]);

  async function onDelete(ex: Exercise) {
    if (!confirm(`Supprimer "${ex.title}" ?`)) return;
    try {
      await api.delete(`/api/exercises/${ex.id}`);
      toast.push("Exercice supprimé", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Banque d'exercices"
        subtitle="Crée, organise et retrouve facilement tes exercices."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Nouvel exercice
          </button>
        }
      />

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input md:col-span-3" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className="input md:col-span-3"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            <option value="">Toute difficulté</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpenCheck}
            title="Aucun exercice"
            description="Crée ton premier exercice pour alimenter ta banque."
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Nouvel exercice
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => (
            <div key={ex.id} className="card p-5 hover:shadow-glow transition group">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900 truncate flex-1">{ex.title}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`badge ${difficultyBadgeClass(ex.difficulty)}`}>
                  {ex.difficulty}
                </span>
                {ex.level && (
                  <span className="badge text-white" style={{ background: ex.level.color }}>
                    {ex.level.name}
                  </span>
                )}
                {ex.subject && (
                  <span className="badge text-white" style={{ background: ex.subject.color }}>
                    {ex.subject.name}
                  </span>
                )}
              </div>
              {ex.statement && (
                <p className="text-sm text-slate-600 mt-3 line-clamp-3 whitespace-pre-wrap">
                  {ex.statement}
                </p>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">{formatDate(ex.created_at)}</div>
                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition">
                  <button className="btn-icon" onClick={() => setViewing(ex)} title="Voir">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() =>
                      downloadPdf(
                        `/api/exports/exercise/${ex.id}.pdf?with_solution=true`,
                        `${ex.title.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`,
                      )
                    }
                    title="Exporter en PDF (avec correction)"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditing(ex);
                      setFormOpen(true);
                    }}
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => onDelete(ex)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExerciseForm
        exercise={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        levels={levels}
        subjects={subjects}
      />
      <ViewExercise exercise={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
