import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, KeyRound, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [loadingReq, setLoadingReq] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoadingReq(true);
    try {
      const r = await api.post<{ ok: boolean; token?: string }>(
        "/api/users/forgot",
        { email: email.trim().toLowerCase() }
      );
      if (r.data?.token) {
        setIssuedToken(r.data.token);
        setToken(r.data.token);
        toast.push("Jeton de réinitialisation généré (valide 1h)", "success");
      } else {
        toast.push("Si l'email existe, un jeton a été émis.", "info");
      }
    } catch {
      toast.push("Erreur. Réessaie.", "error");
    } finally {
      setLoadingReq(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 6) {
      toast.push("Mot de passe trop court (min 6)", "error");
      return;
    }
    setLoadingReset(true);
    try {
      await api.post("/api/users/reset", {
        token: token.trim(),
        new_password: newPwd,
      });
      toast.push("Mot de passe réinitialisé. Connexion…", "success");
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Erreur";
      toast.push(detail, "error");
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md surface rounded-2xl shadow-soft p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white shadow-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold leading-none">Teacher Hub</div>
            <div className="text-[11px] text-muted leading-none mt-1">Mot de passe oublié</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Réinitialiser le mot de passe</h1>
        <p className="text-sm text-muted mt-1">
          Entre ton email pour recevoir un jeton, puis choisis un nouveau mot de passe.
        </p>

        <form onSubmit={requestReset} className="mt-6 space-y-3">
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              className="input pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prof@teacher-hub.local"
            />
          </div>
          <button type="submit" disabled={loadingReq} className="btn-primary w-full">
            {loadingReq ? "Génération…" : "Obtenir un jeton"}
          </button>
        </form>

        {issuedToken && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700/30 rounded-lg text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">Jeton (valide 1h) :</div>
            <code className="block break-all mt-1">{issuedToken}</code>
          </div>
        )}

        <form onSubmit={doReset} className="mt-6 space-y-3 border-t divider pt-6">
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Nouveau mot de passe
          </h2>
          <label className="label">Jeton</label>
          <input
            className="input"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Colle ici le jeton reçu"
          />
          <label className="label">Nouveau mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              className="input pl-10"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loadingReset} className="btn-primary w-full">
            {loadingReset ? "Enregistrement…" : (
              <>
                Réinitialiser <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-muted hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
