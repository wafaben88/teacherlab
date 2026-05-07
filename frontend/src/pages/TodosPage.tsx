import { useEffect, useState } from "react";
import { CheckSquare, Plus, Trash2, Calendar, Flag } from "lucide-react";
import { api } from "../lib/api";
import type { TodoTask } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

const PRIORITIES = ["bas", "normal", "haut"];
const PRIORITY_COLORS: Record<string, string> = {
  bas: "text-slate-500",
  normal: "text-sky-600",
  haut: "text-rose-600",
};

export function TodosPage() {
  const toast = useToast();
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");

  async function load() {
    setLoading(true);
    const r = await api.get<TodoTask[]>("/api/todos");
    setTodos(r.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post("/api/todos", {
        title,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setTitle("");
      setPriority("normal");
      setDueDate("");
      toast.push("Tâche ajoutée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  async function toggle(t: TodoTask) {
    await api.put(`/api/todos/${t.id}`, {
      title: t.title,
      done: !t.done,
      priority: t.priority,
      due_date: t.due_date,
    });
    load();
  }

  async function remove(t: TodoTask) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await api.delete(`/api/todos/${t.id}`);
    load();
  }

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="À faire"
        subtitle="Liste de tâches pour ne rien oublier."
      />

      <form onSubmit={onAdd} className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Nouvelle tâche…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="input max-w-[140px]" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                Priorité {p}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input max-w-[160px]"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </form>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : todos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckSquare}
            title="Aucune tâche"
            description="Ajoute des tâches pour suivre tes priorités du jour."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                À faire ({pending.length})
              </h2>
              <div className="card divide-y divide-slate-100">
                {pending.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/50">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggle(t)}
                      className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900">{t.title}</div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                        <span className={`flex items-center gap-1 ${PRIORITY_COLORS[t.priority]}`}>
                          <Flag className="w-3 h-3" /> {t.priority}
                        </span>
                        {t.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(t.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn-icon text-rose-500 hover:bg-rose-50"
                      onClick={() => remove(t)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Terminées ({done.length})
              </h2>
              <div className="card divide-y divide-slate-100">
                {done.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-4 opacity-60">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggle(t)}
                      className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 line-through text-slate-500">{t.title}</div>
                    <button
                      className="btn-icon text-rose-500 hover:bg-rose-50"
                      onClick={() => remove(t)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
