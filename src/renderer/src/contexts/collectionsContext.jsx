import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as collectionsAPI from '../api/collections';
import { useAuth } from './authContext';
import { useConnection } from './connectionContext';
import { toast } from 'sonner';

const CollectionsContext = createContext();

export const CollectionsProvider = ({ children }) => {
  const [collections, setCollections] = useState([]);
  const [smartCollections, setSmartCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const { user } = useAuth();
  const { isOnline } = useConnection();

  // ==================== SYNC & CACHE ====================

  // Charger collections depuis cache
  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await window.store.get('collectionsCache');
      if (cached?.custom) {
        setCollections(cached.custom);
      }
      setLoading(false);
    };

    loadFromCache();
  }, []);

  // Sync avec backend si online
  useEffect(() => {
    if (isOnline && user) {
      syncCollections();
      syncSmartCollections();
    }
  }, [isOnline, user]);

  const syncCollections = useCallback(async () => {
    try {
      const data = await collectionsAPI.getUserCollections();
      if (data) {
        setCollections(data);

        // Update cache
        await window.store.set('collectionsCache', {
          custom: data,
          lastSync: Date.now()
        });
      }
    } catch (error) {
      console.error('[Collections] Failed to sync collections:', error);
    }
  }, []);

  // Calculate smart collections from local cache (offline mode)
  const getLocalSmartCollections = useCallback(async () => {
    try {
      const installedGamesCache = await window.store.get('installedGamesCache') || {};
      const allGames = Object.values(installedGamesCache);

      if (allGames.length === 0) return [];

      const smart = [];

      // Installed games
      smart.push({
        name: 'Jeux installés',
        games: allGames,
        isSmartCollection: true,
        type: 'installed'
      });

      // Recently played (last 30 days)
      const recentGames = allGames
        .filter(game => game.stats?.lastPlayed)
        .sort((a, b) => (b.stats?.lastPlayed || 0) - (a.stats?.lastPlayed || 0))
        .slice(0, 20);

      if (recentGames.length > 0) {
        smart.push({
          name: 'Joués récemment',
          games: recentGames,
          isSmartCollection: true,
          type: 'recent'
        });
      }

      // Most played
      const mostPlayedGames = allGames
        .filter(game => game.stats?.totalPlayTime && game.stats.totalPlayTime > 0)
        .sort((a, b) => (b.stats?.totalPlayTime || 0) - (a.stats?.totalPlayTime || 0))
        .slice(0, 20);

      if (mostPlayedGames.length > 0) {
        smart.push({
          name: 'Les plus joués',
          games: mostPlayedGames,
          isSmartCollection: true,
          type: 'mostPlayed'
        });
      }

      return smart;
    } catch (error) {
      console.error('[Collections] Failed to get local smart collections:', error);
      return [];
    }
  }, []);

  const syncSmartCollections = useCallback(async () => {
    try {
      if (isOnline) {
        // Online: fetch from server
        const [installed, notInstalled, recent, mostPlayed] = await Promise.all([
          collectionsAPI.getInstalledGames(),
          collectionsAPI.getNotInstalledGames(),
          collectionsAPI.getRecentlyPlayed(),
          collectionsAPI.getMostPlayed()
        ]);

        const smart = [installed, notInstalled, recent, mostPlayed].filter(Boolean);
        setSmartCollections(smart);
      } else {
        // Offline: calculate from local cache
        const localSmart = await getLocalSmartCollections();
        setSmartCollections(localSmart);
      }
    } catch (error) {
      console.error('[Collections] Failed to sync smart collections:', error);
      // Fallback to local cache on error
      const localSmart = await getLocalSmartCollections();
      setSmartCollections(localSmart);
    }
  }, [isOnline, getLocalSmartCollections]);

  // ==================== CRUD OPERATIONS ====================

  const createCollection = useCallback(async (collectionData) => {
    try {
      const response = await collectionsAPI.createCollection(collectionData);
      if (response.collection) {
        setCollections(prev => [...prev, response.collection]);
        await syncCollections(); // Re-sync cache
        toast.success('Collection créée avec succès');
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la création de la collection');
      throw error;
    }
  }, [syncCollections]);

  const updateCollection = useCallback(async (collectionId, updateData) => {
    try {
      const response = await collectionsAPI.updateCollection(collectionId, updateData);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        await syncCollections();
        toast.success('Collection mise à jour avec succès');
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
      throw error;
    }
  }, [syncCollections]);

  const deleteCollection = useCallback(async (collectionId) => {
    try {
      await collectionsAPI.deleteCollection(collectionId);
      setCollections(prev => prev.filter(col => col._id !== collectionId));

      if (selectedCollection?._id === collectionId) {
        setSelectedCollection(null);
      }

      await syncCollections();
      toast.success('Collection supprimée avec succès');
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
      throw error;
    }
  }, [selectedCollection, syncCollections]);

  // ==================== GAMES MANAGEMENT ====================

  const addGamesToCollection = useCallback(async (collectionId, gameIds) => {
    try {
      const response = await collectionsAPI.addGamesToCollection(collectionId, gameIds);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        await syncCollections();
        toast.success(`${gameIds.length} jeu(x) ajouté(s) à la collection`);
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'ajout des jeux');
      throw error;
    }
  }, [syncCollections]);

  const removeGamesFromCollection = useCallback(async (collectionId, gameIds) => {
    try {
      const response = await collectionsAPI.removeGamesFromCollection(collectionId, gameIds);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        await syncCollections();
        toast.success(`${gameIds.length} jeu(x) retiré(s) de la collection`);
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors du retrait des jeux');
      throw error;
    }
  }, [syncCollections]);

  const reorderGames = useCallback(async (collectionId, gameOrders) => {
    try {
      const response = await collectionsAPI.reorderCollectionGames(collectionId, gameOrders);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        // Pas besoin de toast pour drag & drop
        return response.collection;
      }
    } catch (error) {
      toast.error('Erreur lors de la réorganisation');
      throw error;
    }
  }, []);

  // ==================== ACTIONS ====================

  const togglePin = useCallback(async (collectionId) => {
    try {
      const response = await collectionsAPI.togglePinCollection(collectionId);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        await syncCollections();
        toast.success(response.message);
        return response.collection;
      }
    } catch (error) {
      toast.error('Erreur lors du changement d\'état');
      throw error;
    }
  }, [syncCollections]);

  const refreshSmartCollections = useCallback(async () => {
    await syncSmartCollections();
  }, [syncSmartCollections]);

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo(
    () => ({
      collections,
      smartCollections,
      loading,
      selectedCollection,
      setSelectedCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      addGamesToCollection,
      removeGamesFromCollection,
      reorderGames,
      togglePin,
      syncCollections,
      refreshSmartCollections
    }),
    [
      collections,
      smartCollections,
      loading,
      selectedCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      addGamesToCollection,
      removeGamesFromCollection,
      reorderGames,
      togglePin,
      syncCollections,
      refreshSmartCollections
    ]
  );

  return (
    <CollectionsContext.Provider value={contextValue}>
      {children}
    </CollectionsContext.Provider>
  );
};

// ==================== HOOKS ====================

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error('useCollections must be used within a CollectionsProvider');
  }
  return context;
};

// Hook pour obtenir une collection spécifique par ID
export const useCollectionById = (id) => {
  const { collections } = useCollections();
  return useMemo(() => {
    return collections.find(col => col._id === id) || null;
  }, [collections, id]);
};

// Hook pour obtenir les collections épinglées
export const usePinnedCollections = () => {
  const { collections } = useCollections();
  return useMemo(() => {
    return collections.filter(col => col.isPinned);
  }, [collections]);
};
