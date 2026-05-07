import { useEffect, useState } from "react";
import {
  Sparkles,
  FolderKanban,
  Calendar,
  GraduationCap,
  Search,
  ArrowRight,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";

const STORAGE_KEY = "teacher-hub.onboarded";

interface Step {
  Icon: typeof Sparkles;
  title: string;
  description: string;
  hint?: string;
}

const STEPS: Step[] = [
  {
    Icon: Sparkles,
    title: "Bienvenue dans Teacher Hub",
    description:
      "Ton espace tout-en-un pour gérer tes cours, exercices, fichiers, classes et notes.",
  },
  {
    Icon: FolderKanban,
    title: "Téléverse tes cours et exercices",
    description:
      "Glisse-dépose un PDF ou DOCX sur la page Fichiers, ajoute un titre, un niveau, des tags — et c'est rangé.",
    hint: "Tu peux aussi importer des élèves depuis un CSV (page Classes).",
  },
  {
    Icon: Calendar,
    title: "Garde un œil sur la semaine",
    description:
      "Le planning affiche tes cours, contrôles et réunions. Crée des événements récurrents pour les cours hebdo.",
  },
  {
    Icon: GraduationCap,
    title: "Suis chaque classe et chaque élève",
    description:
      "Ajoute des notes, des compétences, des bulletins exportables en PDF.",
  },
  {
    Icon: Search,
    title: "Astuce : la recherche rapide",
    description:
      "Appuie sur ⌘ K (ou Ctrl+K) pour ouvrir la palette et sauter directement à un cours, exercice, classe ou page.",
  },
];

export function Onboarding() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    setOpen(true);
  }, [user, loading]);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.Icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={close}
      />
      <div className="relative w-full max-w-lg surface rounded-3xl shadow-glow overflow-hidden animate-slide-up">
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 btn-icon"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white shadow-glow">
            <Icon className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">{current.title}</h2>
          <p className="mt-2 text-sm text-muted">{current.description}</p>
          {current.hint && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
              {current.hint}
            </div>
          )}
        </div>

        <div className="px-8 pb-6 flex items-center gap-2 justify-center">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-brand-500"
                  : i < step
                    ? "w-1.5 bg-brand-400"
                    : "w-1.5 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            type="button"
            className="btn-ghost"
            onClick={close}
          >
            Passer
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (isLast) close();
              else setStep((s) => s + 1);
            }}
          >
            {isLast ? "C'est parti" : "Suivant"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
