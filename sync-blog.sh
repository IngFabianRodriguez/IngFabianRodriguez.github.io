#!/bin/bash
set -e

if [ -z "$NOTION_TOKEN" ]; then
  echo "Error: define la variable NOTION_TOKEN antes de correr este script."
  echo "  export NOTION_TOKEN=ntn_tu_token_aqui"
  exit 1
fi

echo "==> Generando articulos desde Notion..."
cd scripts
node generate-blog.js
cd ..

echo ""
echo "==> Publicando en GitHub Pages..."
git add 365daysofai/
if git diff --staged --quiet; then
  echo "    Sin cambios nuevos."
else
  FECHA=$(date '+%Y-%m-%d')
  git commit -m "chore(blog): sync articulos Notion $FECHA"
  git push origin main
  echo "    Listo! Publicado en ingfabianrodriguez.github.io/365daysofai/"
fi
