import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, ArrowRight, BookOpenCheck, Calendar, FolderKanban } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("prof@teacher-hub.local");
  const [password, setPassword] = useState("changeme123");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Connexion impossible. Vérifie tes identifiants.";
      toast.push(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white shadow-glow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-none">Teacher Hub</div>
              <div className="text-[11px] text-slate-500 leading-none mt-1">Espace enseignant</div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Bienvenue !</h1>
          <p className="text-slate-500 mt-2">Connecte-toi pour accéder à ton espace.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="prof@teacher-hub.local"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Connexion…" : (
                <>
                  Se connecter <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="text-right">
              <Link to="/forgot" className="text-xs text-brand-600 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>

          <div className="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <strong>Compte par défaut :</strong>
            <div>Email : prof@teacher-hub.local</div>
            <div>Mot de passe : changeme123</div>
            <div className="text-slate-500 mt-1">À changer dans les paramètres.</div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, white 0, transparent 50%), radial-gradient(circle at 70% 80%, white 0, transparent 50%)",
        }} />
        <div className="relative max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight">
            Tout ton matériel pédagogique, organisé en un seul endroit.
          </h2>
          <p className="mt-3 text-white/85">
            Gère tes cours, exercices, classes et planning sans effort.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-8">
            {[
              { icon: FolderKanban, t: "Bibliothèque de fichiers", d: "Classés par niveau, matière et date" },
              { icon: BookOpenCheck, t: "Banque d'exercices", d: "Recherche par tags et difficulté" },
              { icon: Calendar, t: "Planning hebdomadaire", d: "Vue calendrier avec couleurs par classe" },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3 p-3 bg-white/10 backdrop-blur rounded-xl border border-white/15">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">{f.t}</div>
                  <div className="text-sm text-white/80">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
