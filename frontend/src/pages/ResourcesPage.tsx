import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  Star,
  Search,
  Link as LinkIcon,
} from "lucide-react";
import { api } from "../lib/api";
import type { Level, Resource, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

const CATEGORIES = ["cours", "exercice", "video", "doc", "outil", "autre"];

const CATEGORY_LABEL: Record<string, string> = {
  cours: "Cours",
  exercice: "Exercice",
  video: "Vidéo",
  doc: "Documentation",
  outil: "Outil",
  autre: "Autre",
};

const CATEGORY_COLOR: Record<string, string> = {
  cours: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  exercice: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  video: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  doc: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  outil: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  autre: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
};

export function ResourcesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Resource[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);

  async function load() {
    setLoading(true);
    const [r, l, s] = await Promise.all([
      api.get<Resource[]>("/api/resources"),
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setItems(r.data);
    setLevels(l.data);
    setSubjects(s.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((r) => {
      if (filterCat && r.category !== filterCat) return false;
      if (filterLevel && String(r.level_id) !== filterLevel) return false;
      if (favOnly && !r.favorite) return false;
      if (s) {
        const h = `${r.title} ${r.description} ${r.tags} ${r.url}`.toLowerCase();
        if (!h.includes(s)) return false;
      }
      return true;
    });
  }, [items, search, filterCat, filterLevel, favOnly]);

  async function toggleFav(r: Resource) {
    const updated = await api.post<Resource>(`/api/resources/${r.id}/toggle-favorite`);
    setItems((prev) => prev.map((x) => (x.id === r.id ? updated.data : x)));
  }

  async function onDelete(r: Resource) {
    if (!confirm(`Supprimer "${r.title}" ?`)) return;
    await api.delete(`/api/resources/${r.id}`);
    toast.push("Ressource supprimée", "success");
    load();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ressources"
        subtitle="Tes liens, vidéos et outils en un seul endroit."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Ajouter un lien
          </button>
        }
      />

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input md:col-span-3"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <select
            className="input md:col-span-3"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="">Tous niveaux</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted md:col-span-1">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => setFavOnly(e.target.checked)}
            />
            <Star className="w-4 h-4" />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-muted">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bookmark}
            title={items.length === 0 ? "Aucune ressource" : "Aucun résultat"}
            description={
              items.length === 0
                ? "Ajoute tes liens favoris : tutoriels, MOOC, documentation."
                : "Modifie les filtres ou la recherche."
            }
            action={
              items.length === 0 && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Ajouter un lien
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="card p-5 hover:shadow-glow transition group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200 flex items-center justify-center shrink-0">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:underline truncate block"
                    title={r.title}
                  >
                    {r.title}
                  </a>
                  <div className="text-xs text-muted truncate">{new URL(r.url).hostname}</div>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => toggleFav(r)}
                  title={r.favorite ? "Retirer des favoris" : "Mettre en favori"}
                >
                  <Star
                    className={`w-4 h-4 ${
                      r.favorite ? "fill-amber-400 text-amber-500" : "text-slate-400"
                    }`}
                  />
                </button>
              </div>
              {r.description && (
                <p className="text-sm text-muted mt-3 line-clamp-2">{r.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className={`badge ${CATEGORY_COLOR[r.category] || CATEGORY_COLOR.autre}`}>
                  {CATEGORY_LABEL[r.category] || r.category}
                </span>
                {r.level && (
                  <span className="badge text-white" style={{ background: r.level.color }}>
                    {r.level.name}
                  </span>
                )}
                {r.subject && (
                  <span className="badge text-white" style={{ background: r.subject.color }}>
                    {r.subject.name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div className="text-xs text-muted">{formatDate(r.created_at)}</div>
                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon"
                    title="Ouvrir"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditing(r);
                      setFormOpen(true);
                    }}
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => onDelete(r)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ResourceForm
        open={formOpen}
        editing={editing}
        levels={levels}
        subjects={subjects}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  editing: Resource | null;
  levels: Level[];
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}

function ResourceForm({ open, editing, levels, subjects, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("autre");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tags, setTags] = useState("");
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || "");
      setUrl(editing?.url || "");
      setDescription(editing?.description || "");
      setCategory(editing?.category || "autre");
      setLevelId(editing?.level_id ? String(editing.level_id) : "");
      setSubjectId(editing?.subject_id ? String(editing.subject_id) : "");
      setTags(editing?.tags || "");
      setFavorite(editing?.favorite || false);
    }
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      url,
      description,
      category,
      level_id: levelId ? Number(levelId) : null,
      subject_id: subjectId ? Number(subjectId) : null,
      tags,
      favorite,
    };
    try {
      if (editing) {
        await api.put(`/api/resources/${editing.id}`, payload);
        toast.push("Ressource mise à jour", "success");
      } else {
        await api.post("/api/resources", payload);
        toast.push("Ressource ajoutée", "success");
      }
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Modifier la ressource" : "Nouvelle ressource"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Titre *</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">URL *</label>
          <input
            type="url"
            className="input"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Niveau</label>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">—</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
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
        </div>
        <div>
          <label className="label">Tags</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="python, mooc, openclassrooms"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
          />
          Marquer comme favori
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            {editing ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
