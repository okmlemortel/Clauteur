# COMMUNICATION.md — Clauteur
> Coordination inter-agents : Claude.ai ↔ Cowork ↔ Olivier
> Lire ce fichier AVANT toute action. Mettre à jour les statuts après chaque action.

---

## 🔴 EN ATTENTE D'ACTION

*(vide pour l'instant — projet en initialisation)*

---

## 🟡 EN COURS

### [2026-03-26] — Cowork
**Tâche** : Setup initial — structure projet + Railway + Supabase
**Priorité** : Haute — Sprint 1
**Instructions** :
1. Créer le projet Next.js 14 avec App Router dans /frontend
2. Créer le backend Express.js dans /backend
3. Initialiser Supabase avec le schéma défini dans CONTEXT.md
4. Configurer Railway pour le backend + n8n
5. Auth JWT avec deux rôles : student / parent
6. Interface session basique : zone de chat + envoi message
7. Rapport parent minimal généré en fin de session
**Référence** : CONTEXT.md — sections "Stack technique", "Schéma Supabase", "Sprint 1"
**Statut** : 🟡 À démarrer

---

## ✅ COMPLÉTÉ

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

*Dernière mise à jour : 2026-03-26 — Initialisation*
