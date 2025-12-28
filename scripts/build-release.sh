#!/bin/bash
# Script pour créer une nouvelle release complète (Windows + Linux)
# Usage: ./scripts/build-release.sh <version>

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/build-release.sh <version>"
  echo "Exemple: ./scripts/build-release.sh 0.3.0"
  exit 1
fi

echo "🚀 Building Drathos v$VERSION..."
echo ""

# Créer le dossier de release
mkdir -p "releases/v$VERSION"

# Build Windows
echo "📦 Building Windows..."
npm run dist:win
if [ $? -eq 0 ]; then
  mv dist/*.exe dist/*.zip "releases/v$VERSION/" 2>/dev/null
  echo "✅ Windows build complete"
else
  echo "❌ Windows build failed"
fi

# Build Linux avec Docker
echo "📦 Building Linux with Docker..."
CID=$(docker create drathos-builder bash -c "npm run build && npx electron-builder --linux --x64 --publish never")
docker start -a $CID > /dev/null 2>&1
docker cp $CID:/app/dist/. ./dist-linux/ > /dev/null 2>&1
docker rm $CID > /dev/null 2>&1

if [ -f "dist-linux/Drathos-$VERSION-x86_64.AppImage" ]; then
  mv dist-linux/*.AppImage dist-linux/*.deb dist-linux/*.pacman "releases/v$VERSION/" 2>/dev/null
  rm -rf dist-linux
  echo "✅ Linux build complete"
else
  echo "❌ Linux build failed"
fi

# Afficher le résumé
echo ""
echo "✨ Release v$VERSION created!"
echo ""
ls -lh "releases/v$VERSION/"
