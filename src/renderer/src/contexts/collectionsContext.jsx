import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as collectionsAPI from '../api/collections';
import { useAuth } from './authContext';
import { useConnection } from './connectionContext';
import { toast } from 'sonner';

const CollectionsContext = createContext();

export const CollectionsProvider = ({ children }) => {
  const [collections, setCollections] = useState([]);
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

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo(
    () => ({
      collections,
      loading,
      selectedCollection,
      setSelectedCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      addGamesToCollection,
      removeGamesFromCollection,
      syncCollections
    }),
    [
      collections,
      loading,
      selectedCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      addGamesToCollection,
      removeGamesFromCollection,
      syncCollections
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
