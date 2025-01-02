export const checkServerStatus = async (serverAddress) => {
  try {
    const response = await fetch(`http://${serverAddress}/api/server/status`);
    if (response.ok) {
      return { online: true };
    }
    const data = await response.json();
    return {
      online: false,
      error: `Le serveur a répondu avec le statut: ${response.status}`,
      uptime: data.uptime,
    };
  } catch (error) {
    return {
      online: false,
      error: "Impossible de se connecter au serveur",
    };
  }
};
