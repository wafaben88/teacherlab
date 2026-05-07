import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Upload,
  Search,
  Download,
  Trash2,
  Pencil,
  FileText,
  FileImage,
  FileType,
  File as FileIcon,
  FileDown,
} from "lucide-react";
import { api, downloadPdf, fileDownloadUrl } from "../lib/api";
import type { FileItem, Level, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import {
  formatBytes,
  formatDate,
  kindBadgeClass,
  kindLabel,
} from "../lib/format";

const KINDS = ["cours", "exercice", "correction", "devoir", "autre"];

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("word") || mime.includes("doc") || mime.includes("text"))
    return FileType;
  return FileIcon;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  levels: Level[];
  subjects: Subject[];
  initialFile?: File | null;
}

function UploadModal({
  open,
  onClose,
  onCreated,
  levels,
  subjects,
  initialFile,
}: UploadModalProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("cours");
  const [levelId, setLevelId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialFile) {
      setFile(initialFile);
      setTitle((t) => t || initialFile.name.replace(/\.[^.]+$/, ""));
    }
  }, [open, initialFile]);

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setKind("cours");
    setLevelId("");
    setSubjectId("");
    setTags("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.push("Sélectionne un fichier", "error");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("upload", file);
    fd.append("title", title || file.name);
    fd.append("description", description);
    fd.append("kind", kind);
    if (levelId) fd.append("level_id", levelId);
    if (subjectId) fd.append("subject_id", subjectId);
    fd.append("tags", tags);
    try {
      await api.post("/api/files/upload", fd);
      toast.push("Fichier ajouté !", "success");
      reset();
      onClose();
      onCreated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Erreur lors de l'envoi";
      toast.push(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un fichier" width="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <div className="label">Fichier *</div>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-brand-300 hover:bg-brand-50/30 transition cursor-pointer">
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f ?? null);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto text-brand-500 mb-2" />
              {file ? (
                <div className="text-sm">
                  <div className="font-semibold text-slate-900">{file.name}</div>
                  <div className="text-slate-500">{formatBytes(file.size)}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Clique ou dépose un fichier (PDF, DOCX, images, etc.) — max 50 Mo
                </div>
              )}
            </label>
          </div>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Titre</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cours sur les algorithmes"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Niveau</label>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">— Aucun —</option>
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
              <option value="">— Aucune —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle"
          />
        </div>
        <div>
          <label className="label">Tags (séparés par des virgules)</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="récursivité, tableaux, tri"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Envoi…" : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface EditModalProps {
  file: FileItem | null;
  onClose: () => void;
  onSaved: () => void;
  levels: Level[];
  subjects: Subject[];
}

function EditModal({ file, onClose, onSaved, levels, subjects }: EditModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("cours");
  const [levelId, setLevelId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (file) {
      setTitle(file.title);
      setDescription(file.description);
      setKind(file.kind);
      setLevelId(file.level_id ? String(file.level_id) : "");
      setSubjectId(file.subject_id ? String(file.subject_id) : "");
      setTags(file.tags);
    }
  }, [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      await api.put(`/api/files/${file.id}`, {
        title,
        description,
        kind,
        level_id: levelId ? Number(levelId) : null,
        subject_id: subjectId ? Number(subjectId) : null,
        tags,
      });
      toast.push("Fichier mis à jour", "success");
      onClose();
      onSaved();
    } catch {
      toast.push("Erreur de mise à jour", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!file} onClose={onClose} title="Modifier le fichier" width="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Titre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Niveau</label>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">— Aucun —</option>
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
              <option value="">— Aucune —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tags</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FilesPage() {
  const toast = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterKind, setFilterKind] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<FileItem | null>(null);

  async function load() {
    setLoading(true);
    const [f, l, s] = await Promise.all([
      api.get<FileItem[]>("/api/files"),
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setFiles(f.data);
    setLevels(l.data);
    setSubjects(s.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return files.filter((f) => {
      if (filterLevel && String(f.level_id) !== filterLevel) return false;
      if (filterSubject && String(f.subject_id) !== filterSubject) return false;
      if (filterKind && f.kind !== filterKind) return false;
      if (s) {
        const haystack = `${f.title} ${f.description} ${f.tags} ${f.original_name}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [files, search, filterLevel, filterSubject, filterKind]);

  async function onDelete(f: FileItem) {
    if (!confirm(`Supprimer "${f.title}" ?`)) return;
    try {
      await api.delete(`/api/files/${f.id}`);
      toast.push("Fichier supprimé", "success");
      load();
    } catch {
      toast.push("Erreur de suppression", "error");
    }
  }

  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (
      e.currentTarget instanceof Node &&
      (!e.relatedTarget ||
        !(e.relatedTarget instanceof Node) ||
        !e.currentTarget.contains(e.relatedTarget))
    ) {
      setDragging(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    setDragging(false);
    if (!e.dataTransfer.files?.length) return;
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    setPendingFile(f);
    setUploadOpen(true);
  }

  return (
    <div
      className="animate-fade-in relative"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-brand-500/20 backdrop-blur-sm border-4 border-dashed border-brand-400 rounded-none">
          <div className="surface rounded-2xl px-8 py-6 shadow-glow text-center">
            <Upload className="w-10 h-10 mx-auto text-brand-500 mb-2" />
            <div className="font-bold text-lg">Dépose ton fichier ici</div>
            <div className="text-sm text-muted">PDF, DOCX, images… max 50 Mo</div>
          </div>
        </div>
      )}
      <PageHeader
        title="Fichiers & Cours"
        subtitle="Tous tes documents pédagogiques en un seul endroit."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setPendingFile(null);
              setUploadOpen(true);
            }}
          >
            <Upload className="w-4 h-4" /> Ajouter un fichier
          </button>
        }
      />

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Rechercher par titre, tag, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input md:col-span-3" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select className="input md:col-span-2" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">Toutes matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="input md:col-span-2" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
            <option value="">Tous types</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderKanban}
            title={files.length === 0 ? "Aucun fichier pour l'instant" : "Aucun résultat"}
            description={
              files.length === 0
                ? "Commence par ajouter ton premier cours, exercice ou correction."
                : "Essaie de modifier les filtres ou la recherche."
            }
            action={
              files.length === 0 && (
                <button className="btn-primary" onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4" /> Ajouter un fichier
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => {
            const Icon = fileIcon(f.mime_type);
            return (
              <div key={f.id} className="card p-5 hover:shadow-glow transition group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate" title={f.title}>
                      {f.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{f.original_name}</div>
                  </div>
                </div>
                {f.description && (
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{f.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className={`badge ${kindBadgeClass(f.kind)}`}>{kindLabel(f.kind)}</span>
                  {f.level && (
                    <span
                      className="badge text-white"
                      style={{ background: f.level.color }}
                    >
                      {f.level.name}
                    </span>
                  )}
                  {f.subject && (
                    <span
                      className="badge text-white"
                      style={{ background: f.subject.color }}
                    >
                      {f.subject.name}
                    </span>
                  )}
                </div>
                {f.tags && (
                  <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-1">
                    {f.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {formatDate(f.created_at)} • {formatBytes(f.size_bytes)}
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                    <a
                      href={fileDownloadUrl(f.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-icon"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      className="btn-icon"
                      onClick={() =>
                        downloadPdf(
                          `/api/exports/file/${f.id}/handout.pdf`,
                          `fiche_${f.title.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`,
                        )
                      }
                      title="Fiche PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => setEditing(f)}
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-icon text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => onDelete(f)}
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPendingFile(null);
        }}
        onCreated={load}
        levels={levels}
        subjects={subjects}
        initialFile={pendingFile}
      />
      <EditModal
        file={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        levels={levels}
        subjects={subjects}
      />
    </div>
  );
}
