import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  BookOpenCheck,
  GraduationCap,
  CalendarClock,
  HardDrive,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime, kindLabel } from "../lib/format";

const KIND_COLORS = ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#94a3b8"];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardStats>("/api/dashboard/stats")
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Fichiers",
      value: stats?.files_count ?? 0,
      icon: FolderKanban,
      to: "/files",
      gradient: "from-brand-500 to-brand-600",
    },
    {
      label: "Exercices",
      value: stats?.exercises_count ?? 0,
      icon: BookOpenCheck,
      to: "/exercises",
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Classes",
      value: stats?.classes_count ?? 0,
      icon: GraduationCap,
      to: "/classes",
      gradient: "from-sky-500 to-sky-600",
    },
    {
      label: "Événements à venir",
      value: stats?.upcoming_events ?? 0,
      icon: CalendarClock,
      to: "/schedule",
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  const kindData = stats
    ? Object.entries(stats.files_by_kind).map(([kind, count]) => ({
        name: kindLabel(kind),
        value: count,
      }))
    : [];

  const levelData = stats?.files_by_level.filter((l) => l.count > 0) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bonjour 👋"
        subtitle="Voici un aperçu de ton espace pédagogique."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="card p-5 group hover:shadow-glow hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-md`}>
                <c.icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-4">
              {loading ? "—" : c.value}
            </div>
            <div className="text-sm text-slate-500 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fichiers par niveau</h2>
              <p className="text-xs text-slate-500">Répartition de ta bibliothèque</p>
            </div>
          </div>
          <div className="h-64">
            {levelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Aucune donnée. Ajoute des fichiers pour voir le graphique.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {levelData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Types de fichiers</h2>
          <p className="text-xs text-slate-500">Cours, exercices, corrections…</p>
          <div className="h-64">
            {kindData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kindData} dataKey="value" innerRadius={45} outerRadius={75}>
                    {kindData.map((_, i) => (
                      <Cell key={i} fill={KIND_COLORS[i % KIND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 mt-2">
            {kindData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLORS[i % KIND_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="font-medium text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Prochaines séances</h2>
              <p className="text-xs text-slate-500">Tes 5 prochains événements</p>
            </div>
            <Link to="/schedule" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Voir tout →
            </Link>
          </div>
          {stats && stats.next_events.length > 0 ? (
            <div className="space-y-2">
              {stats.next_events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div
                    className="w-1.5 h-12 rounded-full"
                    style={{ background: ev.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{ev.title}</div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-0.5">
                      <span>{formatDateTime(ev.start_time)}</span>
                      {ev.school_class && <span>• {ev.school_class.name}</span>}
                      {ev.room && <span>• {ev.room}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucun événement à venir
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Espace utilisé</div>
                <div className="font-bold text-lg text-slate-900">
                  {stats?.storage_used_mb?.toFixed(1) ?? "0"} Mo
                </div>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Tâches en attente</div>
                <div className="font-bold text-lg text-slate-900">
                  {stats?.pending_todos ?? 0}
                </div>
              </div>
            </div>
            <Link to="/todos" className="text-sm text-brand-600 hover:text-brand-700 font-medium mt-3 inline-block">
              Gérer →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
