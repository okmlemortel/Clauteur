#!/bin/bash
# push-component.sh
# Usage : ./push-component.sh <fichier.jsx> "<description courte>"
#
# Ce script encode un composant React en base64 et le pousse
# directement vers le repo GitHub via l'API.
# Requiert : GITHUB_TOKEN et GITHUB_REPO en variables d'environnement
#
# Exemple :
#   export GITHUB_TOKEN=ghp_xxxx
#   export GITHUB_REPO=ton-org/clauteur
#   ./push-component.sh fractions-pizza-visualizer.jsx "Visualiseur fractions — ancrage cuisine"

set -e

# --- Paramètres ---
COMPONENT_FILE="$1"
DESCRIPTION="$2"
BRANCH="claude-contributions"

if [ -z "$COMPONENT_FILE" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage : ./push-component.sh <fichier.jsx> \"<description>\""
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_REPO" ]; then
  echo "Erreur : GITHUB_TOKEN et GITHUB_REPO doivent être définis"
  echo "  export GITHUB_TOKEN=ghp_xxxx"
  echo "  export GITHUB_REPO=ton-org/clauteur"
  exit 1
fi

if [ ! -f "$COMPONENT_FILE" ]; then
  echo "Erreur : fichier '$COMPONENT_FILE' introuvable"
  exit 1
fi

# --- Encoder en base64 ---
CONTENT=$(base64 -w 0 "$COMPONENT_FILE" 2>/dev/null || base64 "$COMPONENT_FILE")
FILENAME=$(basename "$COMPONENT_FILE")
DATE=$(date +%Y-%m-%d)
TARGET_PATH="pending/lessons/$FILENAME"

echo "📦 Push de $FILENAME vers $GITHUB_REPO..."

# --- Vérifier si le fichier existe déjà (pour update) ---
EXISTING=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$GITHUB_REPO/contents/$TARGET_PATH?ref=$BRANCH" \
  | grep '"sha"' | head -1 | sed 's/.*"sha": "\([^"]*\)".*/\1/')

# --- Construire le payload ---
if [ -n "$EXISTING" ]; then
  PAYLOAD=$(cat <<EOF
{
  "message": "Claude.ai: Update $FILENAME — $DESCRIPTION [$DATE]",
  "content": "$CONTENT",
  "sha": "$EXISTING",
  "branch": "$BRANCH"
}
EOF
)
  echo "📝 Mise à jour du fichier existant..."
else
  PAYLOAD=$(cat <<EOF
{
  "message": "Claude.ai: Add $FILENAME — $DESCRIPTION [$DATE]",
  "content": "$CONTENT",
  "branch": "$BRANCH"
}
EOF
)
  echo "✨ Création d'un nouveau fichier..."
fi

# --- Push vers GitHub ---
RESPONSE=$(curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$GITHUB_REPO/contents/$TARGET_PATH" \
  -d "$PAYLOAD")

# --- Vérifier le résultat ---
if echo "$RESPONSE" | grep -q '"content"'; then
  echo "✅ $FILENAME pushé avec succès vers $GITHUB_REPO/$TARGET_PATH"
  echo "🔔 GitHub Action déclenchée — issue Cowork créée automatiquement"
else
  echo "❌ Erreur lors du push :"
  echo "$RESPONSE" | grep '"message"' | head -3
  exit 1
fi
