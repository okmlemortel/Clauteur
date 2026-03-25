# CONTEXT.md — Clauteur
> Instructions permanentes pour tous les agents (Cowork, Claude.ai) et pour Olivier.
> Ce fichier est la source de vérité du projet. Lire en entier avant toute action.

---

## Vision du projet

Clauteur est une plateforme de tutorat IA personnalisée pour une élève de 13 ans (8th grade).
Elle combine tutorat conversationnel via Claude API, suivi cognitif longitudinal,
dashboard parents, et composants pédagogiques visuels interactifs.

Objectif central : ne pas seulement combler des lacunes académiques, mais transformer
la relation de l'élève avec la pensée logique — comment elle raisonne, argumente,
et connecte les savoirs entre eux.

---

## Profil élève

- Âge : 13 ans, 8th grade
- Langues : français et anglais (alternance naturelle selon le sujet)
- Centres d'intérêt : jeux, sport, musique, cuisine (et autres)
- Profil d'apprentissage : essaie mais se décourage vite
- Lacunes : maths accumulées + structuration du raisonnement logique + expression claire
- À NE JAMAIS FAIRE : signaler le retard, l'urgence, ou comparer à un niveau attendu

Profil cognitif actuel détaillé → /.claude/student-profile.json

---

## Rôles des agents

### Claude.ai (tuteur + designer pédagogique)
- Conduit les sessions de tutorat
- Génère les composants pédagogiques visuels (artifacts React/HTML)
- Analyse l'évolution cognitive entre sessions
- Produit les rapports parents
- Documente les besoins dans COMMUNICATION.md

### Cowork (ingénieur plateforme)
- Construit et maintient l'infrastructure technique
- Intègre les composants pédagogiques générés par Claude.ai
- Déploie sur Railway
- Met à jour les statuts dans COMMUNICATION.md
- Ne modifie PAS la logique pédagogique — intégration uniquement

### Figma (design system + maquettes)
- Maquettes UI avant implémentation
- Design des composants pédagogiques complexes
- Knowledge map visuelle (structure avant animation)
- Référence dans figma-links.md

### Olivier (architecte + reviewer)
- Review et merge les contributions
- Transmet les composants Claude.ai → Cowork
- Décisions de priorité
- Accès au profil complet de l'élève

---

## Stack technique

```
Frontend    : Next.js 14 (App Router) + React + Tailwind CSS
Backend     : Express.js — Railway
Base données: Supabase (PostgreSQL + Auth + Storage)
Orchestr.   : n8n (Railway) — automatisations post-session
IA          : Claude API (claude-sonnet-4-20250514)
Voix        : Whisper API (phase 2 — optionnel)
Hébergement : Railway (backend + n8n) + Vercel (frontend)
Repo        : GitHub — github.com/[org]/clauteur
```

---

## Structure du projet

```
clauteur/
├── .claude/
│   ├── CONTEXT.md              ← ce fichier
│   ├── COMMUNICATION.md        ← coordination inter-agents
│   ├── student-profile.json    ← profil cognitif actuel
│   └── figma-links.md          ← liens Figma par composant
│
├── pending/
│   └── lessons/                ← composants générés par Claude.ai
│       ├── *.jsx               ← composant React autonome
│       └── BRIEF.md            ← instructions d'intégration pour Cowork
│
├── frontend/
│   ├── app/
│   │   ├── student/
│   │   │   ├── session/        ← interface conversation tuteur
│   │   │   ├── progress/       ← carte de progression élève
│   │   │   └── lessons/        ← composants pédagogiques actifs
│   │   └── parent/
│   │       ├── overview/       ← vue générale
│   │       ├── reports/        ← rapports de session
│   │       └── alerts/         ← système d'alertes
│   └── components/
│       ├── ui/                 ← composants génériques
│       ├── lessons/            ← composants intégrés par Cowork
│       └── charts/             ← visualisations progression
│
├── backend/
│   ├── routes/
│   │   ├── session.js
│   │   ├── analysis.js
│   │   └── reports.js
│   ├── services/
│   │   ├── claude.js           ← intégration Claude API + system prompt dynamique
│   │   ├── memory.js           ← gestion mémoire Supabase
│   │   └── alerts.js           ← système d'alertes
│   └── middleware/
│       └── auth.js             ← JWT (rôles : student / parent)
│
├── n8n/
│   └── workflows/              ← automatisations post-session
│
└── docs/
    └── sessions/               ← rapports archivés par date
```

---

## Schéma Supabase

```sql
-- Profil élève
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY,
  internal_code TEXT UNIQUE,
  age INT,
  grade TEXT,
  languages TEXT[],
  interests TEXT[],
  cognitive_stage INT DEFAULT 1,        -- 1 à 4
  best_anchor TEXT,                     -- 'cuisine', 'musique', etc.
  frustration_threshold INT DEFAULT 3,  -- minutes avant abandon
  uncertainty_vocab_level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (synthèses, jamais transcriptions brutes)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  started_at TIMESTAMP,
  duration_minutes INT,
  mode TEXT,                            -- 'fondations' | 'programme' | 'exploration'
  summary TEXT,
  cognitive_observations JSONB,
  spontaneous_connections TEXT[],
  frustration_events INT DEFAULT 0,
  recovery_speed TEXT,                  -- 'rapide' | 'moyen' | 'lent'
  parent_report JSONB,
  alert_level INT DEFAULT 0             -- 0: rien | 1: noter | 2: alerter | 3: urgent
);

-- Knowledge map — nœuds
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  domain TEXT,
  concept TEXT,
  mastery_level FLOAT DEFAULT 0,        -- 0 à 1
  last_visited TIMESTAMP,
  anchor_used TEXT
);

-- Knowledge map — connexions inter-concepts
CREATE TABLE knowledge_connections (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  concept_a TEXT,
  concept_b TEXT,
  strength FLOAT DEFAULT 0.1,
  first_observed TIMESTAMP,
  last_reinforced TIMESTAMP
);

-- Marqueurs cognitifs longitudinaux
CREATE TABLE cognitive_markers (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  session_id UUID REFERENCES sessions(id),
  marker_type TEXT,   -- 'justification' | 'incertitude' | 'connexion' | 'identite'
  value TEXT,
  stage_at_time INT,
  noted_at TIMESTAMP
);

-- Alertes parents
CREATE TABLE parent_alerts (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  session_id UUID REFERENCES sessions(id),
  level INT,          -- 1 | 2 | 3
  type TEXT,
  message TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## System prompt dynamique — logique (backend/services/claude.js)

Le system prompt se reconstruit à chaque session depuis Supabase.
Il ne doit jamais être hardcodé.

```javascript
const buildSystemPrompt = async (studentId) => {
  const profile    = await getStudentProfile(studentId)
  const sessions   = await getLastSessions(studentId, 5)
  const knowledge  = await getKnowledgeMap(studentId)

  return `
    Tu es le tuteur IA de [prénom], ${profile.age} ans.

    PROFIL COGNITIF ACTUEL :
    - Stade de justification : ${profile.cognitiveStage} / 4
    - Ancrage le plus efficace : ${profile.bestAnchor}
    - Seuil de frustration : ${profile.frustrationThreshold} min
    - Vocabulaire d'incertitude : niveau ${profile.uncertaintyVocab}

    KNOWLEDGE MAP — zones actives :
    ${JSON.stringify(knowledge.activeZones)}

    DERNIÈRES SESSIONS :
    ${sessions.map(s => s.summary).join('\n')}

    OBJECTIF AUJOURD'HUI :
    ${buildSessionObjective(profile, knowledge)}

    GARDE-FOUS ACTIFS :
    - Signaux d'alarme : détecter et escalader (voir protocole)
    - Durée max : 35 minutes
    - Jamais signaler le retard ou l'urgence
    - Toujours se présenter comme IA

    FIN DE SESSION :
    Générer le rapport parent en JSON selon schéma défini.
  `
}
```

---

## Composants pédagogiques — convention d'intégration

Claude.ai génère des composants React/HTML interactifs pour ancrer les concepts.

### Nomenclature
```
[concept]-[ancrage]-[type].jsx

Exemples :
  fractions-pizza-visualizer.jsx
  proportions-recipe-game.jsx
  patterns-music-rhythm.jsx
  probability-sports-simulator.jsx
```

### Placement
```
Généré par Claude.ai  →  /pending/lessons/
Intégré par Cowork    →  /frontend/components/lessons/
```

### Props standard
```typescript
interface LessonComponentProps {
  studentLevel: number          // 1-4
  conceptId: string             // ex: 'fractions_denominateurs'
  anchor: string                // ex: 'cuisine'
  onComplete: (result: LessonResult) => void
  onStruggle: () => void        // signal de difficulté détectée
}
```

### Règle importante
Les composants sont autonomes — aucune dépendance externe.
Cowork les intègre sans modifier la logique fonctionnelle.

---

## Système d'alertes — niveaux et comportements

```javascript
const ALERT_LEVELS = {
  0: 'rien',          // rapport normal uniquement
  1: 'noter',         // note discrète dans rapport hebdo
  2: 'alerter_24h',   // notification push parent dans les 24h
  3: 'urgent'         // notification immédiate + sortir du mode tuteur
}
```

### Déclencheurs niveau 3 — HARDCODÉS, NON CONFIGURABLES

Ces déclencheurs sont dans le code, pas dans la config.
Ils ne peuvent pas être désactivés par aucun agent ni par Olivier.

```javascript
const CRITICAL_TRIGGERS = [
  // français
  'me faire du mal', 'mourir', 'plus envie de', 'en finir',
  'personne s\'en fout', 'inutile', 'disparaître',
  // anglais
  'hurt myself', 'kill myself', 'end it', 'nobody cares',
  'want to disappear', 'worthless'
  // liste à compléter en consultation
]
```

Comportement niveau 3 : sortir du mode tuteur, message de soutien,
notification immédiate Olivier, ne pas continuer la session.

---

## Règles non négociables — NE PAS MODIFIER

Ces règles sont architecturales. Aucun agent ne les contourne.

1. Détection alertes niveau 3 — hardcodée, non désactivable
2. Timeout session — 35 min max, non contournable
3. Identification IA — la plateforme se présente toujours comme outil IA
4. Séparation logs/rapports — parents ne lisent jamais les logs bruts
5. Pas de transcriptions complètes stockées — synthèses uniquement
6. Profil élève sans nom complet en base — internal_code uniquement

---

## Variables d'environnement requises

```env
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
N8N_WEBHOOK_URL=
RAILWAY_ENV=production
GITHUB_TOKEN=               # pour push automatisé depuis scripts
```

---

## Workflow inter-agents (résumé)

```
Claude.ai génère composant    →   Script push GitHub (une commande)
                              →   GitHub Action déclenché
                              →   Issue créée pour Cowork
                              →   COMMUNICATION.md mis à jour (statut ⏳)
Cowork intègre + déploie      →   Ferme l'issue
                              →   COMMUNICATION.md mis à jour (statut ✅)
n8n post-session              →   Analyse cognitive → Supabase
                              →   Rapport parent généré
                              →   Alerte si niveau > 0
```

---

## Sprints de build

### Sprint 1 — MVP (Cowork, Weekend 1)
- Setup Railway + Supabase + schéma DB
- Auth JWT (rôles student/parent)
- Interface session basique (conversation)
- Rapport parent minimal post-session

### Sprint 2 — Mémoire (Cowork, Weekend 2)
- System prompt dynamique depuis Supabase
- Analyse cognitive post-session (n8n)
- Knowledge map en base de données
- Dashboard parents v1

### Sprint 3 — Visuel (Claude.ai + Cowork, Semaines 3-4)
- Premiers composants pédagogiques (Claude.ai → Cowork)
- Knowledge map visuelle élève
- GitHub Actions pour intégration automatisée

---

*Dernière mise à jour : 2026-03-26 — Olivier Kabeya Matanda*
