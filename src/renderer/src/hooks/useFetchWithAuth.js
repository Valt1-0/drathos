import { useAuth } from "../context/authContext";

const gatewayURL = import.meta.env.VITE_API_GATEWAY_URL;

export function useFetchWithAuth() {
  const { user, logout } = useAuth();

  const fetchWithAuth = async (url, options = {}, opts = {}) => {
    try {
      if (opts.protected && !user) {
        return { data: null, error: "Utilisateur non connecté", status: 401 };
      }

      const fetchOptions = {
        ...options,
        credentials: "include",
        headers: {
          ...(options.headers || {}),
        },
      };

      if (
        fetchOptions.body &&
        !(fetchOptions.body instanceof FormData) &&
        !fetchOptions.headers["Content-Type"]
      ) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }

      let response = await fetch(gatewayURL + url, fetchOptions);

      if (
        opts.protected &&
        (response.status === 401 || response.status === 403)
      ) {
        const refreshRes = await fetch(`${gatewayURL}/auth/refreshToken`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
        //   const refreshData = await refreshRes.json();

          // Relance la requête initiale
          response = await fetch(`${gatewayURL}${url}`, fetchOptions);
        } else {
          logout();
          return {
            data: null,
            error: "Session expirée, veuillez vous reconnecter.",
            status: 401,
          };
        }
      }

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        return {
          data,
          error: data?.message || "Erreur lors de la requête",
          status: response.status,
        };
      }

      return { data, error: null, status: response.status };
    } catch (err) {
      return {
        data: null,
        error: err.message || "Erreur inconnue",
        status: 0,
      };
    }
  };

  return fetchWithAuth;
}
