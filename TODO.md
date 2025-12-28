# 📋 Drathos - TODO List

> Liste complète des améliorations, optimisations et nouvelles fonctionnalités à implémenter

---

## 🎨 UI/UX & Design System

### Composants UI Réutilisables

- [ ] **Créer une bibliothèque de composants UI** (`src/renderer/src/components/ui/`)
  - [ ] Button (primary, secondary, danger, ghost)
  - [ ] Input (text, password, search, file)
  - [ ] Select / Dropdown
  - [ ] Checkbox & Radio
  - [ ] Toggle / Switch
  - [ ] Modal / Dialog (base réutilisable)
  - [ ] Card / Panel
  - [ ] Badge / Tag
  - [ ] Tooltip
  - [ ] Skeleton Loader
  - [ ] Progress Bar
  - [ ] Tabs
  - [ ] Alert / Banner
  - [ ] Avatar
  - [ ] Breadcrumb
  - [ ] Pagination

### Système de Thèmes

- [ ] **Implémenter un système de thèmes complet**
  - [ ] Créer `themeContext.jsx` pour gérer les thèmes
  - [ ] Thème Dark (défaut actuel)
  - [ ] Thème Light
  - [ ] Thème High Contrast (accessibilité)
  - [ ] Thèmes personnalisés (couleurs accent configurables)
  - [ ] Sauvegarde de préférence de thème dans le store
  - [ ] Switch de thème dans Settings
  - [ ] Support des couleurs système (auto light/dark selon l'OS)

### Internationalisation (i18n)

- [ ] **Mettre en place i18n avec react-i18next**
  - [ ] Installer et configurer `i18next` et `react-i18next`
  - [ ] Créer la structure des fichiers de traduction (`locales/`)
  - [ ] Traduire l'interface en :
    - [ ] Français (langue par défaut)
    - [ ] Anglais
    - [ ] Espagnol
    - [ ] Allemand
    - [ ] Italien
  - [ ] Ajouter le sélecteur de langue dans Settings
  - [ ] Gérer les dates/heures selon la locale
  - [ ] Traduire les messages d'erreur
  - [ ] Gérer le pluriel et les variables dynamiques

---

## ⚡ Optimisations & Performance

### Frontend

- [x] **Refactoriser Games.jsx** (fichier trop long - 1600+ lignes)

  - [x] Extraire la logique de stats dans un hook `useGameStats`
  - [x] Extraire la gestion des modals dans un hook `useGameModals`
  - [x] Séparer les composants : `GameCard`, `GameList`, `GameFilters`, `GameStats`
  - [x] Optimiser les re-renders avec `React.memo` et `useMemo`

- [x] **Optimiser les images**

  - [x] Lazy loading des covers de jeux
  - [x] Ajouter des placeholders pendant le chargement
  - [x] Compresser les images IGDB
  - [x] Cache local des covers

- [x] **Améliorer les performances de recherche**

  - [x] Débounce sur la recherche de jeux (300ms)
  - [x] Virtualisation des listes longues (react-window)
  - [ ] Pagination côté serveur pour les grandes bibliothèques (optionnel - virtualisation suffit)

- [x] **Optimiser le contexte Download**
  - [x] Ne pas re-render tous les composants à chaque progression
  - [x] Utiliser des selectors pour ne s'abonner qu'aux données nécessaires

### Backend

- [ ] **Optimiser les requêtes base de données**

  - [ ] Ajouter des index sur les champs fréquemment recherchés
  - [ ] Implémenter la pagination pour `/getAllGames`
  - [ ] Caching avec Redis pour les requêtes IGDB
  - [ ] Compression des réponses API (gzip)

- [x] **Optimiser l'upload de fichiers**
  - [x] Vérifier la taille du fichier avant l'upload
  - [x] Limiter le nombre d'uploads simultanés
  - [x] Reprendre les uploads interrompus (resumable uploads)

### Electron / Main Process

- [x] **Optimiser le démarrage de l'app**

  - [x] Lazy load des modules non critiques
  - [x] Charger Discord RPC uniquement si activé
  - [x] Pré-charger les données en cache au démarrage

- [x] **Améliorer la gestion mémoire**
  - [x] Nettoyer les listeners d'événements inutilisés
  - [x] Limiter le nombre de processus de jeux simultanés
  - [x] Garbage collection des caches obsolètes

---

## 🐛 Bugs & Corrections

### Bugs Identifiés

- [x] **Correction d'affichage**

  - [x] Images IGDB ne s'affichent pas (protocole `//` → `https://`)
  - [x] Vérifier l'affichage sur différentes résolutions d'écran
  - [x] Tester le responsive design

  **Améliorations responsive implémentées:**

  - [x] Sidebar GameLibrary responsive (224px sur < 1280px, 256px sur ≥ 1280px)
  - [x] Grilles de boutons optimisées (2 colonnes sur petits écrans, 4 sur desktop)
  - [x] Padding et tailles de texte adaptatifs avec breakpoints md/lg
  - [x] Hero section Home optimisée (55vh sur petits écrans, 70vh sur large)
  - [x] Images de cover redimensionnées selon la taille d'écran
  - [x] Descriptions tronquées sur petits écrans avec `line-clamp-3`
  - [x] Grille principale GameDetails avec breakpoint md intermédiaire

- [x] **Gestion d'état**

  - [x] Freeze au clic sur Upload dans AddGameModal
  - [x] Liste des jeux ne se rafraîchit pas après upload
  - [x] Vérifier la synchronisation des stats en mode offline

  **Améliorations de synchronisation offline implémentées:**

  - [x] Détection automatique de reconnexion avec sync immédiate
  - [x] Queue d'événements pour éviter les race conditions (traitement séquentiel)
  - [x] Système de listeners pour notifier les changements de queue
  - [x] Badge UI indiquant le nombre de syncs en attente sur Settings
  - [x] Messages traduits en anglais pour cohérence
  - [x] Logs améliorés pour debugging

- [ ] **Discord RPC**

  - [x] Rich Presence s'active même quand désactivé
  - [ ] Gérer la reconnexion automatique si Discord redémarre

- [x] **Gestion des erreurs**
  - [x] Améliorer les messages d'erreur pour l'utilisateur (logger.error avec contexte)
  - [x] Logger les erreurs dans un fichier de log (rotation 7 jours, max 10MB)
  - [x] Système de rapport de bugs intégré (BugReportModal + export JSON)

### Stabilité

- [ ] **Gestion des cas limites**
  - [ ] Que se passe-t-il si le serveur est down ?
  - [ ] Gestion des timeouts réseau
  - [ ] Gestion de l'espace disque insuffisant
  - [ ] Gestion des chemins de fichiers invalides

---

## 🚀 Nouvelles Fonctionnalités

### Fonctionnalités Principales

#### 🏆 Système d'Achievements

- [ ] **Succès / Achievements**
  - [ ] Modèle de données Achievement (backend)
  - [ ] API pour créer/gérer les achievements
  - [ ] UI pour afficher les achievements débloqués
  - [ ] Notifications lors du déblocage
  - [ ] Page dédiée aux achievements
  - [ ] Statistiques globales (% de joueurs ayant débloqué)

#### 👥 Social & Friends

- [ ] **Système d'amis**
  - [ ] Ajouter/Supprimer des amis
  - [ ] Voir les jeux des amis
  - [ ] Voir ce que les amis jouent actuellement
  - [ ] Comparer les stats/achievements avec les amis
  - [ ] Chat intégré (optionnel)

#### ☁️ Cloud Saves

- [ ] **Sauvegarde cloud des parties**
  - [ ] Détecter les dossiers de sauvegarde
  - [ ] Upload automatique des saves
  - [ ] Restauration des saves
  - [ ] Gestion des conflits de sauvegarde
  - [ ] Indicateur de dernière sync

#### 🎮 Game Features

- [ ] **Collections & Tags personnalisés**

  - [ ] Créer des collections (Favoris, À jouer, Terminés, etc.)
  - [ ] Tags personnalisés par jeu
  - [ ] Filtrer par collection/tag
  - [ ] Drag & drop pour organiser

- [ ] **Notes & Reviews**

  - [ ] Système de notation (étoiles)
  - [ ] Écrire une critique personnelle
  - [ ] Voir les critiques des autres utilisateurs
  - [ ] Timeline des reviews

- [ ] **Screenshots & Captures**

  - [ ] Capturer des screenshots in-game (raccourci clavier)
  - [ ] Galerie de screenshots par jeu
  - [ ] Partager les screenshots
  - [ ] Annotations sur screenshots

- [ ] **Mod Support**
  - [ ] Lister les mods disponibles
  - [ ] Installer/Désinstaller des mods
  - [ ] Gérer les versions de mods
  - [ ] Profils de mods (activer/désactiver par set)

### Fonctionnalités Secondaires

- [ ] **Import de jeux externes**

  - [ ] Scanner un dossier pour détecter des jeux
  - [ ] Ajouter manuellement un jeu externe
  - [ ] Détecter Steam, Epic, GOG Galaxy
  - [ ] Synchroniser avec d'autres launchers

- [ ] **Filtres et recherche avancés**

  - [ ] Filtrer par genre
  - [ ] Filtrer par plateforme
  - [ ] Filtrer par date de sortie
  - [ ] Filtrer par temps de jeu
  - [ ] Tri personnalisé (alphabétique, date ajout, temps joué, note)
  - [ ] Recherche full-text

- [ ] **Controller Support**

  - [ ] Détecter les manettes connectées
  - [ ] Navigation à la manette dans l'UI
  - [ ] Mapper les boutons par jeu
  - [ ] Vibration support

- [ ] **Game Updates**

  - [ ] Vérifier les mises à jour disponibles
  - [ ] Télécharger et installer les updates
  - [ ] Changelog des versions
  - [ ] Auto-update optionnel

- [ ] **Overlay In-Game** (avancé)

  - [ ] Overlay pour voir les stats en jeu
  - [ ] FPS counter
  - [ ] Accès aux amis en jeu
  - [ ] Notifications en jeu

- [ ] **News & Community**
  - [ ] Actualités des jeux (depuis IGDB ou Steam News)
  - [ ] Forum / Discussion par jeu
  - [ ] Guides et astuces

### Améliorations UX

- [ ] **Page d'accueil améliorée**

  - [ ] Carrousel des jeux récemment joués
  - [ ] Recommandations basées sur les jeux possédés
  - [ ] Actualités de la communauté
  - [ ] Achievements récents

- [ ] **Statistiques avancées**

  - [ ] Graphiques de temps de jeu par mois/année
  - [ ] Top jeux les plus joués
  - [ ] Évolution des stats dans le temps
  - [ ] Comparaison avec la moyenne des joueurs

- [ ] **Notifications**

  - [ ] Centre de notifications
  - [ ] Notifications desktop (Electron)
  - [ ] Historique des notifications
  - [ ] Paramètres de notifications par type

- [ ] **Settings améliorés**
  - [ ] Catégoriser les settings (Général, Téléchargement, Jeux, Apparence, etc.)
  - [ ] Barre de recherche dans les settings
  - [ ] Reset aux valeurs par défaut
  - [ ] Import/Export de configuration

---

## 📦 Deployment & DevOps

- [ ] **Auto-updater**

  - [ ] Système de mise à jour automatique de l'app
  - [ ] Notifications de nouvelle version
  - [ ] Changelog visible
  - [ ] Rollback en cas d'erreur

- [ ] **Installers**

  - [ ] Améliorer l'installer Windows (NSIS)
  - [ ] AppImage pour Linux
  - [ ] DMG pour macOS
  - [ ] Signature des builds

- [ ] **Analytics** (optionnel, respect vie privée)

  - [ ] Tracking anonyme des crashes
  - [ ] Métriques d'usage (features utilisées)
  - [ ] Opt-in/opt-out dans Settings

- [ ] **Documentation**
  - [ ] Documentation utilisateur
  - [ ] Documentation développeur
  - [ ] Guide de contribution
  - [ ] FAQ

---

## 🔒 Sécurité

- [ ] **Authentification**

  - [ ] Two-Factor Authentication (2FA)
  - [ ] Session timeout configurable
  - [ ] Déconnexion automatique après inactivité
  - [ ] Gestion des sessions multiples

- [ ] **Sécurité des données**

  - [ ] Chiffrement des données sensibles dans le store
  - [ ] HTTPS obligatoire pour toutes les requêtes
  - [ ] Validation stricte des inputs
  - [ ] Rate limiting côté serveur

- [ ] **Audit de sécurité**
  - [ ] Scanner les dépendances pour les vulnérabilités (npm audit)
  - [ ] Code review des parties sensibles
  - [ ] Tester les injections SQL/XSS/CSRF

---

## 📱 Accessibilité

- [ ] **WCAG 2.1 Level AA**

  - [ ] Navigation au clavier complète
  - [ ] Screen reader support
  - [ ] Contraste suffisant des couleurs
  - [ ] Focus visible sur tous les éléments interactifs
  - [ ] Labels ARIA appropriés
  - [ ] Textes alternatifs pour les images

- [ ] **Options d'accessibilité**
  - [ ] Taille de police ajustable
  - [ ] Mode dyslexie (police OpenDyslexic)
  - [ ] Réduction des animations (respect prefers-reduced-motion)
  - [ ] Mode daltonien

---

## 🧪 Code Quality

- [ ] **Refactoring**

  - [ ] Séparer la logique métier de l'UI
  - [ ] Créer des hooks custom réutilisables
  - [ ] Normaliser les noms de variables/fonctions
  - [ ] Supprimer le code mort
  - [ ] Documenter les fonctions complexes

- [ ] **TypeScript** (migration progressive)
  - [ ] Migrer progressivement vers TypeScript
  - [ ] Commencer par les utils et services
  - [ ] Types pour les API responses
  - [ ] Strict mode activé

---

## 📊 Monitoring & Logs

- [ ] **Logging amélioré**

  - [ ] Logger toutes les actions importantes
  - [ ] Rotation des logs
  - [ ] Niveaux de log (DEBUG, INFO, WARN, ERROR)
  - [ ] Export des logs pour debug

- [ ] **Monitoring**
  - [ ] Dashboard admin pour voir les stats serveur
  - [ ] Alertes en cas d'erreur critique
  - [ ] Métriques de performance

---

## 🎯 Priorités Suggérées

### 🔥 Haute Priorité (à faire en premier)

1. ✅ Corriger les bugs critiques (Images IGDB, Upload freeze) - **FAIT**
2. Créer les composants UI réutilisables
3. Implémenter le système de thèmes
4. Ajouter l'internationalisation (i18n)
5. Refactoriser Games.jsx
6. Tests automatisés de base

### 🟡 Moyenne Priorité

1. Collections & Tags personnalisés
2. Notes & Reviews
3. Filtres avancés
4. Screenshots support
5. Game Updates checker
6. Améliorer la page d'accueil

### 🟢 Basse Priorité

1. Système d'Achievements
2. Social & Friends
3. Cloud Saves
4. Mod Support
5. Overlay In-Game
6. Analytics

---