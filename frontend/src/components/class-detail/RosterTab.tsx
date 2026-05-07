import { useEffect, useRef, useState } from "react";
import { Plus, Upload, Trash2, Pencil, FileDown, Mail } from "lucide-react";
import { api, downloadPdf } from "../../lib/api";
import type { Student } from "../../lib/types";
import { useToast } from "../Toast";
import { Modal } from "../Modal";
import { EmptyState } from "../EmptyState";
import { Users } from "lucide-react";

interface Props {
  classId: number;
}

interface FormState {
  open: boolean;
  editing: Student | null;
}

export function RosterTab({ classId }: Props) {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ open: false, editing: null });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const r = await api.get<Student[]>("/api/students", { params: { class_id: classId } });
    setStudents(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [classId]);

  async function deleteStudent(s: Student) {
    if (!confirm(`Supprimer ${s.first_name} ${s.last_name} ?`)) return;
    await api.delete(`/api/students/${s.id}`);
    toast.push("Élève supprimé", "success");
    load();
  }

  async function importCsv(file: File) {
    const fd = new FormData();
    fd.append("upload", file);
    try {
      const r = await api.post<Student[]>("/api/students/import", fd, {
        params: { class_id: classId },
      });
      toast.push(`${r.data.length} élèves importés`, "success");
      load();
    } catch {
      toast.push("Échec de l'import", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Liste des élèves</h3>
          <p className="text-xs text-muted">{students.length} élève(s) inscrit(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-secondary"
            disabled={students.filter((s) => s.parent_email).length === 0}
            onClick={() => {
              const emails = students
                .map((s) => s.parent_email)
                .filter((e) => !!e)
                .join(",");
              if (!emails) return;
              window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}`;
            }}
            title="Envoyer un email à tous les parents (BCC)"
          >
            <Mail className="w-4 h-4" /> Email parents
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              downloadPdf(
                `/api/exports/class/${classId}/grades.pdf`,
                `bulletin_classe_${classId}.pdf`,
              )
            }
          >
            <FileDown className="w-4 h-4" /> Bulletin classe
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importer CSV
          </button>
          <button
            className="btn-primary"
            onClick={() => setForm({ open: true, editing: null })}
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-muted">Chargement…</div>
      ) : students.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Aucun élève"
            description="Ajoute des élèves un par un, ou importe un CSV (colonnes : nom, prenom, email, parent_email)."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Élève</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Email parent</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700/60">
                  <td className="px-4 py-2 font-medium">
                    {s.last_name} {s.first_name}
                    {s.notes && (
                      <div className="text-xs text-muted line-clamp-1 mt-0.5">{s.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className="hover:underline inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {s.email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {s.parent_email ? (
                      <a href={`mailto:${s.parent_email}`} className="hover:underline inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {s.parent_email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        className="btn-icon"
                        title="Bulletin individuel"
                        onClick={() =>
                          downloadPdf(
                            `/api/exports/student/${s.id}/report.pdf`,
                            `bulletin_${s.last_name}_${s.first_name}.pdf`,
                          )
                        }
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-icon"
                        title="Modifier"
                        onClick={() => setForm({ open: true, editing: s })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        title="Supprimer"
                        onClick={() => deleteStudent(s)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentForm
        classId={classId}
        open={form.open}
        student={form.editing}
        onClose={() => setForm({ open: false, editing: null })}
        onSaved={load}
      />
    </div>
  );
}

interface StudentFormProps {
  classId: number;
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}

function StudentForm({ classId, open, student, onClose, onSaved }: StudentFormProps) {
  const toast = useToast();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setFirst(student?.first_name || "");
      setLast(student?.last_name || "");
      setEmail(student?.email || "");
      setParentEmail(student?.parent_email || "");
      setNotes(student?.notes || "");
    }
  }, [open, student]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      class_id: classId,
      first_name: first,
      last_name: last,
      email,
      parent_email: parentEmail,
      notes,
    };
    try {
      if (student) {
        await api.put(`/api/students/${student.id}`, payload);
        toast.push("Élève mis à jour", "success");
      } else {
        await api.post("/api/students", payload);
        toast.push("Élève ajouté", "success");
      }
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={student ? "Modifier l'élève" : "Nouvel élève"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom *</label>
            <input className="input" required value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div>
            <label className="label">Nom *</label>
            <input className="input" required value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="eleve@exemple.fr"
          />
        </div>
        <div>
          <label className="label">Email parent</label>
          <input
            type="email"
            className="input"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@exemple.fr"
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Profil, infos utiles…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            {student ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
