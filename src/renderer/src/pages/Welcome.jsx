import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { checkServerStatus } from "../api/server";
import { useAuth } from "../contexts/authContext";
import iconUrl from "@resources/icon.png";
import {
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import {
  FiPlay,
  FiServer,
  FiUser,
  FiCheck,
  FiX,
  FiLoader,
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

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
  // Null = unknown (older server or not yet checked). Only false hides open registration.
  const registrationEnabled = serverStatus?.registrationEnabled;
  const inviteRequired = registrationEnabled === false;
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
      setServerStatus({ online: false, error: t('welcome.invalidAddress') });
      return;
    }

    setIsChecking(true);
    try {
      const status = await checkServerStatus(serverAddress);
      setServerStatus(status);

      if (status.online && status.protocol) {
        const fullAddress = serverAddress.startsWith('http') ? serverAddress : `${status.protocol}://${serverAddress}`;
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

  const renderServerStatus = () => {
    if (!serverStatus) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {serverStatus.online ? (
            <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-green-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <div className="relative z-10 flex items-center gap-4">
                <motion.div
                  className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <FiCheckCircle className="text-green-400 text-2xl" />
                </motion.div>
                <div className="text-left flex-1">
                  <div className="text-lg font-bold text-white">{t('welcome.serverOnline')}</div>
                  <div className="text-sm text-green-400">
                    {t('welcome.connectionSuccess')}
                    {serverStatus.protocol && (
                      <span className="ml-2 px-2 py-0.5 bg-green-500/20 rounded text-xs font-semibold uppercase">
                        {serverStatus.protocol}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-red-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
              <div className="relative z-10 flex items-center gap-4">
                <motion.div
                  className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <FiX className="text-red-400 text-2xl" />
                </motion.div>
                <div className="text-left flex-1">
                  <div className="text-lg font-bold text-white">{t('welcome.serverOffline')}</div>
                  <div className="text-sm text-red-400">{serverStatus.error}</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const handleAuth = async () => {
    setError(null);

    if (authMode === "register") {
      if (formData.password !== formData.confirmPassword) {
        setError(t('welcome.passwordMismatch'));
        return;
      }

      if (inviteRequired && !formData.inviteCode.trim()) {
        setError(t('welcome.inviteRequired'));
        return;
      }

      const result = await register(formData.username, formData.password, formData.inviteCode.trim());
      if (result.success) {
        navigate("/");
      } else if (result.code === "REGISTRATION_DISABLED" || result.code === "INVALID_INVITE") {
        setError(result.error || t('welcome.inviteRequired'));
      } else {
        setError(result.error || t('welcome.registerFailed'));
      }
    } else {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || t('welcome.loginFailed'));
      }
    }
  };

  // Handle the Enter key for the server step (step 2)
  const handleServerKeyDown = (e) => {
    if (e.key === "Enter" && !isChecking && serverAddress) {
      handleServerCheck();
    }
  };

  // Handle the Enter key for authentication (step 3)
  const handleAuthKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAuth();
    }
  };

  // Render steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4 }}
          >
            {/* Hero Section */}
            <motion.div
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Icon */}
              <motion.div
                className="flex items-center justify-center mb-3"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
                  />
                  <img src={iconUrl} alt="Drathos" className="relative w-20 h-20 object-contain drop-shadow-2xl" draggable={false} />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-5xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {t('welcome.title')}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-base text-slate-400 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {t('welcome.subtitle')}
              </motion.p>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              className="grid grid-cols-3 gap-4 max-w-5xl mx-auto w-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {[
                {
                  icon: FiServer,
                  titleKey: "welcome.featureDistributed",
                  descKey: "welcome.featureDistributedDesc",
                  delay: 0.6,
                  borderHover: "hover:border-blue-500/50",
                  overlayFrom: "from-blue-500/10",
                  iconBg: "bg-blue-500/20",
                  iconColor: "text-blue-400",
                },
                {
                  icon: FiCheckCircle,
                  titleKey: "welcome.featureEasyInstall",
                  descKey: "welcome.featureEasyInstallDesc",
                  delay: 0.7,
                  borderHover: "hover:border-purple-500/50",
                  overlayFrom: "from-purple-500/10",
                  iconBg: "bg-purple-500/20",
                  iconColor: "text-purple-400",
                },
                {
                  icon: FiPlay,
                  titleKey: "welcome.featureLaunch",
                  descKey: "welcome.featureLaunchDesc",
                  delay: 0.8,
                  borderHover: "hover:border-green-500/50",
                  overlayFrom: "from-green-500/10",
                  iconBg: "bg-green-500/20",
                  iconColor: "text-green-400",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className={`group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 ${feature.borderHover} transition-all duration-300`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: feature.delay }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.overlayFrom} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative z-10 text-center">
                    <motion.div
                      className={`flex items-center justify-center w-12 h-12 ${feature.iconBg} rounded-xl mx-auto mb-3`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className={`${feature.iconColor} text-xl`} />
                    </motion.div>
                    <h3 className="text-base font-semibold text-white mb-2">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-slate-400">{t(feature.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Start Button */}
            <motion.div
              className="max-w-2xl mx-auto w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <motion.button
                onClick={() => setCurrentStep(2)}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-4">
                  <motion.div
                    className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-all duration-300"
                    whileHover={{ x: 5 }}
                  >
                    <FiArrowRight className="text-blue-400 text-xl" />
                  </motion.div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">{t('welcome.getStarted')}</div>
                    <div className="text-sm text-slate-400">{t('welcome.quickSteps')}</div>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            className="flex flex-col gap-6 max-w-4xl mx-auto w-full"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-center gap-3 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div
                className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
              >
                <FiServer className="text-white text-2xl" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white">{t('welcome.serverSetup')}</h2>
            </motion.div>

            {/* Server Input Card */}
            <motion.div
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <label className="text-base text-slate-400 font-medium mb-3 block">
                  {t('welcome.serverAddress')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serverAddress}
                    onChange={(e) => setServerAddress(e.target.value)}
                    onKeyDown={handleServerKeyDown}
                    placeholder={t('welcome.serverAddressPlaceholder')}
                    className="w-full p-4 pr-14 text-lg rounded-xl text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-4">
                    {isChecking ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <FiLoader className="text-yellow-400 text-xl" />
                      </motion.div>
                    ) : serverStatus ? (
                      serverStatus.online ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                          <FiCheck className="text-green-400 text-xl" />
                        </motion.div>
                      ) : (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                          <FiX className="text-red-400 text-xl" />
                        </motion.div>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Check Connection Button */}
            <motion.button
              onClick={handleServerCheck}
              disabled={isChecking || !serverAddress}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center justify-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-all duration-300">
                  {isChecking ? (
                    <FiLoader className="text-blue-400 text-2xl animate-spin" />
                  ) : (
                    <FiServer className="text-blue-400 text-2xl" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-white">
                    {isChecking ? t('welcome.checking') : t('welcome.checkConnection')}
                  </div>
                  <div className="text-sm text-slate-400">
                    {t('welcome.connectivityTest')}
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Server Status */}
            {renderServerStatus()}

            {/* Navigation Buttons */}
            <motion.div
              className="grid grid-cols-2 gap-4 mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.button
                onClick={() => setCurrentStep(1)}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <motion.div
                    className="flex items-center justify-center w-10 h-10 bg-slate-500/20 rounded-lg"
                    whileHover={{ x: -3 }}
                  >
                    <FiArrowLeft className="text-slate-400 text-lg" />
                  </motion.div>
                  <div className="text-lg font-bold text-white">{t('common.back')}</div>
                </div>
              </motion.button>

              <motion.button
                onClick={() => setCurrentStep(3)}
                disabled={!serverStatus || !serverStatus.online}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <div className="text-lg font-bold text-white">{t('common.next')}</div>
                  <motion.div
                    className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all duration-300"
                    whileHover={{ x: 3 }}
                  >
                    <FiArrowRight className="text-blue-400 text-lg" />
                  </motion.div>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            className="flex flex-col gap-4 max-w-3xl mx-auto w-full px-4"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <motion.div
              className="flex flex-col items-center gap-6 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Icon with animated title */}
              <div className="flex items-center gap-3">
                <motion.div
                  className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, type: "spring" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur-md opacity-50" />
                  <FiUser className="relative z-10 text-white text-2xl" />
                </motion.div>
                <motion.h2
                  className="text-3xl font-bold text-white"
                  key={authMode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {authMode === "login" ? t('welcome.login') : t('welcome.register')}
                </motion.h2>
              </div>

              {/* Simple Toggle Switch */}
              <div className="bg-slate-800/50 rounded-lg p-1 inline-flex border border-slate-700/50">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`px-8 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    authMode === "login"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {t('welcome.login')}
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`px-8 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    authMode === "register"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {t('welcome.register')}
                </button>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-red-500/50"
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-500/20 rounded-lg">
                      <FiX className="text-red-400 text-lg" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-bold text-white">{t('common.error')}</div>
                      <div className="text-xs text-red-400">{error}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Container with smooth transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={authMode}
                className="space-y-3"
                initial={{ opacity: 0, x: authMode === "login" ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: authMode === "login" ? 30 : -30 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Username Input Card */}
                <motion.div
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  layout
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <label className="text-sm text-slate-400 font-medium mb-2 block">
                      {t('welcome.username')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('welcome.usernamePlaceholder')}
                      className="w-full p-3 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      onKeyDown={handleAuthKeyDown}
                    />
                  </div>
                </motion.div>

                {/* Password Input Card */}
                <motion.div
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  layout
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <label className="text-sm text-slate-400 font-medium mb-2 block">
                      {t('welcome.password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t('welcome.passwordPlaceholder')}
                        className="w-full p-3 pr-12 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        onKeyDown={handleAuthKeyDown}
                      />
                      <motion.div
                        className="absolute text-slate-400 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Confirm Password Input Card (Register only) */}
                {authMode === "register" && (
                  <motion.div
                    className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    layout
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative z-10">
                      <label className="text-sm text-slate-400 font-medium mb-2 block">
                        {t('welcome.confirmPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t('welcome.confirmPasswordPlaceholder')}
                          className="w-full p-3 pr-12 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            })
                          }
                          onKeyDown={handleAuthKeyDown}
                        />
                        <motion.div
                          className="absolute text-slate-400 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Invitation Code (register only, when registration is closed) */}
                {authMode === "register" && inviteRequired && (
                  <motion.div
                    className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-blue-500/30 transition-all duration-300"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    layout
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative z-10">
                      <label className="text-sm text-slate-400 font-medium mb-2 block">
                        {t('welcome.inviteCode')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('welcome.inviteCodePlaceholder')}
                        className="w-full p-3 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500 uppercase tracking-widest font-mono"
                        value={formData.inviteCode}
                        onChange={(e) =>
                          setFormData({ ...formData, inviteCode: e.target.value })
                        }
                        onKeyDown={handleAuthKeyDown}
                      />
                      <p className="text-xs text-slate-500 mt-2">{t('welcome.inviteCodeHint')}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <motion.div
              className="grid grid-cols-2 gap-3 mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: authMode === "register" ? 0.5 : 0.4 }}
            >
              <motion.button
                onClick={() => setCurrentStep(2)}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <motion.div
                    className="flex items-center justify-center w-9 h-9 bg-slate-500/20 rounded-lg"
                    whileHover={{ x: -3 }}
                  >
                    <FiArrowLeft className="text-slate-400 text-lg" />
                  </motion.div>
                  <div className="text-base font-bold text-white">{t('common.back')}</div>
                </div>
              </motion.button>

              <motion.button
                onClick={handleAuth}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <div className="text-base font-bold text-white">
                    {authMode === "login" ? t('welcome.signIn') : t('welcome.signUp')}
                  </div>
                  <motion.div
                    className="flex items-center justify-center w-9 h-9 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all duration-300"
                    whileHover={{ x: 3 }}
                  >
                    <FiArrowRight className="text-blue-400 text-lg" />
                  </motion.div>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
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

      {/* Progress Bar - Fixed at top */}
      <div className="relative z-10 px-12 pt-5 pb-3">
        <div className="flex justify-between gap-4 max-w-6xl mx-auto">
          {[1, 2, 3].map((step) => (
            <motion.div
              key={step}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                step <= currentStep
                  ? "bg-gradient-to-r from-blue-500 to-purple-500"
                  : "bg-slate-700/30"
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: step * 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Step Content - Takes full remaining space */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-center min-h-full px-12 pb-6">
          <div className="w-full max-w-6xl py-4">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
