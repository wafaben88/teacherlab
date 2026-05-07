# Teacher Hub

Espace de travail moderne pour enseignant en informatique : organisation des cours, exercices, fichiers, classes, planning et notes.

## Stack

- **Backend** : FastAPI + SQLAlchemy + SQLite (volume persistant), JWT auth
- **Frontend** : React + Vite + TypeScript + Tailwind CSS

## Structure

```
.
├── backend/   # API FastAPI (Python, Poetry)
└── frontend/  # SPA React (Vite, npm)
```

## Démarrage local

### Backend

```bash
cd backend
poetry install
poetry run fastapi dev app/main.py --port 8000
```

API : http://localhost:8000 — docs auto sur `/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # ajuster VITE_API_URL si besoin
npm run dev
```

App : http://localhost:5173

## Compte par défaut

- **Email** : `prof@teacher-hub.local`
- **Mot de passe** : `changeme123`

À changer en production.

## Fonctionnalités

- Tableau de bord (stats + graphiques)
- Bibliothèque de fichiers (upload, filtres, recherche, tags)
- Banque d'exercices (CRUD + filtres)
- Planning hebdomadaire (CRUD événements)
- Gestion classes & niveaux
- Notes / évaluations par classe
- Tâches (todo) avec priorité et échéance
- Paramètres (niveaux, matières, profil)

## Déploiement

- Backend : Fly.io avec volume persistant (`/data/app.db`)
- Frontend : `npm run build` puis hébergement statique (Vercel, Netlify, Cloudflare Pages…)
- Configurer `VITE_API_URL` côté frontend pour pointer vers l'URL publique du backend.

## Licence

Privé.
