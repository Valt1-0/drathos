import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { checkServerStatus } from "../api/server";
import { useAuth } from "../contexts/authContext";
import StepIntro from "../components/welcome/StepIntro";
import StepServer from "../components/welcome/StepServer";
import StepAuth from "../components/welcome/StepAuth";

const Welcome = () => {
  const { t } = useTranslation();
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
    inviteCode: "",
  });
  // undefined = unknown (older server); only an explicit false closes registration
  const inviteRequired = serverStatus?.registrationEnabled === false;
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validates if the address is an IP or a DNS
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
      setServerStatus({ online: false, error: t("welcome.invalidAddress") });
      return;
    }

    setIsChecking(true);
    try {
      const status = await checkServerStatus(serverAddress);
      setServerStatus(status);

      if (status.online && status.protocol) {
        const fullAddress = serverAddress.startsWith("http") ? serverAddress : `${status.protocol}://${serverAddress}`;
        window.store.set("serverAddress", fullAddress);
      } else {
        window.store.set("serverAddress", serverAddress);
      }
    } catch (error) {
      setServerStatus({ online: false, error: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  const handleAuth = async () => {
    setError(null);

    if (authMode === "register") {
      if (formData.password !== formData.confirmPassword) {
        setError(t("welcome.passwordMismatch"));
        return;
      }

      if (inviteRequired && !formData.inviteCode.trim()) {
        setError(t("welcome.inviteRequired"));
        return;
      }

      const result = await register(formData.username, formData.password, formData.inviteCode.trim());
      if (result.success) {
        navigate("/");
      } else if (result.code === "REGISTRATION_DISABLED" || result.code === "INVALID_INVITE") {
        setError(result.error || t("welcome.inviteRequired"));
      } else {
        setError(result.error || t("welcome.registerFailed"));
      }
    } else {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || t("welcome.loginFailed"));
      }
    }
  };

  const handleServerKeyDown = (e) => {
    if (e.key === "Enter" && !isChecking && serverAddress) handleServerCheck();
  };

  const handleAuthKeyDown = (e) => {
    if (e.key === "Enter") handleAuth();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepIntro onNext={() => setCurrentStep(2)} />;
      case 2:
        return (
          <StepServer
            serverAddress={serverAddress}
            onAddressChange={(e) => setServerAddress(e.target.value)}
            onKeyDown={handleServerKeyDown}
            isChecking={isChecking}
            serverStatus={serverStatus}
            onCheck={handleServerCheck}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <StepAuth
            authMode={authMode}
            setAuthMode={setAuthMode}
            error={error}
            formData={formData}
            setFormData={setFormData}
            onKeyDown={handleAuthKeyDown}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            inviteRequired={inviteRequired}
            onSubmit={handleAuth}
            onBack={() => setCurrentStep(2)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex flex-col overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 px-12 pt-5 pb-3">
        <div className="flex justify-between gap-4 max-w-6xl mx-auto">
          {[1, 2, 3].map((step) => (
            <motion.div
              key={step}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                step <= currentStep ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-slate-700/30"
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: step * 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-center min-h-full px-12 pb-6">
          <div className="w-full max-w-6xl py-4">
            <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
