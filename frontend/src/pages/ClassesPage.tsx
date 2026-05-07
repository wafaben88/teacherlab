import { useEffect, useState } from "react";
import { GraduationCap, Plus, Pencil, Trash2, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Level, SchoolClass } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";

interface FormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cls: SchoolClass | null;
  levels: Level[];
}

function ClassForm({ open, onClose, onSaved, cls, levels }: FormProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [year, setYear] = useState("2025-2026");
  const [count, setCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cls) {
      setName(cls.name);
      setLevelId(String(cls.level_id));
      setYear(cls.school_year);
      setCount(cls.student_count);
      setNotes(cls.notes);
    } else if (open) {
      setName("");
      setLevelId(levels[0] ? String(levels[0].id) : "");
      setYear("2025-2026");
      setCount(0);
      setNotes("");
    }
  }, [cls, open, levels]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!levelId) {
      toast.push("Choisis un niveau", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      name,
      level_id: Number(levelId),
      school_year: year,
      student_count: count,
      notes,
    };
    try {
      if (cls) {
        await api.put(`/api/classes/${cls.id}`, payload);
        toast.push("Classe mise à jour", "success");
      } else {
        await api.post("/api/classes", payload);
        toast.push("Classe créée", "success");
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
    <Modal open={open} onClose={onClose} title={cls ? "Modifier la classe" : "Nouvelle classe"} width="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Nom *</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: 4SI1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Niveau *</label>
            <select className="input" required value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">—</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Année</label>
            <input className="input" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Nombre d'élèves</label>
          <input
            className="input"
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, infos sur le profil de la classe…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : cls ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ClassesPage() {
  const toast = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);

  async function load() {
    setLoading(true);
    const [c, l] = await Promise.all([
      api.get<SchoolClass[]>("/api/classes"),
      api.get<Level[]>("/api/levels"),
    ]);
    setClasses(c.data);
    setLevels(l.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onDelete(c: SchoolClass) {
    if (!confirm(`Supprimer la classe "${c.name}" ?`)) return;
    try {
      await api.delete(`/api/classes/${c.id}`);
      toast.push("Classe supprimée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classes"
        subtitle="Gère tes classes et leurs effectifs."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Nouvelle classe
          </button>
        }
      />

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : classes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="Aucune classe"
            description="Ajoute tes classes pour les associer à ton planning et à tes notes."
            action={
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Nouvelle classe
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="card p-5 group hover:shadow-glow transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: c.level?.color || "#6366f1" }}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold leading-tight">{c.name}</div>
                      <div className="text-xs text-muted">{c.level?.name}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditing(c);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => onDelete(c)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {c.student_count} élèves
                </span>
                <span className="text-xs text-muted">{c.school_year}</span>
              </div>
              {c.notes && <p className="text-sm text-muted mt-2 line-clamp-2">{c.notes}</p>}
              <Link
                to={`/classes/${c.id}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-300 hover:underline"
              >
                Ouvrir <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <ClassForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        cls={editing}
        levels={levels}
      />
    </div>
  );
}
