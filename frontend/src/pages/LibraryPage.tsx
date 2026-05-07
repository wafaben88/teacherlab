import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Library,
  Copy,
  FolderKanban,
  BookOpenCheck,
  ListChecks,
  ClipboardCheck,
  Search,
  Sparkles,
  Filter,
} from "lucide-react";
import { api } from "../lib/api";
import type { LibraryItem, LibraryItemType, Level, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";

const TYPE_ICON: Record<LibraryItemType, typeof FolderKanban> = {
  file: FolderKanban,
  exercise: BookOpenCheck,
  quiz: ListChecks,
  rubric: ClipboardCheck,
};

const TYPE_LABEL: Record<LibraryItemType, string> = {
  file: "Fichier",
  exercise: "Exercice",
  quiz: "Quiz",
  rubric: "Grille",
};

const TYPE_TARGET: Record<LibraryItemType, string> = {
  file: "/files",
  exercise: "/exercises",
  quiz: "/quizzes",
  rubric: "/rubrics",
};

export function LibraryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [type, setType] = useState<LibraryItemType | "all">("all");
  const [onlyTemplates, setOnlyTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const [items, l, s] = await Promise.all([
      api.get<LibraryItem[]>("/api/library", {
        params: { only_templates: onlyTemplates },
      }),
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setItems(items.data);
    setLevels(l.data);
    setSubjects(s.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [onlyTemplates]);

  async function clone(item: LibraryItem) {
    if (item.type === "file") {
      toast.push("Le clonage de fichiers passe par le téléchargement direct.", "info");
      return;
    }
    setCloning(item.id);
    try {
      const r = await api.post<{ type: string; id: number }>(
        `/api/library/clone/${item.type}/${item.id}`,
      );
      toast.push("Élément cloné dans ta collection", "success");
      const target = TYPE_TARGET[item.type];
      navigate(target);
      void r;
    } catch {
      toast.push("Erreur lors du clonage", "error");
    } finally {
      setCloning(null);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((it) => {
      if (type !== "all" && it.type !== type) return false;
      if (!s) return true;
      return (
        it.title.toLowerCase().includes(s) ||
        (it.description || "").toLowerCase().includes(s)
      );
    });
  }, [items, type, search]);

  const subjectById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const levelById = useMemo(
    () => Object.fromEntries(levels.map((l) => [l.id, l])),
    [levels],
  );

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Bibliothèque partagée"
        subtitle="Modèles d'exercices, quiz et grilles à réutiliser ou partager avec tes collègues."
      />

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher dans la bibliothèque…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
          {(["all", "exercise", "quiz", "rubric", "file"] as const).map((t) => {
            const Icon = t === "all" ? Library : TYPE_ICON[t];
            return (
              <button
                key={t}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition ${
                  type === t
                    ? "bg-white dark:bg-slate-900 shadow text-brand-600"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                onClick={() => setType(t)}
              >
                <Icon className="w-3.5 h-3.5" />
                {t === "all" ? "Tout" : TYPE_LABEL[t] + "s"}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlyTemplates}
            onChange={(e) => setOnlyTemplates(e.target.checked)}
          />
          <Filter className="w-3.5 h-3.5" /> Modèles uniquement
        </label>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Library}
            title="Bibliothèque vide"
            description="Marque un exercice, quiz ou grille comme modèle pour qu'il apparaisse ici."
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.type];
            const level = item.level_id ? levelById[item.level_id] : null;
            const subject = item.subject_id ? subjectById[item.subject_id] : null;
            return (
              <div key={`${item.type}-${item.id}`} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 text-white flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-slate-500 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 text-xs">
                  <span className="badge bg-slate-100 text-slate-700">
                    {TYPE_LABEL[item.type]}
                  </span>
                  {item.is_template && (
                    <span className="badge bg-amber-100 text-amber-800">
                      <Sparkles className="w-3 h-3" /> Modèle
                    </span>
                  )}
                  {item.is_shared && (
                    <span className="badge bg-emerald-100 text-emerald-800">Partagé</span>
                  )}
                  {level && (
                    <span
                      className="badge text-white"
                      style={{ background: level.color }}
                    >
                      {level.name}
                    </span>
                  )}
                  {subject && (
                    <span
                      className="badge text-white"
                      style={{ background: subject.color }}
                    >
                      {subject.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-auto pt-2 border-t divider">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => navigate(TYPE_TARGET[item.type])}
                  >
                    Ouvrir
                  </button>
                  {item.type !== "file" && (
                    <button
                      className="btn-primary text-xs"
                      disabled={cloning === item.id}
                      onClick={() => clone(item)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {cloning === item.id ? "…" : "Cloner"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
