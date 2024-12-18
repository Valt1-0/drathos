import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkServerStatus } from "../api/functions";

const Welcome = () => {
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState("login");
  const [currentStep, setCurrentStep] = useState(1);
  const [serverAddress, setServerAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Valide si l'adresse est une IP ou un DNS
  const validateAddress = (address) => {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::[0-9]{1,5})?$/;
    const dnsRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::[0-9]{1,5})?$/;
    if (!address) return false;
    return ipRegex.test(address) || dnsRegex.test(address);
  };

  const handleServerCheck = async () => {
    if (!validateAddress(serverAddress)) {
      setServerStatus({
        online: false,
        error:
          "Format d'adresse invalide. Utilisez une IP ou un nom de domaine (port optionnel)",
      });
      return;
    }

    setIsChecking(true);
    try {
      const status = await checkServerStatus(serverAddress);
      setServerStatus(status);
    } catch (error) {
      setServerStatus({ online: false, error: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  const renderServerStatus = () => {
    if (!serverStatus) return null;

    return (
      <div
        className={`mt-4 p-3 rounded-lg ${serverStatus.online ? "bg-green-500" : "bg-red-500"}`}
      >
        {serverStatus.online ? (
          <p>✅ Serveur en ligne</p>
        ) : (
          <p>❌ Serveur hors ligne: {serverStatus.error}</p>
        )}
      </div>
    );
  };

  const handleAuth = () => {
    // Handle authentication logic here
  };

  // Rendu des étapes
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-6">Bienvenue sur Drathos</h1>
            <p className="text-xl mb-8">
              Votre nouvelle bibliothèque de jeux personnalisée. Commençons la
              configuration !
            </p>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-50"
            >
              Commencer
            </button>
          </div>
        );

      case 2:
        return (
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-6">
              Configuration du serveur
            </h2>
            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                placeholder="Adresse IP ou DNS du serveur"
                className="w-full p-3 rounded-lg mb-4 text-gray-800"
              />
              <button
                onClick={handleServerCheck}
                disabled={isChecking || !serverAddress}
                className="bg-white text-blue-700 px-6 py-2 rounded-lg font-semibold text-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {isChecking ? "Vérification..." : "Vérifier la connexion"}
              </button>
              {renderServerStatus()}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-white/20 px-4 py-2 rounded-lg"
                >
                  Retour
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!serverStatus || !serverStatus.online}
                  className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-6">
              {authMode === "login" ? "Connexion" : "Inscription"}
            </h2>
            <div className="max-w-md mx-auto">
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                className="w-full p-3 rounded-lg mb-4 text-gray-800"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Mot de passe"
                className="w-full p-3 rounded-lg mb-4 text-gray-800"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              {authMode === "register" && (
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  className="w-full p-3 rounded-lg mb-4 text-gray-800"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              )}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-white/20 px-6 py-2 rounded-lg"
                >
                  Retour
                </button>
                <button
                  onClick={handleAuth}
                  className="bg-white text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50"
                >
                  {authMode === "login" ? "Se connecter" : "S'inscrire"}
                </button>
              </div>
              <button
                onClick={() =>
                  setAuthMode(authMode === "login" ? "register" : "login")
                }
                className="text-white underline"
              >
                {authMode === "login"
                  ? "Créer un compte"
                  : "Déjà un compte ? Se connecter"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-700 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-between">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-1/3 h-2 rounded-full mx-1 ${
                step <= currentStep ? "bg-white" : "bg-blue-300"
              }`}
            />
          ))}
        </div>
        {renderStep()}
      </div>
    </div>
  );
};

export default Welcome;
