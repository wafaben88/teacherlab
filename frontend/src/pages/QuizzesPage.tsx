import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  Search,
  Play,
  ChevronRight,
} from "lucide-react";
import { api } from "../lib/api";
import type { Level, Quiz, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

export function QuizzesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Quiz[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  async function load() {
    setLoading(true);
    const [r, l, s] = await Promise.all([
      api.get<Quiz[]>("/api/quizzes"),
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setItems(r.data);
    setLevels(l.data);
    setSubjects(s.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((q) => {
      if (filterLevel && String(q.level_id) !== filterLevel) return false;
      if (s && !`${q.title} ${q.description}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [items, search, filterLevel]);

  async function onDelete(q: Quiz) {
    if (!confirm(`Supprimer le quiz "${q.title}" ?`)) return;
    await api.delete(`/api/quizzes/${q.id}`);
    toast.push("Quiz supprimé", "success");
    load();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quiz & QCM"
        subtitle="Crée des questionnaires auto-corrigés à partager avec tes élèves."
        actions={
          <Link className="btn-primary" to="/quizzes/new">
            <Plus className="w-4 h-4" /> Nouveau quiz
          </Link>
        }
      />

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Rechercher un quiz…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input md:col-span-4"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="">Tous niveaux</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-muted">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ListChecks}
            title={items.length === 0 ? "Aucun quiz" : "Aucun résultat"}
            description="Crée un nouveau quiz pour évaluer tes élèves."
            action={
              <Link className="btn-primary" to="/quizzes/new">
                <Plus className="w-4 h-4" /> Nouveau quiz
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className="card p-5 hover:shadow-glow transition group">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200 flex items-center justify-center shrink-0">
                  <ListChecks className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg truncate">{q.title}</div>
                  <div className="text-xs text-muted">
                    {q.questions.length} question(s) •{" "}
                    {q.questions.reduce((sum, qq) => sum + qq.points, 0)} pt(s) total
                    {q.level && <> • {q.level.name}</>}
                    {q.subject && <> • {q.subject.name}</>}
                    {" • "}créé le {formatDate(q.created_at)}
                  </div>
                  {q.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-1">{q.description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition">
                  <Link
                    to={`/quizzes/${q.id}/take`}
                    className="btn-secondary"
                    title="Lancer"
                  >
                    <Play className="w-4 h-4" /> Lancer
                  </Link>
                  <Link to={`/quizzes/${q.id}/edit`} className="btn-icon" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => onDelete(q)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/quizzes/${q.id}/take`}
                    className="btn-icon"
                    title="Détails"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* subjects passed implicitly via levels for filter, kept for parity */}
      <input type="hidden" value={subjects.length} readOnly />
    </div>
  );
}
