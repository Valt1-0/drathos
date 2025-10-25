const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './build/icon', // Electron Forge ajoute automatiquement .ico/.icns/.png selon la plateforme
    name: 'Drathos',
    executableName: 'Drathos',
    appBundleId: 'com.valt.drathos',
    appCategoryType: 'public.app-category.games',
    // Electron Forge inclut automatiquement les dependencies du package.json
    // et exclut les devDependencies
    ignore: (path) => {
      if (!path) return false;

      // Normaliser le chemin
      const normalizedPath = path.replace(/\\/g, '/');

      // GARDER dist-electron (notre build)
      if (normalizedPath.startsWith('/dist-electron')) {
        return false;
      }

      // GARDER node_modules (géré automatiquement par Forge)
      if (normalizedPath.startsWith('/node_modules')) {
        return false;
      }

      // Ignorer les fichiers/dossiers de développement
      const ignoredPaths = [
        '/src',
        '/.git',
        '/.vscode',
        '/dist',
        '/out',
        '/.env',
        '/electron.vite.config.mjs',
        '/forge.config.js',
        '/tsconfig',
        '/.eslintrc',
        '/.prettierrc',
        '/forge-build',
      ];

      return ignoredPaths.some(ignored => normalizedPath.startsWith(ignored));
    },
  },
  rebuildConfig: {},
  makers: [
    // Windows - Installeur Squirrel
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Drathos',
        setupIcon: './build/icon.ico',
      },
    },
    // macOS - Archive ZIP
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // Linux - Package DEB (Debian/Ubuntu)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'drathos',
          productName: 'Drathos',
          genericName: 'Game Library',
          description: 'Game Library Client for DRM Free Games',
          categories: ['Game'],
          icon: './build/icon.png',
          maintainer: 'Valt',
          homepage: 'https://valt.pm',
        },
      },
    },
    // Linux - Package RPM (Fedora/RedHat)
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'drathos',
          productName: 'Drathos',
          genericName: 'Game Library',
          description: 'Game Library Client for DRM Free Games',
          categories: ['Game'],
          icon: './build/icon.png',
          homepage: 'https://valt.pm',
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    prePackage: async () => {
      console.log('[Forge] Building with electron-vite...');
      execSync('npm run build', { stdio: 'inherit' });
    },
  },
};
