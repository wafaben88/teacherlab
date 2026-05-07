import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  FolderKanban,
  GraduationCap,
  BookOpenCheck,
  Calendar,
  Award,
  CheckSquare,
  Settings as SettingsIcon,
  LayoutDashboard,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type {
  FileItem,
  Exercise,
  SchoolClass,
  ScheduleEvent,
} from "../lib/types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface ResultItem {
  id: string;
  label: string;
  hint?: string;
  type: "navigation" | "file" | "exercise" | "class" | "schedule";
  path: string;
  Icon: typeof Search;
}

const QUICK_NAV: ResultItem[] = [
  {
    id: "nav:dashboard",
    label: "Tableau de bord",
    type: "navigation",
    path: "/",
    Icon: LayoutDashboard,
  },
  {
    id: "nav:files",
    label: "Fichiers & cours",
    type: "navigation",
    path: "/files",
    Icon: FolderKanban,
  },
  {
    id: "nav:exercises",
    label: "Exercices",
    type: "navigation",
    path: "/exercises",
    Icon: BookOpenCheck,
  },
  {
    id: "nav:schedule",
    label: "Planning",
    type: "navigation",
    path: "/schedule",
    Icon: Calendar,
  },
  {
    id: "nav:classes",
    label: "Classes",
    type: "navigation",
    path: "/classes",
    Icon: GraduationCap,
  },
  {
    id: "nav:grades",
    label: "Notes",
    type: "navigation",
    path: "/grades",
    Icon: Award,
  },
  {
    id: "nav:todos",
    label: "À faire",
    type: "navigation",
    path: "/todos",
    Icon: CheckSquare,
  },
  {
    id: "nav:settings",
    label: "Paramètres",
    type: "navigation",
    path: "/settings",
    Icon: SettingsIcon,
  },
];

interface SearchPayload {
  files: FileItem[];
  exercises: Exercise[];
  classes: SchoolClass[];
  schedule: ScheduleEvent[];
}

function buildResults(query: string, payload: SearchPayload | null): ResultItem[] {
  const q = query.trim().toLowerCase();
  const navMatches = q
    ? QUICK_NAV.filter((n) => n.label.toLowerCase().includes(q))
    : QUICK_NAV;
  if (!payload || !q) return navMatches.slice(0, 6);

  const fileResults: ResultItem[] = payload.files.slice(0, 5).map((f) => ({
    id: `file:${f.id}`,
    label: f.title,
    hint: f.original_name,
    type: "file",
    path: "/files",
    Icon: FolderKanban,
  }));
  const exerciseResults: ResultItem[] = payload.exercises.slice(0, 5).map((e) => ({
    id: `exercise:${e.id}`,
    label: e.title,
    hint: e.tags || undefined,
    type: "exercise",
    path: "/exercises",
    Icon: BookOpenCheck,
  }));
  const classResults: ResultItem[] = payload.classes.slice(0, 5).map((c) => ({
    id: `class:${c.id}`,
    label: c.name,
    hint: c.school_year || undefined,
    type: "class",
    path: "/classes",
    Icon: GraduationCap,
  }));
  const scheduleResults: ResultItem[] = payload.schedule.slice(0, 5).map((s) => ({
    id: `schedule:${s.id}`,
    label: s.title,
    hint: s.room || undefined,
    type: "schedule",
    path: "/schedule",
    Icon: Calendar,
  }));

  return [
    ...navMatches.slice(0, 3),
    ...fileResults,
    ...exerciseResults,
    ...classResults,
    ...scheduleResults,
  ];
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setPayload(null);
        return;
      }
      setLoading(true);
      try {
        const r = await api.get<SearchPayload>("/api/search", { params: { q } });
        setPayload(r.data);
      } catch {
        setPayload(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  const results = useMemo(() => buildResults(query, payload), [query, payload]);

  useEffect(() => {
    setHighlight(0);
  }, [results.length]);

  function trigger(item: ResultItem) {
    onClose();
    navigate(item.path);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[highlight];
      if (item) trigger(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 animate-fade-in">
      <button
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer la recherche"
      />
      <div className="relative w-full max-w-xl surface rounded-2xl shadow-glow overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b divider">
          <Search className="w-5 h-5 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
            placeholder="Cherche un cours, exercice, classe, événement…"
            aria-label="Rechercher"
          />
          {loading && <div className="text-xs text-muted">…</div>}
          <button
            type="button"
            onClick={onClose}
            className="btn-icon w-8 h-8"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted text-sm">
              Aucun résultat
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((item, idx) => {
                const active = idx === highlight;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => trigger(item)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                        active
                          ? "bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          active
                            ? "bg-brand-500 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <item.Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">{item.label}</div>
                        {item.hint && (
                          <div className="text-xs text-muted truncate">{item.hint}</div>
                        )}
                      </span>
                      {item.type === "navigation" ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted">
                          aller
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-muted">
                          {item.type === "file"
                            ? "fichier"
                            : item.type === "exercise"
                              ? "exercice"
                              : item.type === "class"
                                ? "classe"
                                : "agenda"}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-4 py-2 border-t divider flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="kbd"><ArrowUp className="w-3 h-3" /></span>
              <span className="kbd"><ArrowDown className="w-3 h-3" /></span>
              naviguer
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd"><CornerDownLeft className="w-3 h-3" /></span>
              ouvrir
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd">esc</span> fermer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
