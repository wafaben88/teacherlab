# Démarrage rapide — Teacher Hub

Guide pas-à-pas pour lancer l'application **en local** sur ton ordinateur.

---

## 1. Pré-requis à installer

| Outil | Version mini | Lien |
|---|---|---|
| **Python** | 3.11+ | https://www.python.org/downloads/ |
| **Node.js** | 18+ (LTS recommandé) | https://nodejs.org/ |
| **Poetry** (gestionnaire Python) | dernière | https://python-poetry.org/docs/#installation |

> **Vérifie l'installation** dans un terminal :
> ```
> python --version
> node --version
> poetry --version
> ```

---

## 2. Récupérer le code

Soit en clonant depuis GitHub :
```
git clone https://github.com/wafaben88/teacherlab.git
cd teacherlab
```

Soit en décompressant le `teacherlab.zip` que je t'ai envoyé.

---

## 3. Lancer le **backend** (API FastAPI)

Ouvre un terminal dans le dossier `backend/` :

```
cd backend
poetry install
poetry run fastapi dev app/main.py --port 8000
```

L'API tournera sur **http://localhost:8000**
Docs auto : **http://localhost:8000/docs**

> Laisse ce terminal ouvert pendant que tu utilises l'app.

---

## 4. Lancer le **frontend** (interface React)

Ouvre un **deuxième** terminal dans le dossier `frontend/` :

```
cd frontend
npm install
npm run dev
```

L'interface s'ouvrira sur **http://localhost:5173**

> Le fichier `.env` est déjà configuré pour pointer vers `http://localhost:8000`.

---

## 5. Se connecter

Ouvre **http://localhost:5173** dans ton navigateur :

- **Email** : `prof@teacher-hub.local`
- **Mot de passe** : `changeme123`

> Tu peux changer le mot de passe plus tard dans la page **Paramètres**.

---

## 6. Fonctionnalités

- **Tableau de bord** — Stats (cours, exos, séances) et graphiques
- **Fichiers** — Upload PDF/DOCX/images, classés par niveau, matière, tags
- **Exercices** — Banque d'exercices avec recherche, niveau, difficulté
- **Planning** — Calendrier hebdomadaire (cours, séances)
- **Classes** — Gestion des classes et niveaux (4ème, 3ème, Bac, etc.)
- **Notes** — Évaluations par élève / classe
- **Tâches** — Todo list (priorité, échéance)
- **Paramètres** — Niveaux, matières, profil

---

## 7. Données

Toutes tes données sont stockées dans `backend/data/app.db` (SQLite).
Les fichiers uploadés sont dans `backend/data/uploads/`.

> Pour repartir de zéro : supprime `backend/data/` (il sera recréé au prochain lancement avec les niveaux/matières par défaut).

---

## 8. Problèmes fréquents

**`poetry: command not found`**
→ Installe Poetry : https://python-poetry.org/docs/#installation puis redémarre le terminal.

**`npm install` lent ou bloqué**
→ Vérifie ta connexion. Réessaie : `npm install --no-audit --no-fund`.

**Port 8000 ou 5173 déjà utilisé**
→ Change le port :
```
poetry run fastapi dev app/main.py --port 8001
npm run dev -- --port 5174
```
Puis modifie `frontend/.env` : `VITE_API_URL=http://localhost:8001`.

**Login refusé**
→ Vérifie que le backend tourne (terminal 1). Test : `curl http://localhost:8000/health` doit répondre.

---

## 9. Déploiement plus tard

Le code est sur **https://github.com/wafaben88/teacherlab**.
Tu pourras déployer sur Render.com, Railway, Vercel ou un VPS quand tu veux. Le `README.md` à la racine donne les indications.
