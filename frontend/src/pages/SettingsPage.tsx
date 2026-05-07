import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api } from "../lib/api";
import type { Level, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-md border-2 ${value === c ? "border-slate-900 scale-110" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [levelOpen, setLevelOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [levelName, setLevelName] = useState("");
  const [levelColor, setLevelColor] = useState("#6366f1");

  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#0ea5e9");

  async function load() {
    const [l, s] = await Promise.all([
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setLevels(l.data);
    setSubjects(s.data);
  }
  useEffect(() => {
    load();
  }, []);

  function openLevelForm(l: Level | null) {
    setEditingLevel(l);
    setLevelName(l?.name || "");
    setLevelColor(l?.color || "#6366f1");
    setLevelOpen(true);
  }

  async function saveLevel(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: levelName, color: levelColor, sort_order: editingLevel?.sort_order ?? 99 };
    try {
      if (editingLevel) {
        await api.put(`/api/levels/${editingLevel.id}`, payload);
      } else {
        await api.post("/api/levels", payload);
      }
      toast.push("Niveau enregistré", "success");
      setLevelOpen(false);
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  async function deleteLevel(l: Level) {
    if (!confirm(`Supprimer "${l.name}" ?`)) return;
    try {
      await api.delete(`/api/levels/${l.id}`);
      toast.push("Niveau supprimé", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  function openSubjectForm(s: Subject | null) {
    setEditingSubject(s);
    setSubjectName(s?.name || "");
    setSubjectColor(s?.color || "#0ea5e9");
    setSubjectOpen(true);
  }

  async function saveSubject(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: subjectName, color: subjectColor, icon: "book" };
    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}`, payload);
      } else {
        await api.post("/api/subjects", payload);
      }
      toast.push("Matière enregistrée", "success");
      setSubjectOpen(false);
      load();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Erreur";
      toast.push(detail, "error");
    }
  }

  async function deleteSubject(s: Subject) {
    if (!confirm(`Supprimer "${s.name}" ?`)) return;
    try {
      await api.delete(`/api/subjects/${s.id}`);
      toast.push("Matière supprimée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Paramètres" subtitle="Gère tes niveaux, matières et préférences." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Niveaux</h2>
              <p className="text-xs text-slate-500">Classes officielles ou personnalisées</p>
            </div>
            <button className="btn-primary" onClick={() => openLevelForm(null)}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-1.5">
            {levels.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span className="font-medium text-slate-800 flex-1">{l.name}</span>
                <button className="btn-icon opacity-0 group-hover:opacity-100" onClick={() => openLevelForm(l)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="btn-icon text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteLevel(l)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Matières</h2>
              <p className="text-xs text-slate-500">Algorithmique, Python, Réseaux…</p>
            </div>
            <button className="btn-primary" onClick={() => openSubjectForm(null)}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                <span className="font-medium text-slate-800 flex-1">{s.name}</span>
                <button className="btn-icon opacity-0 group-hover:opacity-100" onClick={() => openSubjectForm(s)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="btn-icon text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteSubject(s)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Compte</h2>
          <div className="text-sm space-y-1 text-slate-700">
            <div>
              <span className="text-slate-500">Nom :</span> {user?.full_name}
            </div>
            <div>
              <span className="text-slate-500">Email :</span> {user?.email}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            La modification du compte sera disponible dans une prochaine version.
          </div>
        </div>
      </div>

      <Modal
        open={levelOpen}
        onClose={() => setLevelOpen(false)}
        title={editingLevel ? "Modifier le niveau" : "Nouveau niveau"}
      >
        <form onSubmit={saveLevel} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={levelName} onChange={(e) => setLevelName(e.target.value)} />
          </div>
          <div>
            <label className="label">Couleur</label>
            <ColorPicker value={levelColor} onChange={setLevelColor} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setLevelOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={subjectOpen}
        onClose={() => setSubjectOpen(false)}
        title={editingSubject ? "Modifier la matière" : "Nouvelle matière"}
      >
        <form onSubmit={saveSubject} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Couleur</label>
            <ColorPicker value={subjectColor} onChange={setSubjectColor} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setSubjectOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
