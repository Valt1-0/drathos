export const searchGamesFromIGDB = async (query) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const response = await fetch(`http://${serverAddress}/api/igdb/search?game=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Erreur lors de la recherche de jeux : ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la recherche de jeux :", error.message);
    return null;
  }
};
