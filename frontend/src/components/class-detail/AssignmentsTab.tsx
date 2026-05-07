import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { Assignment, Subject, Submission, SubmissionStatus } from "../../lib/types";
import { useToast } from "../Toast";
import { EmptyState } from "../EmptyState";
import { Modal } from "../Modal";

interface Props {
  classId: number;
}

const STATUS_OPTS: { code: SubmissionStatus; label: string; color: string }[] = [
  { code: "pending", label: "À faire", color: "text-slate-600 bg-slate-100 dark:bg-slate-700/40 dark:text-slate-300" },
  { code: "submitted", label: "Rendu", color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200" },
  { code: "late", label: "En retard", color: "text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200" },
  { code: "missing", label: "Manquant", color: "text-rose-700 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200" },
  { code: "graded", label: "Corrigé", color: "text-sky-700 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200" },
];

export function AssignmentsTab({ classId }: Props) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      api.get<Assignment[]>("/api/assignments", { params: { class_id: classId } }),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setAssignments(r1.data);
    setSubjects(r2.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [classId]);

  async function deleteAssignment(a: Assignment) {
    if (!confirm(`Supprimer le devoir "${a.title}" ?`)) return;
    await api.delete(`/api/assignments/${a.id}`);
    toast.push("Devoir supprimé", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Devoirs à rendre</h3>
          <p className="text-xs text-muted">Suivi des soumissions par élève</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Nouveau devoir
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-muted">Chargement…</div>
      ) : assignments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardCheck}
            title="Aucun devoir"
            description="Crée un devoir et chaque élève recevra une entrée à suivre."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button
                  className="btn-icon"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  aria-label="Toggle"
                >
                  {expanded === a.id ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-muted">
                    {a.subject?.name && <>{a.subject.name} • </>}
                    {a.due_date
                      ? `À rendre pour ${new Date(a.due_date).toLocaleDateString("fr-FR")}`
                      : "Sans échéance"}
                    {" • "}
                    Sur {a.max_score} pts
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setEditing(a);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  onClick={() => deleteAssignment(a)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {expanded === a.id && <SubmissionsList assignmentId={a.id} maxScore={a.max_score} />}
            </div>
          ))}
        </div>
      )}

      <AssignmentForm
        classId={classId}
        subjects={subjects}
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function SubmissionsList({ assignmentId, maxScore }: { assignmentId: number; maxScore: number }) {
  const toast = useToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await api.get<Submission[]>(`/api/assignments/${assignmentId}/submissions`);
    setItems(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [assignmentId]);

  async function update(s: Submission, patch: Partial<Submission>) {
    const payload = {
      assignment_id: s.assignment_id,
      student_id: s.student_id,
      status: patch.status ?? s.status,
      submitted_at: patch.submitted_at ?? s.submitted_at,
      score: patch.score ?? s.score,
      feedback: patch.feedback ?? s.feedback,
    };
    await api.put(`/api/assignments/submissions/${s.id}`, payload);
    toast.push("Soumission mise à jour", "success");
    load();
  }

  if (loading) return <div className="px-4 pb-4 text-xs text-muted">Chargement…</div>;
  if (items.length === 0)
    return <div className="px-4 pb-4 text-xs text-muted">Pas d'élèves dans cette classe.</div>;

  return (
    <div className="border-t border-slate-100 dark:border-slate-700/60">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/60 dark:bg-slate-800/40 text-xs text-muted">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Élève</th>
            <th className="text-left px-4 py-2 font-medium">Statut</th>
            <th className="text-left px-4 py-2 font-medium">Note</th>
            <th className="text-left px-4 py-2 font-medium">Commentaire</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700/60">
              <td className="px-4 py-2">
                {s.student ? `${s.student.last_name} ${s.student.first_name}` : `#${s.student_id}`}
              </td>
              <td className="px-4 py-2">
                <select
                  className="input py-1 text-xs"
                  value={s.status}
                  onChange={(e) => update(s, { status: e.target.value as SubmissionStatus })}
                >
                  {STATUS_OPTS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="input py-1 text-xs w-24"
                  min={0}
                  max={maxScore}
                  step={0.25}
                  value={s.score ?? ""}
                  onChange={(e) =>
                    update(s, {
                      score: e.target.value === "" ? null : Number(e.target.value),
                      status: e.target.value === "" ? s.status : "graded",
                    })
                  }
                  placeholder="—"
                />
                <span className="ml-1 text-xs text-muted">/ {maxScore}</span>
              </td>
              <td className="px-4 py-2">
                <input
                  className="input py-1 text-xs"
                  value={s.feedback}
                  onChange={(e) => update(s, { feedback: e.target.value })}
                  placeholder="Remarque…"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FormProps {
  classId: number;
  subjects: Subject[];
  open: boolean;
  editing: Assignment | null;
  onClose: () => void;
  onSaved: () => void;
}

function AssignmentForm({ classId, subjects, open, editing, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [due, setDue] = useState("");
  const [maxScore, setMaxScore] = useState(20);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || "");
      setDescription(editing?.description || "");
      setSubjectId(editing?.subject_id ? String(editing.subject_id) : "");
      setDue(editing?.due_date ? editing.due_date.slice(0, 10) : "");
      setMaxScore(editing?.max_score || 20);
    }
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      description,
      class_id: classId,
      subject_id: subjectId ? Number(subjectId) : null,
      due_date: due ? new Date(due + "T23:59:00").toISOString() : null,
      max_score: maxScore,
    };
    try {
      if (editing) {
        await api.put(`/api/assignments/${editing.id}`, payload);
        toast.push("Devoir modifié", "success");
      } else {
        await api.post("/api/assignments", payload);
        toast.push("Devoir créé", "success");
      }
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Modifier le devoir" : "Nouveau devoir"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Titre *</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Matière</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">—</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">À rendre le</label>
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <label className="label">Note max</label>
            <input
              type="number"
              className="input"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value) || 20)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            {editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
