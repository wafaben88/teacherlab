import { useEffect, useMemo, useState } from "react";
import { Save, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { Attendance, AttendanceStatus, Student } from "../../lib/types";
import { useToast } from "../Toast";
import { EmptyState } from "../EmptyState";
import { Users } from "lucide-react";

interface Props {
  classId: number;
}

const STATUSES: { code: AttendanceStatus; label: string; color: string; Icon: typeof CheckCircle2 }[] = [
  { code: "present", label: "Présent", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200", Icon: CheckCircle2 },
  { code: "absent", label: "Absent", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200", Icon: XCircle },
  { code: "retard", label: "Retard", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200", Icon: Clock },
  { code: "justifie", label: "Justifié", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200", Icon: ShieldCheck },
];

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function AttendanceTab({ classId }: Props) {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [history, setHistory] = useState<Attendance[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      api.get<Student[]>("/api/students", { params: { class_id: classId } }),
      api.get<Attendance[]>("/api/attendance", { params: { class_id: classId } }),
    ]);
    setStudents(r1.data);
    const initial: Record<number, AttendanceStatus> = {};
    for (const s of r1.data) initial[s.id] = "present";
    // Pre-fill from existing entries for this date
    for (const a of r2.data) {
      if (a.date.slice(0, 10) === date) initial[a.student_id] = a.status;
    }
    setStatuses(initial);
    setHistory(r2.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [classId]);

  useEffect(() => {
    // refresh statuses when date changes
    const initial: Record<number, AttendanceStatus> = {};
    for (const s of students) initial[s.id] = "present";
    for (const a of history) {
      if (a.date.slice(0, 10) === date) initial[a.student_id] = a.status;
    }
    setStatuses(initial);
  }, [date, history, students]);

  const summary = useMemo(() => {
    const out: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      retard: 0,
      justifie: 0,
    };
    for (const v of Object.values(statuses)) out[v] += 1;
    return out;
  }, [statuses]);

  async function save() {
    setSaving(true);
    try {
      // Delete existing entries for this class+date, then create fresh
      const existing = history.filter((a) => a.date.slice(0, 10) === date);
      await Promise.all(existing.map((a) => api.delete(`/api/attendance/${a.id}`)));
      await api.post("/api/attendance/bulk", {
        class_id: classId,
        date: new Date(date + "T12:00:00").toISOString(),
        entries: students.map((s) => ({
          student_id: s.id,
          status: statuses[s.id] || "present",
        })),
      });
      toast.push("Appel enregistré", "success");
      await load();
    } catch {
      toast.push("Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-8 text-center text-muted">Chargement…</div>;
  }

  if (students.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Users}
          title="Pas d'élèves"
          description="Ajoute d'abord des élèves dans l'onglet Élèves pour faire l'appel."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted" />
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {STATUSES.map((s) => (
            <span key={s.code} className={`px-2 py-1 rounded-md ${s.color}`}>
              {s.label} : {summary[s.code]}
            </span>
          ))}
        </div>
        <div className="ml-auto">
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "…" : "Enregistrer l'appel"}
          </button>
        </div>
      </div>

      <div className="card divide-y divide-slate-100 dark:divide-slate-700/60">
        {students.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="font-medium">
              {s.last_name} {s.first_name}
            </div>
            <div className="flex gap-1">
              {STATUSES.map((st) => {
                const active = statuses[s.id] === st.code;
                return (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => setStatuses((prev) => ({ ...prev, [s.id]: st.code }))}
                    className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 transition ${
                      active
                        ? st.color + " ring-1 ring-current"
                        : "text-muted hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <st.Icon className="w-3.5 h-3.5" /> {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
