import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  CalendarCheck,
  ClipboardCheck,
  Target,
  FileDown,
} from "lucide-react";
import { api, downloadPdf } from "../lib/api";
import type { SchoolClass } from "../lib/types";
import { RosterTab } from "../components/class-detail/RosterTab";
import { AttendanceTab } from "../components/class-detail/AttendanceTab";
import { AssignmentsTab } from "../components/class-detail/AssignmentsTab";
import { CompetenciesTab } from "../components/class-detail/CompetenciesTab";

type TabId = "roster" | "attendance" | "assignments" | "competencies";

const TABS: { id: TabId; label: string; Icon: typeof Users }[] = [
  { id: "roster", label: "Élèves", Icon: Users },
  { id: "attendance", label: "Présence", Icon: CalendarCheck },
  { id: "assignments", label: "Devoirs", Icon: ClipboardCheck },
  { id: "competencies", label: "Compétences", Icon: Target },
];

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cls, setCls] = useState<SchoolClass | null>(null);
  const [tab, setTab] = useState<TabId>("roster");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<SchoolClass>(`/api/classes/${id}`)
      .then((r) => {
        if (!cancelled) setCls(r.data);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="card p-12 text-center text-muted">Chargement…</div>;
  }

  if (!cls) {
    return (
      <div className="card p-12 text-center">
        <p className="text-muted">Classe introuvable.</p>
        <button className="btn-primary mt-4" onClick={() => navigate("/classes")}>
          Retour aux classes
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button className="btn-icon" onClick={() => navigate("/classes")}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-glow"
            style={{ background: cls.level?.color || "#6366f1" }}
          >
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <p className="text-xs text-muted">
              {cls.level?.name} • {cls.school_year} • {cls.student_count} élèves
            </p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() =>
            downloadPdf(
              `/api/exports/class/${cls.id}/grades.pdf`,
              `bulletin_${cls.name}.pdf`,
            )
          }
        >
          <FileDown className="w-4 h-4" /> Exporter le bulletin de classe
        </button>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 -mx-6 px-6 overflow-x-auto">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  active
                    ? "border-brand-500 text-brand-600 dark:text-brand-300"
                    : "border-transparent text-muted hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <t.Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {tab === "roster" && <RosterTab classId={cls.id} />}
        {tab === "attendance" && <AttendanceTab classId={cls.id} />}
        {tab === "assignments" && <AssignmentsTab classId={cls.id} />}
        {tab === "competencies" && (
          <CompetenciesTab classId={cls.id} levelId={cls.level_id} />
        )}
      </div>
    </div>
  );
}
