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
1. Créer le projet Supabase → exécuter `supabase/migrations/001_initial_schema.sql` (schéma simplifié : students, parents, sessions, knowledge_map, parent_alerts)
2. Créer le service Railway pour le backend (voir `docs/RAILWAY-SETUP.md`)
3. Déployer le frontend sur Vercel
4. Configurer les variables d'environnement (voir `.env.example` dans backend + frontend)
5. Optionnel : ajouter ANTHROPIC_API_KEY pour activer le vrai Claude (sinon le stub intelligent fonctionne)
6. Tester le flow complet (voir checklist validation ci-dessous)
**Référence** : docs/RAILWAY-SETUP.md, backend/.env.example, frontend/.env.local.example
**Statut** : ⏳ En attente

### [2026-03-26] — Olivier
**Tâche** : Commit + push du code Sprint 1 sur GitHub
**Type** : infra
**Priorité** : Haute
**Instructions** : Le code a été généré localement. Il doit être commité et poussé sur le repo GitHub.
**Statut** : ⏳ En attente

---

## 🟡 EN COURS

*(rien en cours — en attente du déploiement par Olivier)*

---

## ✅ COMPLÉTÉ

### [2026-03-26] — Cowork
**Tâche** : Sprint 1 MVP v2 — Rebuild complet selon spec Claude.ai
**Type** : infra + feature
**Source** : Design spec Claude.ai 2026-03-26 — "Sprint 1 Design Review & Spec"
**Changements vs v1** :
- Session split-panel : chat gauche (280px) + workspace droite (flex)
- "Morphing session" : warm-up → mode selector → workspace → explanation → connection
- Phase indicator : ● concret  ○ visuel  ○ symbolique
- Claude service : vrai appel API (claude-sonnet-4-20250514) + fallback stub intelligent
- Réponses structurées JSON : message + phase + alertLevel + cognitiveNotes
- System prompt dynamique (services/systemPrompt.js)
- Générateur de rapports parents (services/reportGenerator.js)
- Auth simplifié : un seul code → rôle déduit (ELEVE-xxx = student, PARENT-xxx = parent)
- Schéma DB simplifié : students, parents, sessions, knowledge_map, parent_alerts
- Timer session : 40 min (au lieu de 35)
**Fichiers** :
- /frontend/ — 16 fichiers (pages + composants + lib)
  - Session page split-panel avec ModeSelector, WorkspacePanel, PhaseIndicator
  - ChatPanel réutilisable (mode large + narrow)
  - Parent dashboard mis à jour pour nouveau format de rapport
- /backend/ — 12 fichiers
  - services/ : claude.js, systemPrompt.js, reportGenerator.js, memory.js, alerts.js, supabase.js
  - routes/ : auth.js, session.js, reports.js, analysis.js
  - middleware/ : auth.js
- /supabase/migrations/001_initial_schema.sql — schéma simplifié + seed data
**Validation** : Backend syntax OK (12/12 fichiers), Frontend TypeScript OK (0 erreurs)
**Statut** : ✅ Build terminé — en attente commit + déploiement

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

## ✅ CHECKLIST DE VALIDATION — Sprint 1

```
1. [ ] Élève se connecte avec "ELEVE-001"
2. [ ] Voit l'interface session — chat plein écran (warm-up)
3. [ ] Claude la salue chaleureusement
4. [ ] Elle choisit un mode : "Session du jour"
5. [ ] Le workspace s'ouvre à droite, le chat passe à gauche
6. [ ] Phase indicator : ● concret  ○ visuel  ○ symbolique
7. [ ] Elle échange avec Claude, réponses structurées JSON
8. [ ] Les transitions de phase arrivent via Claude
9. [ ] Timer compte jusqu'à 40 min, warning à 35
10. [ ] Session se termine → rapport parent généré
11. [ ] Parent se connecte avec "PARENT-001"
12. [ ] Voit le dashboard avec le rapport de session
13. [ ] Rapport montre : engagement, moment notable, forces/blocages, signaux cognitifs
14. [ ] Rapport montre : session suggérée + action parent
```

---

*Dernière mise à jour : 2026-03-26 — Sprint 1 v2 rebuild par Cowork (spec Claude.ai)*
