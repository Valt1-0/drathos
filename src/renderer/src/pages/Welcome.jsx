import { useState } from "react";
import { useNavigate } from "react-router";
import { checkServerStatus } from "../api/server";
import { useAuth } from "../contexts/authContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Welcome = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [authMode, setAuthMode] = useState("register");
  const [currentStep, setCurrentStep] = useState(1);
  const [serverAddress, setServerAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      window.store.set("serverAddress", serverAddress);
    } catch (error) {
      setServerStatus({ online: false, error: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  const renderServerStatus = () => {
    if (!serverStatus) return null;

    return (
      <div className="mt-4">
        {serverStatus.online ? (
          <p className="text-green-300 font-medium">✅ Serveur en ligne</p>
        ) : (
          <p className="text-red-300 font-medium">
            ❌ Serveur hors ligne: {serverStatus.error}
          </p>
        )}
      </div>
    );
  };

  const handleAuth = async () => {
    setError(null);

    if (authMode === "register") {
      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }

      const result = await register(formData.username, formData.password);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Échec de l'inscription.");
      }
    } else {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Échec de la connexion.");
      }
    }
  };

  // Rendu des étapes
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-8">Bienvenue sur Drathos</h1>
            <p className="text-xl mb-10">
              Votre nouvelle bibliothèque de jeux personnalisée. Commençons la
              configuration !
            </p>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-white text-blue-700 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-blue-100 transition-colors duration-200"
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
            <div className="max-w-md mx-auto relative">
              <input
                type="text"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                placeholder="Adresse IP ou DNS du serveur"
                className="w-full p-3 rounded-lg mb-4 text-indigo-700 bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
              <div className="absolute top-0 right-0 mt-3 mr-3">
                {isChecking ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                ) : serverStatus ? (
                  serverStatus.online ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  ) : (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )
                ) : null}
              </div>

              <button
                onClick={handleServerCheck}
                disabled={isChecking || !serverAddress}
                className="bg-white text-blue-700 px-6 py-2 rounded-lg font-semibold text-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mb-4"
              >
                {isChecking ? "Vérification..." : "Vérifier la connexion"}
              </button>

              {renderServerStatus()}

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  Retour
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!serverStatus || !serverStatus.online}
                  className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 backdrop-blur-sm">
                  {error}
                </div>
              )}

              <input
                type="text"
                placeholder="Nom d'utilisateur"
                className="w-full p-3 rounded-lg mb-4 text-gray-800 bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />

              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  className="w-full p-3 rounded-lg text-gray-800 bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <div
                  className="absolute text-blue-600 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-800 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>

              {authMode === "register" && (
                <div className="relative mb-4">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmer le mot de passe"
                    className="w-full p-3 rounded-lg text-gray-800 bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <div
                    className="absolute text-blue-600 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-800 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  Retour
                </button>
                <button
                  onClick={handleAuth}
                  className="bg-white text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50 font-semibold transition-all duration-200"
                >
                  {authMode === "login" ? "Se connecter" : "S'inscrire"}
                </button>
              </div>

              <button
                onClick={() =>
                  setAuthMode(authMode === "login" ? "register" : "login")
                }
                className="text-white underline hover:text-blue-200 transition-colors duration-200"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Progress Bar */}
          <div className="mb-8 flex justify-between">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full mx-1 transition-all duration-300 ${
                  step <= currentStep
                    ? "bg-gradient-to-r from-blue-400 to-purple-400"
                    : "bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] flex items-center justify-center">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
