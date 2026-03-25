# Clauteur

> Plateforme de tutorat IA personnalisée — Claude + tuteur + auteur

---

## Vue d'ensemble

Clauteur est un système de tutorat IA construit autour de trois axes :
- **Tutorat conversationnel** via Claude API avec mémoire persistante
- **Suivi cognitif longitudinal** — pas seulement les notes, mais comment la pensée évolue
- **Composants pédagogiques visuels** générés par Claude.ai et intégrés dans la plateforme

## Architecture multi-agents

| Agent | Rôle |
|-------|------|
| **Claude.ai** | Tuteur + générateur de composants pédagogiques |
| **Cowork** | Ingénieur plateforme — build + intégration + déploiement |
| **Figma** | Design system + maquettes + composants visuels complexes |
| **Olivier** | Architecte — review + priorités + profil élève |

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env
# Remplir : ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET

# 2. Frontend
cd frontend && npm install && npm run dev

# 3. Backend
cd backend && npm install && npm run dev
```

## Coordination inter-agents

Voir [.claude/COMMUNICATION.md](.claude/COMMUNICATION.md) — fichier de coordination en temps réel.

Voir [.claude/CONTEXT.md](.claude/CONTEXT.md) — contexte permanent et conventions.

## Push d'un composant pédagogique (Claude.ai → Cowork)

```bash
export GITHUB_TOKEN=ghp_xxxx
export GITHUB_REPO=ton-org/clauteur
./scripts/push-component.sh fractions-pizza-visualizer.jsx "Visualiseur fractions — ancrage cuisine"
```

Le GitHub Action crée automatiquement une issue pour Cowork.

---

*Projet Menji AI — 2026*
