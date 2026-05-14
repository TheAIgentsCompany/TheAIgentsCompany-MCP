#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# TheAIgentsCompany-MCP — Docker runner
# Builds and runs the MCP server in SSE mode, mountant automatiquement
# les projets et skills depuis les chemins par défaut.
#
# Usage:
#   ./docker-run.sh              → build + run (port 8000)
#   ./docker-run.sh --port 8080  → port personnalisé
#   ./docker-run.sh --build      → force le rebuild
#   ./docker-run.sh --stop       → arrête le conteneur
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

IMAGE="theaigentscompany/mcp"
CONTAINER="theaigentscompany-mcp"
PORT=8000
REBUILD=false
STOP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --build) REBUILD=true; shift ;;
    --stop) STOP=true; shift ;;
    *) echo "❌ Argument inconnu: $1"; exit 1 ;;
  esac
done

# ── Stop ────────────────────────────────────────────────────────────────────
if $STOP; then
  if docker ps -q --filter "name=$CONTAINER" | grep -q .; then
    echo "⏹️  Arrêt du conteneur $CONTAINER..."
    docker stop "$CONTAINER" >/dev/null
    docker rm "$CONTAINER" >/dev/null
    echo "✅ Conteneur arrêté"
  else
    echo "ℹ️  Aucun conteneur $CONTAINER en cours"
  fi
  exit 0
fi

# ── Build ───────────────────────────────────────────────────────────────────
if $REBUILD || ! docker images -q "$IMAGE" 2>/dev/null | grep -q .; then
  echo "🔧 Build de l'image Docker..."
  docker build -t "$IMAGE" .
  echo "✅ Image buildée"
else
  echo "ℹ️  Image déjà existante (--build pour forcer le rebuild)"
fi

# ── Chemins par défaut ──────────────────────────────────────────────────────
PROJECTS_DIR="${HOME}/Github/TheAIgentsCompany/agents/projects"
SKILLS_DIR="${HOME}/.hermes/skills"

# Vérifier que les dossiers existent
if [ ! -d "$PROJECTS_DIR" ]; then
  echo "⚠️  Dossier projets introuvable: $PROJECTS_DIR"
  echo "   Monte un volume personnalisé avec -v dans le Dockerfile"
fi
if [ ! -d "$SKILLS_DIR" ]; then
  echo "⚠️  Dossier skills introuvable: $SKILLS_DIR"
fi

# ── Stop existing ───────────────────────────────────────────────────────────
if docker ps -q --filter "name=$CONTAINER" | grep -q .; then
  echo "⏹️  Conteneur existant détecté, arrêt..."
  docker stop "$CONTAINER" >/dev/null
  docker rm "$CONTAINER" >/dev/null
fi

# ── Run ─────────────────────────────────────────────────────────────────────
echo "🚀 Lancement du MCP sur http://localhost:${PORT}/sse"
echo "   Projets: ${PROJECTS_DIR}"
echo "   Skills:  ${SKILLS_DIR}"
echo ""

docker run -d \
  --name "$CONTAINER" \
  -p "${PORT}:8000" \
  -v "${PROJECTS_DIR}:/app/data/projects" \
  -v "${SKILLS_DIR}:/app/data/skills" \
  --restart unless-stopped \
  "$IMAGE"

echo ""
echo "✅ MCP en ligne → http://localhost:${PORT}/sse"
echo ""
echo "Commandes utiles :"
echo "   Logs : docker logs -f $CONTAINER"
echo "   Stop : ./docker-run.sh --stop"
echo "   Test : curl -s http://localhost:${PORT}/sse | head -5"
