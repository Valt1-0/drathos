#!/bin/bash
# Script pour créer une nouvelle release complète (Windows + Linux)
# Usage: ./scripts/build-release.sh <version>
#
# La version est passée explicitement à electron-builder via
# --config.extraMetadata.version pour gérer les tags dont le
# package.json n'a pas été mis à jour.

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
npm run build && npx electron-builder --win --publish never --config.extraMetadata.version=$VERSION
if [ $? -eq 0 ]; then
  mv dist/*.exe dist/*.zip "releases/v$VERSION/" 2>/dev/null
  echo "✅ Windows build complete"
else
  echo "❌ Windows build failed"
fi

# Build image Docker avec le code source courant
echo "🐳 Building Docker image..."
docker build -t drathos-builder . 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Docker image build failed"
  exit 1
fi
echo "✅ Docker image ready"

# Build Linux via Docker
echo "📦 Building Linux with Docker..."
CID=$(docker create drathos-builder bash -c "npm run build && npx electron-builder --linux --x64 --publish never --config.extraMetadata.version=$VERSION")
docker start -a $CID
docker cp $CID:/app/dist/. ./dist-linux/ 2>/dev/null
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
