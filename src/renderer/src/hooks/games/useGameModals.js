import { useState } from "react";
import { FiWifiOff } from "react-icons/fi";

export const useGameModals = () => {
  // Uninstall modal
  const [uninstallModalOpen, setUninstallModalOpen] = useState(false);
  const [gameToUninstall, setGameToUninstall] = useState(null);

  // Install path modal
  const [installPathModalOpen, setInstallPathModalOpen] = useState(false);
  const [gameToInstall, setGameToInstall] = useState(null);

  // Delete game modal (admin only)
  const [deleteGameModalOpen, setDeleteGameModalOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [deleteGameLoading, setDeleteGameLoading] = useState(false);
  const [deleteGameResult, setDeleteGameResult] = useState(null);

  // Generic confirmation modal
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState({
    title: "",
    message: "",
    confirmText: "Confirmer",
    cancelText: "Annuler",
    confirmColor: "blue",
    icon: null,
    showLockInfo: false,
    onConfirm: null,
    loading: false,
    error: null,
    success: false,
  });

  // Add game modal (admin only)
  const [addGameModalOpen, setAddGameModalOpen] = useState(false);

  // Wine required modal
  const [wineModalOpen, setWineModalOpen] = useState(false);
  const [wineInstructions, setWineInstructions] = useState(null);

  // Uninstall modal handlers
  const openUninstallModal = (game) => {
    setGameToUninstall(game);
    setUninstallModalOpen(true);
  };

  const closeUninstallModal = () => {
    setUninstallModalOpen(false);
    setGameToUninstall(null);
  };

  // Install path modal handlers
  const openInstallPathModal = (game) => {
    setGameToInstall(game);
    setInstallPathModalOpen(true);
  };

  const closeInstallPathModal = () => {
    setInstallPathModalOpen(false);
    setGameToInstall(null);
  };

  // Delete game modal handlers
  const openDeleteGameModal = (game, user, isInstalled) => {
    // Vérifier les permissions
    if (!user || user.role !== "admin") {
      alert("❌ Accès refusé - Admin uniquement");
      return;
    }

    // Vérifier qu'il n'y a pas d'installation active
    if (isInstalled(game._id)) {
      alert("❌ Impossible - Le jeu est installé. Désinstallez-le d'abord.");
      return;
    }

    setGameToDelete(game);
    setDeleteGameResult(null);
    setDeleteGameModalOpen(true);
  };

  const closeDeleteGameModal = () => {
    setDeleteGameModalOpen(false);
    setGameToDelete(null);
    setDeleteGameResult(null);
  };

  // Confirmation modal handlers
  const openConfirmationModal = (data) => {
    setConfirmationData(data);
    setConfirmationModalOpen(true);
  };

  const closeConfirmationModal = () => {
    setConfirmationModalOpen(false);
  };

  // Show offline uninstall confirmation
  const showOfflineUninstallConfirmation = (gameName, onConfirm) => {
    openConfirmationModal({
      title: "Serveur non disponible",
      message: `"${gameName}" a été ajouté à la file d'attente.\n\nLa désinstallation sera effectuée automatiquement lorsque le serveur sera disponible.`,
      confirmText: "Compris",
      cancelText: "",
      confirmColor: "yellow",
      icon: FiWifiOff,
      showLockInfo: true,
      onConfirm: onConfirm || closeConfirmationModal,
      loading: false,
      error: null,
      success: false,
    });
  };

  // Add game modal handlers
  const openAddGameModal = () => {
    setAddGameModalOpen(true);
  };

  const closeAddGameModal = () => {
    setAddGameModalOpen(false);
  };

  // Wine modal handlers
  const openWineModal = (instructions) => {
    setWineInstructions(instructions);
    setWineModalOpen(true);
  };

  const closeWineModal = () => {
    setWineModalOpen(false);
    setWineInstructions(null);
  };

  return {
    // Uninstall modal
    uninstallModal: {
      isOpen: uninstallModalOpen,
      game: gameToUninstall,
      open: openUninstallModal,
      close: closeUninstallModal,
    },

    // Install path modal
    installPathModal: {
      isOpen: installPathModalOpen,
      game: gameToInstall,
      open: openInstallPathModal,
      close: closeInstallPathModal,
    },

    // Delete game modal
    deleteGameModal: {
      isOpen: deleteGameModalOpen,
      game: gameToDelete,
      loading: deleteGameLoading,
      result: deleteGameResult,
      open: openDeleteGameModal,
      close: closeDeleteGameModal,
      setLoading: setDeleteGameLoading,
      setResult: setDeleteGameResult,
    },

    // Confirmation modal
    confirmationModal: {
      isOpen: confirmationModalOpen,
      data: confirmationData,
      open: openConfirmationModal,
      close: closeConfirmationModal,
      showOfflineUninstall: showOfflineUninstallConfirmation,
    },

    // Add game modal
    addGameModal: {
      isOpen: addGameModalOpen,
      open: openAddGameModal,
      close: closeAddGameModal,
    },

    // Wine modal
    wineModal: {
      isOpen: wineModalOpen,
      instructions: wineInstructions,
      open: openWineModal,
      close: closeWineModal,
    },
  };
};
