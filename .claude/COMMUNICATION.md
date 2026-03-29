# COMMUNICATION.md — Clauteur
> Coordination inter-agents : Claude.ai ↔ Cowork ↔ Olivier
> Lire ce fichier AVANT toute action. Mettre à jour les statuts après chaque action.

---

## 🔴 EN ATTENTE D'ACTION

### [2026-03-28] — Olivier
**Tâche** : Activer Figma Dev Mode MCP Server
**Type** : design
**Priorité** : Basse — permet extraction tokens Figma directement
**Instructions** : Figma desktop → Menu → Preferences → Enable Dev Mode MCP Server → restart Claude desktop
**Statut** : ⏳ En attente

---

## 🟡 EN COURS

### [2026-03-29] — Cowork
**Tâche** : Validation end-to-end du flow session
**Type** : QA
**Priorité** : Haute
**Instructions** : Tester la checklist 22 étapes avec Claude API actif.
**Statut** : 🟡 En cours

### [2026-03-29] — Cowork
**Tâche** : Multi-Provider LLM Abstraction Layer + Ollama Refactoring
**Type** : infra
**Priorité** : Haute
**Source** : Spec de Claude.ai — "Multi-Provider LLM Spec" + "Ollama Refactoring Spec"
**Changements** :
- Créé `backend/services/llmProvider.js` — couche d'abstraction unifiée `chat(role, systemPrompt, messages)`
- Providers supportés : `claude` (Anthropic SDK) et `ollama` (REST API compatible OpenAI chat)
- **Config hybride** : `TUTOR_PROVIDER=claude` (rapide, interactif), `LANGUAGE_PROVIDER=ollama` (async, tolérant latence)
- Modèles : tutor → Claude Sonnet, language agent → Qwen 3.5 `qwen3.5:4b` via Ollama
- **Constat perf** : Qwen 9b sur Railway CPU = ~2min par réponse (trop lent pour tutoring interactif)
- Config env vars : `OLLAMA_URL`, `OLLAMA_TUTOR_MODEL`, `OLLAMA_LANGUAGE_MODEL`
- **Fallback automatique** : si Ollama échoue et `ANTHROPIC_API_KEY` est configurée, bascule vers Claude (Sonnet pour tutor, Haiku pour language)
- **Nettoyage réponse** : `cleanResponse()` strip les blocs `<think>...</think>` de Qwen + les code fences markdown avant parsing JSON
- `tutor.js` : graceful fallback si JSON parse échoue (retourne texte brut comme message)
- `languageAgent.js` : même graceful fallback + word count basique depuis texte brut
- `systemPrompt.js` + `tutorSystemPrompt.txt` : ajout règles JSON explicites pour compatibilité Qwen
- `index.js` : ajout endpoint `/api/diag/llm` — vérifie provider actif + modèles chargés sur Ollama
- `.env.example` mis à jour avec noms de modèles corrects
- Client Anthropic partagé (singleton) dans llmProvider
- Fonctions utilitaires : `isProviderAvailable(role)`, `checkProvider(role)`, `getProviderInfo()`
- Olivier a déployé Ollama (model_dock) sur Railway avec domaine privé dynamique
**Statut** : 🟡 Code implémenté — config hybride appliquée (Claude tutor + Ollama language), en attente push + test E2E

---

## ✅ COMPLÉTÉ

### [2026-03-29] — Cowork + Olivier
**Tâche** : Déploiement production — Supabase + Railway + Vercel
**Type** : infra
**Résultat** : App déployée et fonctionnelle end-to-end (login → session start → chat)
**URLs** :
- Frontend : https://clauteur-frontend.vercel.app
- Backend : https://clauteur-production.up.railway.app
**Bugs corrigés** :
- `/api/health` 404 → ajout route `/api/health` (était seulement `/health`)
- CORS env var mismatch → code vérifie `CORS_ORIGIN` puis `FRONTEND_URL`
- Login "Code invalide" → response shape corrigée (`{user_id, token, role, profile}`)
- Session 500 step 6 → `createSession` : supprimé colonne `mode`, mappé `casefile` vers colonnes individuelles
- Session 500 step 7 → `systemPrompt.js` : `languages.includes()` crashait car `languages` est un objet JSONB, pas un array. Aussi corrigé `first_name` → `name`
- Session 500 step 8 → `session.js` : variable `mode` non définie (ReferenceError), remplacée par `mode: 'detective'`
- `getSkillMap` : table `student_skills` → `skill_map`
- `updateSession` : `report` → `parent_report` column mapping
- `generateGreeting` : extraction nom depuis profil JSONB imbriqué
- `ANTHROPIC_API_KEY` env var : nom corrigé dans Railway
**Endpoints diagnostiques ajoutés** : `/api/diag`, `/api/diag/claude`, `/api/diag/claude-test`
**Statut** : ✅ Complété — app fonctionnelle, tutor Claude API actif

### [2026-03-28] — Cowork
**Tâche** : Sprint 2 — UI Polish + Visual Components + Deploy Guide
**Type** : frontend + infra
**Source** : Sprint 2 Spec de Claude.ai (2026-03-28)
**Changements** :
- `CaseFile.tsx` : colored left borders (teal/purple/amber/coral), lock icons, 8px/4px radii, 12px labels, 16px title
- `PhaseIndicator.tsx` : filled/outlined dots, completed checkmarks, uppercase labels
- `WorkspacePanel.tsx` : component loader system (visual component + case file), completedPhases tracking
- `RateTimeline.tsx` : animated timeline, play/pause, rate slider, comparison mode, alignment detection
- `FractionVisualizer.tsx` : circle/bar modes, steppers, common denominator animation, difference highlighting
- `session/page.tsx` : completedPhases state tracking + propagation
- `api.ts` : CaseTemplate.visual_component field added
- `003_visual_component.sql` : ALTER TABLE + UPDATE case templates with visual components
- Agent prompts externalized : `languageAgentPrompt.txt`, `tutorSystemPrompt.txt` (loaded via fs.readFileSync)
- `docs/DEPLOY-GUIDE.md` : complete Supabase + Railway + Vercel guide with 22-step checklist
**Validation** : All 10 backend JS files pass syntax. 0 TypeScript errors on frontend.
**Statut** : ✅ Complété

### [2026-03-28] — Cowork
**Tâche** : Intégration Content Package v1 (Claude.ai → codebase)
**Type** : contenu pédagogique + infra
**Source** : Content Package v1 de Claude.ai (2026-03-28)
**Changements** :
- 10 case templates ajoutés via `supabase/migrations/002_content_package_v1.sql`
- 28 skill definitions stockées dans `backend/config/skillDefinitions.json`
- `caseSelector.js` réécrit avec le priority engine (+10/+7/+5/+3/+2/+1/-5 scoring)
- `languageAgent.js` prompt enrichi (connector inventories, orthography patterns, scoring guides)
- `memory.js` corrigé : `student_skills` → `skill_map`, suppression filtre `status` inexistant
- Cognitive Analysis Agent prompt stocké dans `backend/config/cognitiveAnalysisPrompt.txt` (pour n8n Sprint 2)
- COMMUNICATION.md mis à jour
**Statut** : ✅ Complété

### [2026-03-28] — Claude.ai
**Tâche** : Fournir les case templates supplémentaires
**Type** : contenu pédagogique
**Livré** : Content Package v1 — 10 case templates, 28 skill definitions, 3 agent prompts, priority engine rules
**Statut** : ✅ Livré — intégré par Cowork

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
| #001 The DJ's Dilemma | rate_conversion, estimation, sequencing | music | 2 | fr | ✅ CP v1 |
| #002 The Mystery Ingredients | fractions_as_reasoning, proportional_direct, justification_depth | cooking | 2 | fr | ✅ CP v1 |
| #003 The Commute Investigation | rate_conversion, metacognition, causal_chains | mystery | 2 | en | ✅ CP v1 |
| #004 The Discount Detective | percentages, proportional_direct, counterarguments | mystery | 2 | fr | ✅ CP v1 |
| #005 The Party Planner Returns | division_remainders, fractions_as_reasoning, multi_constraint | planning | 2 | fr | ✅ CP v1 |
| #006 The Temperature Mystery | negative_numbers, causal_chains, connectors_en | mystery | 2 | en | ✅ CP v1 |
| #007 The Secret Code | variables_unknowns, causal_chains, written_structure | mystery | 3 | fr | ✅ CP v1 |
| #008 The Playlist Sequel | rate_conversion, proportional_direct, estimation | music | 3 | fr | ✅ CP v1 |
| #009 The Fairness Debate | fractions_as_reasoning, counterarguments, justification_depth | planning | 2 | en | ✅ CP v1 |
| #010 The Pattern Breaker | patterns_functions, transfer_unfamiliar, metacognition | mystery | 3 | fr | ✅ CP v1 |

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
- **LLM Provider Layer** : `llmProvider.js` abstrait Claude/Ollama. **Config hybride** : tutor = Claude Sonnet (défaut), language agent = Ollama qwen3.5:4b (défaut). Qwen 9b trop lent sur Railway CPU (~2min/réponse). Fallback automatique Claude si Ollama tombe. Pour forcer Ollama tutor : `TUTOR_PROVIDER=ollama`. Endpoint diag : `/api/diag/llm`.

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
1.  [x] Olivia se connecte avec "ELEVE-001"
2.  [x] Voit le chat panel seul (warm-up)
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

### Validé en production (2026-03-29)
- Login ELEVE-001 → ✅ 200, retourne token + profil Olivia complet
- Session start → ✅ 201, case sélectionné ("The Missing Concert Tickets"), greeting retourné
- Chat message → ✅ 200, Claude API répond avec réponses personnalisées
- Case selector → ✅ Priority engine fonctionne, sélection correcte
- Supabase → ✅ Connecté, 3+ skills, 3+ cases, session créée en DB
- Env vars → ✅ Toutes présentes (Anthropic, Deepgram, Supabase, JWT, CORS)
- Anthropic API → ✅ Crédits ajoutés, réponses Claude fonctionnelles

---

*Dernière mise à jour : 2026-03-29 — Déploiement production fonctionnel, Claude API actif, validation E2E en cours*
