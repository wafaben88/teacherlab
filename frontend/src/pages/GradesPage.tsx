import { useEffect, useMemo, useState } from "react";
import { Award, Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import type { Grade, SchoolClass, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

interface FormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  grade: Grade | null;
  classes: SchoolClass[];
  subjects: Subject[];
}

function GradeForm({ open, onClose, onSaved, grade, classes, subjects }: FormProps) {
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [assessment, setAssessment] = useState("");
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(20);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (grade) {
      setClassId(String(grade.class_id));
      setSubjectId(grade.subject_id ? String(grade.subject_id) : "");
      setStudentName(grade.student_name);
      setAssessment(grade.assessment_title);
      setScore(grade.score);
      setMaxScore(grade.max_score);
      setDate(grade.date.slice(0, 10));
      setNotes(grade.notes);
    } else if (open) {
      setClassId(classes[0] ? String(classes[0].id) : "");
      setSubjectId("");
      setStudentName("");
      setAssessment("Évaluation");
      setScore(0);
      setMaxScore(20);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [grade, open, classes]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      toast.push("Choisis une classe", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      class_id: Number(classId),
      subject_id: subjectId ? Number(subjectId) : null,
      student_name: studentName,
      assessment_title: assessment,
      score,
      max_score: maxScore,
      date: new Date(date).toISOString(),
      notes,
    };
    try {
      if (grade) {
        await api.put(`/api/grades/${grade.id}`, payload);
        toast.push("Note mise à jour", "success");
      } else {
        await api.post("/api/grades", payload);
        toast.push("Note ajoutée", "success");
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
    <Modal open={open} onClose={onClose} title={grade ? "Modifier la note" : "Nouvelle note"} width="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Classe *</label>
            <select className="input" required value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <label className="label">Élève *</label>
          <input
            className="input"
            required
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Prénom Nom"
          />
        </div>
        <div>
          <label className="label">Titre de l'évaluation</label>
          <input className="input" value={assessment} onChange={(e) => setAssessment(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Note</label>
            <input
              className="input"
              type="number"
              step="0.25"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Sur</label>
            <input
              className="input"
              type="number"
              step="0.5"
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
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
            {submitting ? "…" : grade ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GradesPage() {
  const toast = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);

  async function load() {
    setLoading(true);
    const [g, c, s] = await Promise.all([
      api.get<Grade[]>("/api/grades"),
      api.get<SchoolClass[]>("/api/classes"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setGrades(g.data);
    setClasses(c.data);
    setSubjects(s.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!filterClass) return grades;
    return grades.filter((g) => String(g.class_id) === filterClass);
  }, [grades, filterClass]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const ratios = filtered.map((g) => (g.score / g.max_score) * 20);
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return {
      avg: avg.toFixed(2),
      min: Math.min(...ratios).toFixed(2),
      max: Math.max(...ratios).toFixed(2),
      count: filtered.length,
    };
  }, [filtered]);

  async function onDelete(g: Grade) {
    if (!confirm(`Supprimer la note de ${g.student_name} ?`)) return;
    try {
      await api.delete(`/api/grades/${g.id}`);
      toast.push("Note supprimée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notes & Évaluations"
        subtitle="Suivi des notes par classe et par élève."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            disabled={classes.length === 0}
          >
            <Plus className="w-4 h-4" /> Ajouter une note
          </button>
        }
      />

      {classes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Award}
            title="Crée d'abord une classe"
            description="Tu dois ajouter au moins une classe avant de pouvoir saisir des notes."
          />
        </div>
      ) : (
        <>
          <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
            <select className="input max-w-xs" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {stats && (
              <div className="flex flex-wrap gap-3 ml-auto text-sm">
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Moyenne : <strong>{stats.avg}/20</strong>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg">
                  Min : <strong>{stats.min}</strong>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg">
                  Max : <strong>{stats.max}</strong>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg">
                  {stats.count} note{stats.count > 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="card p-12 text-center text-slate-500">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Award}
                title="Aucune note"
                description="Commence par saisir ta première note d'évaluation."
                action={
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Ajouter une note
                  </button>
                }
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Élève</th>
                      <th className="text-left px-4 py-3 font-semibold">Classe</th>
                      <th className="text-left px-4 py-3 font-semibold">Évaluation</th>
                      <th className="text-left px-4 py-3 font-semibold">Note</th>
                      <th className="text-left px-4 py-3 font-semibold">Date</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((g) => {
                      const ratio = g.score / g.max_score;
                      const ratioColor =
                        ratio >= 0.7
                          ? "text-emerald-600"
                          : ratio >= 0.5
                          ? "text-amber-600"
                          : "text-rose-600";
                      return (
                        <tr key={g.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{g.student_name}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {g.school_class?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{g.assessment_title}</td>
                          <td className={`px-4 py-3 font-semibold ${ratioColor}`}>
                            {g.score}/{g.max_score}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(g.date)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                className="btn-icon"
                                onClick={() => {
                                  setEditing(g);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="btn-icon text-rose-500 hover:bg-rose-50"
                                onClick={() => onDelete(g)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <GradeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        grade={editing}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
