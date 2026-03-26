# COMMUNICATION.md — Clauteur
> Coordination inter-agents : Claude.ai ↔ Cowork ↔ Olivier
> Lire ce fichier AVANT toute action. Mettre à jour les statuts après chaque action.

---

## 🔴 EN ATTENTE D'ACTION

### [2026-03-26] — Olivier
**Tâche** : Configurer Supabase + Railway + Vercel
**Type** : infra
**Priorité** : Haute — bloque les tests en production
**Instructions** :
1. Créer le projet Supabase → exécuter `supabase/migrations/001_initial_schema.sql`
2. Créer le service Railway pour le backend (voir `docs/RAILWAY-SETUP.md`)
3. Déployer le frontend sur Vercel
4. Configurer les variables d'environnement (voir `.env.example` dans backend + frontend)
5. Tester le flow : login ELEVE-001 → session → message → fin → login PARENT-001 → rapport
**Référence** : docs/RAILWAY-SETUP.md, backend/.env.example, frontend/.env.local.example
**Statut** : ⏳ En attente

---

## 🟡 EN COURS

*(rien en cours — en attente du déploiement par Olivier)*

---

## ✅ COMPLÉTÉ

### [2026-03-26] — Cowork
**Tâche** : Sprint 1 MVP — Build complet frontend + backend
**Type** : infra + feature
**Fichiers créés** :
- /frontend/ — Next.js 14 App Router + TypeScript + Tailwind CSS
  - Login page (code d'accès, rôle élève/parent)
  - Interface de session (chat bubbles, timer, envoi message)
  - Dashboard parent (vue générale, rapports, alertes)
  - Composants UI (ChatBubble, SessionTimer)
  - Auth context + API client
- /backend/ — Express.js
  - Auth JWT (student/parent roles, code-based login)
  - Routes : /api/auth, /api/session, /api/analysis, /api/reports
  - Services : claude.js (stubbed), memory.js, alerts.js
  - Système d'alertes niveau 0-3 (triggers hardcodés)
  - Messages en mémoire (pas de transcriptions en DB)
- /supabase/migrations/001_initial_schema.sql — schéma complet + seed data
- /docs/RAILWAY-SETUP.md — instructions de déploiement
**Validation** : Backend syntax OK (10/10 fichiers), Frontend TypeScript OK (0 erreurs)
**Statut** : ✅ Build terminé — en attente déploiement

### [2026-03-26] — Claude.ai + Olivier
**Tâche** : Initialisation du repo — fichiers fondateurs
**Fichiers créés** :
- /.claude/CONTEXT.md
- /.claude/COMMUNICATION.md
- /.claude/student-profile.json
- /.claude/figma-links.md
- /.github/workflows/claude-integration.yml
**Statut** : ✅ Commité

---

## 📋 PROTOCOLE D'UTILISATION

### Format d'une entrée

```markdown
### [DATE] — [AUTEUR : Claude.ai | Cowork | Olivier]
**Tâche** : Description courte
**Type** : nouveau-composant | bug | feature | intégration | infra
**Priorité** : Haute | Moyenne | Basse
**Instructions** : Détail des actions attendues
**Référence** : Liens vers fichiers ou issues GitHub
**Statut** : ⏳ En attente | 🟡 En cours | ✅ Complété | ❌ Bloqué
```

### Règles
- Déplacer vers la bonne section quand le statut change
- Ne jamais supprimer une entrée — archiver dans section ✅
- Pour les composants pédagogiques : toujours inclure le conceptId et l'ancrage
- Pour les bugs : inclure l'environnement (local | staging | production)

---

## 🧩 COMPOSANTS PÉDAGOGIQUES — FILE D'ATTENTE

| Composant | Concept | Ancrage | Généré | Intégré | Déployé |
|-----------|---------|---------|--------|---------|---------|
| *(à venir après sessions de diagnostic)* | | | | | |

---

## 🚨 ALERTES ACTIVES

*(aucune)*

---

## 📝 NOTES INTER-AGENTS

### Pour Cowork
- Les composants dans /pending/lessons/ arrivent de Claude.ai via Olivier
- Ne pas modifier la logique fonctionnelle des composants — intégration uniquement
- Props standard dans CONTEXT.md section "Composants pédagogiques"
- En cas de doute sur l'intégration : créer une issue GitHub et taguer Olivier

### Pour Claude.ai
- Consulter student-profile.json avant chaque session
- Mettre à jour COMMUNICATION.md après chaque composant généré
- Format du script de push dans CONTEXT.md section "Workflow inter-agents"
- Les figma-links.md sont mis à jour par Olivier après design Figma

### Pour Olivier
- Tu es le seul à merger les PRs
- Les alertes niveau 3 te sont notifiées hors de ce fichier (push + SMS)
- student-profile.json se met à jour automatiquement via n8n après chaque session
- Review hebdomadaire recommandée : vendredi soir

---

*Dernière mise à jour : 2026-03-26 — Sprint 1 MVP build terminé par Cowork*
