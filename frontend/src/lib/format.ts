export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const KIND_LABELS: Record<string, string> = {
  cours: "Cours",
  exercice: "Exercice",
  correction: "Correction",
  devoir: "Devoir",
  autre: "Autre",
};

export function kindLabel(kind: string) {
  return KIND_LABELS[kind] || kind;
}

const KIND_COLORS: Record<string, string> = {
  cours: "bg-brand-100 text-brand-700",
  exercice: "bg-emerald-100 text-emerald-700",
  correction: "bg-sky-100 text-sky-700",
  devoir: "bg-amber-100 text-amber-700",
  autre: "bg-slate-100 text-slate-700",
};

export function kindBadgeClass(kind: string) {
  return KIND_COLORS[kind] || "bg-slate-100 text-slate-700";
}

const DIFFICULTY_COLORS: Record<string, string> = {
  facile: "bg-emerald-100 text-emerald-700",
  moyen: "bg-amber-100 text-amber-700",
  difficile: "bg-rose-100 text-rose-700",
};

export function difficultyBadgeClass(d: string) {
  return DIFFICULTY_COLORS[d] || "bg-slate-100 text-slate-700";
}
