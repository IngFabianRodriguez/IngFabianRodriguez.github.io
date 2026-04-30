#!/bin/bash
cd /data/data/com.termux/files/home/IngFabianRodriguez.github.io/portafolio/backlog
rm -rf node_modules/.vite dist
node node_modules/vite/bin/vite.js build
echo "BUILD_EXIT:$?"
