import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

// ==================== CRUD COLLECTIONS ====================

export const getUserCollections = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, '/api/collections/user'),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching collections: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.debug("[API] Collections unavailable (offline mode)");
    return null;
  }
};

export const getCollectionById = async (collectionId) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/collections/${collectionId}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching collection: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error fetching collection:", error);
    return null;
  }
};

export const createCollection = async (collectionData) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, '/api/collections/create'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collectionData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create collection');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error creating collection:", error);
    throw error;
  }
};

export const updateCollection = async (collectionId, updateData) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/collections/${collectionId}/update`),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update collection');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error updating collection:", error);
    throw error;
  }
};

export const deleteCollection = async (collectionId) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/collections/${collectionId}/delete`),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete collection');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error deleting collection:", error);
    throw error;
  }
};

// ==================== GESTION DES JEUX ====================

export const addGamesToCollection = async (collectionId, gameIds) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/collections/${collectionId}/games/add`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameIds })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add games');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error adding games to collection:", error);
    throw error;
  }
};

export const removeGamesFromCollection = async (collectionId, gameIds) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/collections/${collectionId}/games/remove`),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameIds })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove games');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[API] Error removing games from collection:", error);
    throw error;
  }
};
