import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Sun,
  Moon,
  Monitor,
  Languages,
  KeyRound,
  UserCog,
  ShieldCheck,
  Database,
  Download,
  Upload,
  ScrollText,
} from "lucide-react";
import { api } from "../lib/api";
import type { Level, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../lib/theme";
import { useI18n, type Locale } from "../lib/i18n";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-md border-2 ${value === c ? "border-slate-900 scale-110" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

const THEME_CHOICES: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Clair", Icon: Sun },
  { mode: "dark", label: "Sombre", Icon: Moon },
  { mode: "auto", label: "Auto", Icon: Monitor },
];

export function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { locale, setLocale, locales } = useI18n();

  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [levelOpen, setLevelOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [levelName, setLevelName] = useState("");
  const [levelColor, setLevelColor] = useState("#6366f1");

  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#0ea5e9");

  async function load() {
    const [l, s] = await Promise.all([
      api.get<Level[]>("/api/levels"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setLevels(l.data);
    setSubjects(s.data);
  }
  useEffect(() => {
    load();
  }, []);

  function openLevelForm(l: Level | null) {
    setEditingLevel(l);
    setLevelName(l?.name || "");
    setLevelColor(l?.color || "#6366f1");
    setLevelOpen(true);
  }

  async function saveLevel(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: levelName, color: levelColor, sort_order: editingLevel?.sort_order ?? 99 };
    try {
      if (editingLevel) {
        await api.put(`/api/levels/${editingLevel.id}`, payload);
      } else {
        await api.post("/api/levels", payload);
      }
      toast.push("Niveau enregistré", "success");
      setLevelOpen(false);
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  async function deleteLevel(l: Level) {
    if (!confirm(`Supprimer "${l.name}" ?`)) return;
    try {
      await api.delete(`/api/levels/${l.id}`);
      toast.push("Niveau supprimé", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  function openSubjectForm(s: Subject | null) {
    setEditingSubject(s);
    setSubjectName(s?.name || "");
    setSubjectColor(s?.color || "#0ea5e9");
    setSubjectOpen(true);
  }

  async function saveSubject(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: subjectName, color: subjectColor, icon: "book" };
    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}`, payload);
      } else {
        await api.post("/api/subjects", payload);
      }
      toast.push("Matière enregistrée", "success");
      setSubjectOpen(false);
      load();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Erreur";
      toast.push(detail, "error");
    }
  }

  async function deleteSubject(s: Subject) {
    if (!confirm(`Supprimer "${s.name}" ?`)) return;
    try {
      await api.delete(`/api/subjects/${s.id}`);
      toast.push("Matière supprimée", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  function SecuritySection() {
    const [enabled, setEnabled] = useState(false);
    const [secret, setSecret] = useState<string | null>(null);
    const [otpauth, setOtpauth] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api
        .get<{ enabled: boolean }>("/api/users/me/2fa")
        .then((r) => setEnabled(r.data.enabled))
        .finally(() => setLoading(false));
    }, []);

    async function startSetup() {
      const r = await api.post<{ secret: string; otpauth_url: string }>(
        "/api/users/me/2fa/setup",
      );
      setSecret(r.data.secret);
      setOtpauth(r.data.otpauth_url);
    }

    async function confirmEnable(e: React.FormEvent) {
      e.preventDefault();
      try {
        await api.post("/api/users/me/2fa/enable", { code });
        toast.push("2FA activée", "success");
        setEnabled(true);
        setSecret(null);
        setOtpauth(null);
        setCode("");
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Code invalide";
        toast.push(detail, "error");
      }
    }

    async function disable() {
      const c = window.prompt("Code 2FA actuel pour désactiver :");
      if (!c) return;
      try {
        await api.post("/api/users/me/2fa/disable", { code: c });
        toast.push("2FA désactivée", "success");
        setEnabled(false);
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Erreur";
        toast.push(detail, "error");
      }
    }

    const qrUrl = otpauth
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`
      : null;

    return (
      <div className="card p-6 space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sécurité (2FA)</h2>
            <p className="text-xs text-muted">
              Active la double authentification via une application TOTP (Google Authenticator, Authy, 1Password, …)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted">Chargement…</div>
        ) : enabled ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge bg-emerald-100 text-emerald-700">2FA activée</span>
            <button type="button" className="btn-secondary" onClick={disable}>
              Désactiver 2FA
            </button>
          </div>
        ) : secret ? (
          <form onSubmit={confirmEnable} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt="QR 2FA"
                  className="w-36 h-36 rounded-xl border divider bg-white p-2"
                />
              )}
              <div className="flex-1 space-y-2 text-sm">
                <p>1. Scanne ce QR code dans ton app d'authentification.</p>
                <p className="text-xs text-muted">
                  Ou colle ce secret manuellement :
                </p>
                <code className="block break-all bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {secret}
                </code>
                <p>2. Saisis le code à 6 chiffres affiché par ton app :</p>
                <input
                  className="input max-w-[160px] tracking-widest text-lg"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Activer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSecret(null);
                  setOtpauth(null);
                  setCode("");
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn-primary" onClick={startSetup}>
            <ShieldCheck className="w-4 h-4" /> Activer la 2FA
          </button>
        )}
      </div>
    );
  }

  function BackupSection() {
    const [busy, setBusy] = useState(false);

    async function exportNow() {
      setBusy(true);
      try {
        const r = await api.get("/api/backup/export");
        const blob = new Blob([JSON.stringify(r.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `teacher-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.push("Sauvegarde téléchargée", "success");
      } catch {
        toast.push("Erreur lors de l'export", "error");
      } finally {
        setBusy(false);
      }
    }

    async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
      const f = e.target.files?.[0];
      if (!f) return;
      const replace = window.confirm(
        "Remplacer les données existantes ? OK = remplacer, Annuler = fusionner",
      );
      setBusy(true);
      try {
        const text = await f.text();
        const parsed = JSON.parse(text);
        const data = parsed.data ?? parsed;
        await api.post("/api/backup/import", { data, replace });
        toast.push("Sauvegarde importée", "success");
      } catch {
        toast.push("Fichier invalide", "error");
      } finally {
        setBusy(false);
        e.target.value = "";
      }
    }

    return (
      <div className="card p-6 space-y-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sauvegarde & restauration</h2>
            <p className="text-xs text-muted">
              Export complet de tes données au format JSON. À garder précieusement.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={exportNow}>
            <Download className="w-4 h-4" /> Exporter
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" /> Importer un JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importFile}
              disabled={busy}
            />
          </label>
        </div>
      </div>
    );
  }

  function AuditLogSection() {
    type AuditLog = {
      id: number;
      user_id: number | null;
      action: string;
      entity: string;
      entity_id: number | null;
      details: string;
      ip: string;
      created_at: string;
    };
    const [rows, setRows] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api
        .get<AuditLog[]>("/api/admin/audit-logs", { params: { limit: 100 } })
        .then((r) => setRows(r.data))
        .finally(() => setLoading(false));
    }, []);

    return (
      <div className="card p-6 space-y-3 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Journal d'audit</h2>
            <p className="text-xs text-muted">
              100 dernières actions sensibles (login, export, 2FA…)
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-muted">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted">Aucune action enregistrée.</div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left px-2 py-1.5">Date</th>
                  <th className="text-left px-2 py-1.5">Action</th>
                  <th className="text-left px-2 py-1.5">User</th>
                  <th className="text-left px-2 py-1.5">IP</th>
                  <th className="text-left px-2 py-1.5">Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t divider">
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 font-medium">{r.action}</td>
                    <td className="px-2 py-1.5 text-xs">{r.user_id ?? "—"}</td>
                    <td className="px-2 py-1.5 text-xs">{r.ip || "—"}</td>
                    <td className="px-2 py-1.5 text-xs truncate max-w-[300px]">
                      {r.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function AccountSection() {
    const [fullName, setFullName] = useState(user?.full_name ?? "");
    const [bio, setBio] = useState(user?.bio ?? "");
    const [avatarColor, setAvatarColor] = useState(user?.avatar_color ?? "#6366f1");
    const [savingProfile, setSavingProfile] = useState(false);
    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [savingPwd, setSavingPwd] = useState(false);

    async function saveProfile(e: React.FormEvent) {
      e.preventDefault();
      setSavingProfile(true);
      try {
        await api.put("/api/users/me", {
          full_name: fullName,
          email: user?.email,
          bio,
          avatar_color: avatarColor,
        });
        toast.push("Profil mis à jour", "success");
      } catch {
        toast.push("Erreur de mise à jour", "error");
      } finally {
        setSavingProfile(false);
      }
    }

    async function changePwd(e: React.FormEvent) {
      e.preventDefault();
      if (newPwd !== confirmPwd) {
        toast.push("Les mots de passe ne correspondent pas", "error");
        return;
      }
      if (newPwd.length < 6) {
        toast.push("Mot de passe trop court (min 6)", "error");
        return;
      }
      setSavingPwd(true);
      try {
        await api.post("/api/users/me/password", {
          current_password: currentPwd,
          new_password: newPwd,
        });
        toast.push("Mot de passe changé", "success");
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Erreur";
        toast.push(detail, "error");
      } finally {
        setSavingPwd(false);
      }
    }

    return (
      <div className="grid lg:grid-cols-2 gap-6 lg:col-span-2">
        <form onSubmit={saveProfile} className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Mon profil</h2>
              <p className="text-xs text-muted">Nom affiché, bio et couleur d'avatar</p>
            </div>
          </div>
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" disabled value={user?.email ?? ""} />
          </div>
          <div>
            <label className="label">Bio courte</label>
            <textarea
              className="input min-h-[64px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Prof d'informatique au lycée…"
            />
          </div>
          <div>
            <label className="label">Couleur de l'avatar</label>
            <ColorPicker value={avatarColor} onChange={setAvatarColor} />
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>

        <form onSubmit={changePwd} className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
              <p className="text-xs text-muted">Pense à utiliser un mot de passe robuste</p>
            </div>
          </div>
          <div>
            <label className="label">Mot de passe actuel</label>
            <input
              type="password"
              className="input"
              required
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              required
              autoComplete="new-password"
              minLength={6}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirmation</label>
            <input
              type="password"
              className="input"
              required
              autoComplete="new-password"
              minLength={6}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={savingPwd}>
            {savingPwd ? "Enregistrement…" : "Mettre à jour"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Paramètres" subtitle="Gère tes niveaux, matières et préférences." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Apparence & langue</h2>
              <p className="text-xs text-muted">Thème, langue d'affichage et sens de lecture</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="label">Thème</div>
              <div className="flex gap-2">
                {THEME_CHOICES.map((c) => {
                  const active = c.mode === themeMode;
                  return (
                    <button
                      key={c.mode}
                      type="button"
                      onClick={() => setThemeMode(c.mode)}
                      className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition ${
                        active
                          ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 dark:border-brand-400/40"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <c.Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="label flex items-center gap-1.5">
                <Languages className="w-4 h-4" /> Langue
              </div>
              <div className="grid grid-cols-3 gap-2">
                {locales.map((l) => {
                  const active = l.code === locale;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLocale(l.code as Locale)}
                      className={`flex items-center justify-center gap-1 px-2 py-3 rounded-xl border transition ${
                        active
                          ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 dark:border-brand-400/40"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span className="text-sm font-medium">{l.native}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Niveaux</h2>
              <p className="text-xs text-muted">Classes officielles ou personnalisées</p>
            </div>
            <button className="btn-primary" onClick={() => openLevelForm(null)}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-1.5">
            {levels.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span className="font-medium text-slate-800 flex-1">{l.name}</span>
                <button className="btn-icon opacity-0 group-hover:opacity-100" onClick={() => openLevelForm(l)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="btn-icon text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteLevel(l)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Matières</h2>
              <p className="text-xs text-muted">Algorithmique, Python, Réseaux…</p>
            </div>
            <button className="btn-primary" onClick={() => openSubjectForm(null)}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                <span className="font-medium text-slate-800 flex-1">{s.name}</span>
                <button className="btn-icon opacity-0 group-hover:opacity-100" onClick={() => openSubjectForm(s)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="btn-icon text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteSubject(s)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <AccountSection />
        <SecuritySection />
        <BackupSection />
        {user?.role === "admin" && <AuditLogSection />}
      </div>

      <Modal
        open={levelOpen}
        onClose={() => setLevelOpen(false)}
        title={editingLevel ? "Modifier le niveau" : "Nouveau niveau"}
      >
        <form onSubmit={saveLevel} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input className="input" required value={levelName} onChange={(e) => setLevelName(e.target.value)} />
          </div>
          <div>
            <label className="label">Couleur</label>
            <ColorPicker value={levelColor} onChange={setLevelColor} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setLevelOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={subjectOpen}
        onClose={() => setSubjectOpen(false)}
        title={editingSubject ? "Modifier la matière" : "Nouvelle matière"}
      >
        <form onSubmit={saveSubject} className="space-y-4">
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Couleur</label>
            <ColorPicker value={subjectColor} onChange={setSubjectColor} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setSubjectOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
