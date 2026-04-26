import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as collectionsAPI from '../api/collections';
import { useAuth } from './authContext';
import { useConnection } from './connectionContext';
import { toast } from 'sonner';
import logger from '../services/logger';
import { storeGet, storeSet } from '../utils/storeClient';

const CollectionsContext = createContext();

export const CollectionsProvider = ({ children }) => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();
  const { isOnline } = useConnection();

  // Refs keep the latest values accessible inside callbacks without adding
  // them to dependency arrays — avoids recreating fetchCollections on every
  // auth/connection state change.
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const userRef = useRef(user);
  userRef.current = user;

  // ==================== LAZY LOADING ====================

  const fetchCollections = useCallback(async () => {
    if (initialized || loading) return;

    setLoading(true);

    // Load from cache first
    const cached = await storeGet('collectionsCache');
    if (cached?.custom) {
      setCollections(cached.custom);
    }

    // Sync with backend if online
    if (isOnlineRef.current && userRef.current) {
      try {
        const data = await collectionsAPI.getUserCollections();
        if (data) {
          setCollections(data);
          await storeSet('collectionsCache', {
            custom: data,
            lastSync: Date.now()
          });
        }
      } catch (error) {
        logger.error('[Collections] Failed to sync:', error);
      }
    }

    setLoading(false);
    setInitialized(true);
  }, [initialized, loading]);

  const syncCollections = useCallback(async () => {
    if (!isOnlineRef.current || !userRef.current) return;

    try {
      const data = await collectionsAPI.getUserCollections();
      if (data) {
        setCollections(data);
        await storeSet('collectionsCache', {
          custom: data,
          lastSync: Date.now()
        });
      }
    } catch (error) {
      logger.error('[Collections] Failed to sync collections:', error);
    }
  }, []);

  // ==================== CRUD OPERATIONS ====================

  const createCollection = useCallback(async (collectionData) => {
    try {
      const response = await collectionsAPI.createCollection(collectionData);
      if (response.collection) {
        setCollections(prev => [...prev, response.collection]);
        toast.success(t('collections.createSuccess'));
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || t('collections.createError'));
      throw error;
    }
  }, [t]);

  const updateCollection = useCallback(async (collectionId, updateData) => {
    try {
      const response = await collectionsAPI.updateCollection(collectionId, updateData);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        toast.success(t('collections.updateSuccess'));
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || t('collections.updateError'));
      throw error;
    }
  }, [t]);

  const deleteCollection = useCallback(async (collectionId) => {
    try {
      await collectionsAPI.deleteCollection(collectionId);
      setCollections(prev => prev.filter(col => col._id !== collectionId));
      toast.success(t('collections.deleteSuccess'));
    } catch (error) {
      toast.error(error.message || t('collections.deleteError'));
      throw error;
    }
  }, [t]);

  // ==================== GAMES MANAGEMENT ====================

  const addGamesToCollection = useCallback(async (collectionId, gameIds) => {
    try {
      const response = await collectionsAPI.addGamesToCollection(collectionId, gameIds);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        toast.success(t('collections.gamesAdded', { count: gameIds.length }));
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || t('collections.addGamesError'));
      throw error;
    }
  }, [t]);

  const removeGamesFromCollection = useCallback(async (collectionId, gameIds) => {
    try {
      const response = await collectionsAPI.removeGamesFromCollection(collectionId, gameIds);
      if (response.collection) {
        setCollections(prev =>
          prev.map(col => col._id === collectionId ? response.collection : col)
        );
        toast.success(t('collections.gamesRemoved', { count: gameIds.length }));
        return response.collection;
      }
    } catch (error) {
      toast.error(error.message || t('collections.removeGamesError'));
      throw error;
    }
  }, [t]);

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo(
    () => ({
      collections,
      loading,
      initialized,
      fetchCollections,
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
      initialized,
      fetchCollections,
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
