# Drathos - Game Library Client

Application Electron de gestion de bibliothèque de jeux DRM-Free avec support Discord Rich Presence.

## 🚀 Installation

```bash
npm install
```

## 💻 Development

```bash
npm run dev
```

## 📦 Build

```bash
# Build standard
npm run build

# Build pour une plateforme spécifique
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

## 🛠️ Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- Extensions recommandées :
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 📁 Structure

```
drathos/
├── src/
│   ├── main/              # Main process (Electron)
│   │   ├── index.js       # Point d'entrée
│   │   └── utils/
│   │       └── discordRPC.js  # Discord Rich Presence
│   ├── preload/           # Preload scripts
│   └── renderer/          # React app
└── resources/             # Assets
```

## ✨ Fonctionnalités

- 🎮 Gestion de bibliothèque de jeux
- 🚀 Lancement de jeux (natif + Wine)
- 📊 Statistiques de jeu
- 🎯 Discord Rich Presence
- 🌐 Mode online/offline

---
