# COMMUNICATION.md — Clauteur
> Coordination inter-agents : Claude.ai ↔ Cowork ↔ Olivier
> Lire ce fichier AVANT toute action. Mettre à jour les statuts après chaque action.

---

## 🔴 EN ATTENTE D'ACTION

### [2026-03-28] — Olivier
**Tâche** : Commit + push Sprint 1 v3 sur GitHub
**Type** : infra
**Priorité** : Haute
**Instructions** : Le code v3 a été généré localement. Doit être commité et poussé.
**Statut** : ⏳ En attente

### [2026-03-28] — Olivier
**Tâche** : Configurer Supabase + Railway + Vercel pour v3
**Type** : infra
**Priorité** : Haute — bloque les tests en production
**Instructions** :
1. Créer le projet Supabase → exécuter `supabase/migrations/001_initial_schema.sql` (tables: students, parents, skill_map, case_templates, sessions, parent_alerts)
2. Créer le service Railway pour le backend (voir `docs/RAILWAY-SETUP.md`)
3. Déployer le frontend sur Vercel
4. Variables d'environnement requises :
   - `ANTHROPIC_API_KEY` (clé prête)
   - `DEEPGRAM_API_KEY` (clé prête)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
5. Tester le flow complet (voir checklist validation ci-dessous)
**Référence** : docs/RAILWAY-SETUP.md, backend/.env.example, frontend/.env.local.example
**Statut** : ⏳ En attente

### [2026-03-28] — Claude.ai
**Tâche** : Fournir les case templates supplémentaires
**Type** : contenu pédagogique
**Priorité** : Moyenne — 2 templates seed existent déjà
**Instructions** : Créer 5-10 case templates couvrant les skills fragiles/untested d'Olivia. Insérer via SQL dans case_templates.
**Statut** : ⏳ En attente

---

## 🟡 EN COURS

*(rien en cours — build v3 terminé, en attente déploiement)*

---

## ✅ COMPLÉTÉ

### [2026-03-28] — Cowork
**Tâche** : Sprint 1 v3 — Rebuild complet post-diagnostic
**Type** : infra + feature
**Source** : Design spec Claude.ai 2026-03-28 — "Updated Sprint 1 Spec" (post sessions diagnostiques avec Olivia)
**Changements majeurs vs v2** :
- Modèle de session : Plan/Solve/Explain (remplace Concret/Visuel/Symbolique)
- CaseFile G/P/S : composant central — carnet de détective avec 4 champs
- Verrouillage de champs par phase (plan = Given+Problem actifs, solve = Solution active, explain = Explanation active)
- Edit tracker : suivi invisible keystroke/timing/pauses pour analyse cognitive
- Voice : intégration Deepgram Nova-3 (WebSocket streaming, pas Whisper)
- Deux agents Claude : Tutor (Sonnet) + Language Agent (Haiku, async)
- Case selector : moteur de priorité basé sur skill_map
- Timer : 15-20 min (au lieu de 40)
- Schéma DB v3 : skill_map, case_templates (avec 2 cases seed), sessions enrichies
- Profil Olivia mis à jour (English-dominant, detective/mystery anchor, G/P/S framework)
**Fichiers backend** (18 fichiers, tous syntax OK) :
- services/ : tutor.js, languageAgent.js, caseSelector.js, deepgram.js, systemPrompt.js, reportGenerator.js, memory.js, alerts.js, claude.js, supabase.js
- routes/ : auth.js, session.js, cases.js, reports.js, analysis.js, voice.js (WebSocket)
- middleware/ : auth.js
- index.js (HTTP + WebSocket server)
**Fichiers frontend** (19 fichiers, 0 erreurs TypeScript) :
- Nouveau : CaseFile.tsx, CaseHeader.tsx, VoiceButton.tsx, editTracker.ts, deepgram.ts
- Réécrit : session/page.tsx, PhaseIndicator.tsx, WorkspacePanel.tsx, SessionTimer.tsx, api.ts, ChatPanel.tsx
- Mis à jour : parent overview + reports pages
**Supabase** : 001_initial_schema.sql — 6 tables + seed data (Olivia profile + 28 skills + 2 case templates)
**Validation** : Backend 18/18 syntax OK, Frontend 0 TypeScript errors
**Statut** : ✅ Build terminé — en attente commit + déploiement

### [2026-03-26] — Cowork
**Tâche** : Sprint 1 MVP v2 — Rebuild selon première spec Claude.ai
**Type** : infra + feature
**Statut** : ✅ Remplacé par v3

### [2026-03-26] — Cowork
**Tâche** : Sprint 1 MVP v1 — Build initial frontend + backend
**Statut** : ✅ Remplacé par v2 puis v3

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

## 🧩 CASE TEMPLATES — FILE D'ATTENTE

| Case | Skills ciblées | Ancrage | Difficulté | Langue explain | Status |
|------|---------------|---------|------------|----------------|--------|
| The Baker's Dilemma | fractions_as_reasoning, justification_depth, written_structure | cooking | 2 | fr | ✅ Seed |
| The Missing Concert Tickets | fractions_as_reasoning, sequencing, justification_depth | mystery | 2 | fr | ✅ Seed |
| *(à venir — Claude.ai doit fournir 5-10 templates supplémentaires)* | | | | | |

---

## 🚨 ALERTES ACTIVES

*(aucune)*

---

## 📝 NOTES INTER-AGENTS

### Pour Cowork
- Le modèle de session est maintenant Plan/Solve/Explain (G/P/S)
- Les case templates sont dans Supabase, pas dans le code
- Le tutor agent (Sonnet) et le language agent (Haiku) tournent en parallèle
- Voice via Deepgram WebSocket — audio jamais stocké, seulement transcriptions
- Edit tracker capture les frappes/pauses — données pour l'analyse cognitive (Sprint 2)

### Pour Claude.ai
- Profil Olivia mis à jour : English-dominant, G/P/S framework, detective anchor
- Fournir les case templates via SQL INSERT dans case_templates
- Le system prompt est dans backend/services/systemPrompt.js — ne pas modifier
- Language agent prompt dans backend/services/languageAgent.js

### Pour Olivier
- Tu es le seul à merger les PRs
- Les alertes niveau 3 te sont notifiées hors de ce fichier (push + SMS)
- Clés API requises : ANTHROPIC_API_KEY + DEEPGRAM_API_KEY
- Review hebdomadaire recommandée : vendredi soir

---

## ✅ CHECKLIST DE VALIDATION — Sprint 1 v3

```
1.  [ ] Olivia se connecte avec "ELEVE-001"
2.  [ ] Voit le chat panel seul (warm-up)
3.  [ ] Claude la salue, lui demande comment va sa journée (2-3 échanges)
4.  [ ] Claude présente un case detective
5.  [ ] Le workspace slide in — CaseFile avec champs G/P/S
6.  [ ] Phase indicator : ● plan  ○ solve  ○ explain
7.  [ ] Olivia tape son plan dans Given + Problem
8.  [ ] Claude lit le plan, peut poser une question
9.  [ ] Claude signale transition → ○ plan  ● solve  ○ explain
10. [ ] Champ Solution déverrouillé, Given/Problem verrouillés
11. [ ] Olivia résout (texte ou voix — Deepgram transcrit)
12. [ ] Claude signale transition → ○ plan  ○ solve  ● explain
13. [ ] Champ Explanation déverrouillé
14. [ ] Claude demande d'expliquer en français
15. [ ] Elle tape ou parle son explication
16. [ ] Claude pose une question de suivi
17. [ ] Session se termine — timer ou Claude conclut
18. [ ] Edit log + données sauvegardées dans Supabase
19. [ ] Rapport parent généré

20. [ ] Parent se connecte avec "PARENT-001"
21. [ ] Voit le dashboard avec le rapport
22. [ ] Rapport montre : skills pratiquées, qualité du plan, solution correcte,
        qualité explication, nouveaux connecteurs, moment notable, action parent
```

---

*Dernière mise à jour : 2026-03-28 — Sprint 1 v3 build par Cowork (spec post-diagnostic Claude.ai)*
