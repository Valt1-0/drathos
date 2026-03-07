# Dockerfile for building the Electron app in a linux-based environment.

FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# ── System dependencies ────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    python3 \
    git \
    curl \
    ca-certificates \
    # AppImage
    fuse \
    libfuse2 \
    squashfs-tools \
    # .deb
    fakeroot \
    dpkg \
    dpkg-dev \
    # .pacman — bsdtar used by electron-builder to create the archive
    libarchive-tools \
    xz-utils \
    # Electron runtime / packaging
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    libatspi2.0-0 \
    libsecret-1-0 \
    libgbm1 \
    xdg-utils \
    # Icons
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Allow AppImage to run without FUSE (fallback extraction mode)
ENV APPIMAGE_EXTRACT_AND_RUN=1

WORKDIR /app

# ── Dependencies (cached layer) ────────────────────────────────────────────
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ── Source ─────────────────────────────────────────────────────────────────
COPY . .
