export async function getInstalledGames() {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  if (!token) {
    console.error("No token found in store!");
    return [];
  }

  try {
    const response = await fetch(
      `http://${serverAddress}/api/installedGames/getInstalledGames`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      throw new Error("Failed to fetch installed games");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching installed games:", error);
    return [];
  }
}
