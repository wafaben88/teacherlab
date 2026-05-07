import { useEffect, useMemo, useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type {
  Competency,
  CompetencyAssessment,
  CompetencyRating,
  Student,
} from "../../lib/types";
import { useToast } from "../Toast";
import { EmptyState } from "../EmptyState";
import { Modal } from "../Modal";

interface Props {
  classId: number;
  levelId: number | null;
}

const RATINGS: { code: CompetencyRating; label: string; color: string }[] = [
  { code: "acquis", label: "Acquis", color: "bg-emerald-500 text-white" },
  { code: "en_cours", label: "En cours", color: "bg-amber-500 text-white" },
  { code: "non_acquis", label: "Non acquis", color: "bg-rose-500 text-white" },
];

export function CompetenciesTab({ classId, levelId }: Props) {
  const toast = useToast();
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Record<string, CompetencyAssessment>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [c, st] = await Promise.all([
      api.get<Competency[]>("/api/competencies", {
        params: levelId ? { level_id: levelId } : {},
      }),
      api.get<Student[]>("/api/students", { params: { class_id: classId } }),
    ]);
    setCompetencies(c.data);
    setStudents(st.data);
    // Load assessments for each student
    const all: CompetencyAssessment[] = [];
    for (const s of st.data) {
      const r = await api.get<CompetencyAssessment[]>("/api/competencies/assessments", {
        params: { student_id: s.id },
      });
      all.push(...r.data);
    }
    const map: Record<string, CompetencyAssessment> = {};
    for (const a of all) map[`${a.student_id}-${a.competency_id}`] = a;
    setAssessments(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [classId, levelId]);

  async function rate(student: Student, competency: Competency, rating: CompetencyRating) {
    const key = `${student.id}-${competency.id}`;
    const existing = assessments[key];
    if (existing && existing.rating === rating) {
      // toggle off
      await api.delete(`/api/competencies/assessments/${existing.id}`);
      setAssessments((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      return;
    }
    if (existing) {
      await api.delete(`/api/competencies/assessments/${existing.id}`);
    }
    const r = await api.post<CompetencyAssessment>("/api/competencies/assessments", {
      student_id: student.id,
      competency_id: competency.id,
      rating,
    });
    setAssessments((prev) => ({ ...prev, [key]: r.data }));
  }

  async function deleteCompetency(c: Competency) {
    if (!confirm(`Supprimer la compétence "${c.name}" ?`)) return;
    await api.delete(`/api/competencies/${c.id}`);
    toast.push("Compétence supprimée", "success");
    load();
  }

  const summary = useMemo(() => {
    const out: Record<CompetencyRating, number> = { acquis: 0, en_cours: 0, non_acquis: 0 };
    for (const a of Object.values(assessments)) out[a.rating] += 1;
    return out;
  }, [assessments]);

  if (loading) {
    return <div className="card p-8 text-center text-muted">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Compétences</h3>
          <p className="text-xs text-muted">
            Acquis : {summary.acquis} • En cours : {summary.en_cours} • Non acquis : {summary.non_acquis}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Nouvelle compétence
        </button>
      </div>

      {competencies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="Pas de compétences"
            description="Définis des compétences (ex: 'Boucles for', 'Variables') et évalue chaque élève."
          />
        </div>
      ) : students.length === 0 ? (
        <div className="card p-6 text-sm text-muted text-center">
          Ajoute des élèves dans l'onglet Élèves pour les évaluer.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-muted">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-slate-50 dark:bg-slate-800/60">Élève</th>
                {competencies.map((c) => (
                  <th key={c.id} className="text-left px-3 py-2 font-medium">
                    <div className="flex items-center gap-1">
                      {c.code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                          {c.code}
                        </span>
                      )}
                      <span className="truncate max-w-[140px]" title={c.name}>
                        {c.name}
                      </span>
                      <button
                        className="btn-icon ml-auto"
                        onClick={() => deleteCompetency(c)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700/60">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-white dark:bg-slate-900">
                    {s.last_name} {s.first_name}
                  </td>
                  {competencies.map((c) => {
                    const key = `${s.id}-${c.id}`;
                    const a = assessments[key];
                    return (
                      <td key={c.id} className="px-3 py-2">
                        <div className="flex gap-1">
                          {RATINGS.map((r) => {
                            const active = a?.rating === r.code;
                            return (
                              <button
                                key={r.code}
                                type="button"
                                onClick={() => rate(s, c, r.code)}
                                className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center transition ${
                                  active
                                    ? r.color + " ring-2 ring-offset-1 ring-current"
                                    : "bg-slate-100 dark:bg-slate-700/40 text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                                title={r.label}
                              >
                                {r.label[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompetencyForm
        levelId={levelId}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

interface FormProps {
  levelId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function CompetencyForm({ levelId, open, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setDescription("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/api/competencies", {
        code,
        name,
        description,
        level_id: levelId,
      });
      toast.push("Compétence ajoutée", "success");
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle compétence">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Code</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="C1.2"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Nom *</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Utiliser les boucles for"
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            Ajouter
          </button>
        </div>
      </form>
    </Modal>
  );
}
