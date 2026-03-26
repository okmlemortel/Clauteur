# Railway — Guide de déploiement Clauteur

## 1. Créer le projet Railway

1. Aller sur [railway.app](https://railway.app) → New Project
2. Nommer le projet : `clauteur`

## 2. Déployer le backend Express.js

### Option A — Depuis GitHub (recommandé)
1. Dans Railway : Add Service → GitHub Repo
2. Sélectionner le repo `clauteur`
3. **Root Directory** : `backend`
4. **Start Command** : `npm start`

### Option B — Depuis le CLI
```bash
cd backend
railway login
railway init
railway up
```

### Variables d'environnement (Railway → backend service → Variables)
```
PORT=3001
SUPABASE_URL=https://[ton-projet].supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=[générer avec: openssl rand -hex 32]
FRONTEND_URL=https://clauteur.vercel.app
NODE_ENV=production
```

## 3. Configurer Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Nommer : `clauteur`
3. Copier l'URL et la Service Key (Settings → API)
4. Ouvrir le SQL Editor
5. Coller et exécuter le contenu de `supabase/migrations/001_initial_schema.sql`
6. Vérifier que les tables sont créées (Table Editor)

### Seed data
Le script SQL crée automatiquement un profil élève :
- **Code élève** : `ELEVE-001`
- **Code parent** : `PARENT-001` (à ajouter dans la logique auth si besoin)

## 4. Déployer le frontend sur Vercel

1. Importer le repo sur [vercel.com](https://vercel.com)
2. **Root Directory** : `frontend`
3. **Framework Preset** : Next.js
4. Variables d'environnement :
```
NEXT_PUBLIC_API_URL=https://[ton-service].railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://[ton-projet].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 5. Vérification

1. Ouvrir le frontend Vercel
2. Se connecter avec `ELEVE-001` → mode élève
3. Démarrer une session → envoyer un message → vérifier la réponse stub
4. Terminer la session
5. Se connecter avec `PARENT-001` → mode parent
6. Vérifier la vue d'ensemble + le rapport de session

## 6. n8n (Sprint 2 — plus tard)

Railway supporte n8n en tant que service Docker :
1. Add Service → Docker Image → `n8nio/n8n`
2. Port : 5678
3. Variable : `N8N_BASIC_AUTH_ACTIVE=true`

Ce n'est pas nécessaire pour le MVP Sprint 1.

---

*Dernière mise à jour : 2026-03-26*
