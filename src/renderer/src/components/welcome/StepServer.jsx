import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiServer, FiCheck, FiX, FiLoader, FiArrowRight, FiArrowLeft, FiCheckCircle } from "react-icons/fi";

const ServerStatus = ({ serverStatus, t }) => {
  if (!serverStatus) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        {serverStatus.online ? (
          <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-green-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-xl" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5, type: "spring" }}>
                <FiCheckCircle className="text-green-400 text-2xl" />
              </motion.div>
              <div className="text-left flex-1">
                <div className="text-lg font-bold text-white">{t("welcome.serverOnline")}</div>
                <div className="text-sm text-green-400">
                  {t("welcome.connectionSuccess")}
                  {serverStatus.protocol && (
                    <span className="ml-2 px-2 py-0.5 bg-green-500/20 rounded text-xs font-semibold uppercase">{serverStatus.protocol}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-red-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                <FiX className="text-red-400 text-2xl" />
              </motion.div>
              <div className="text-left flex-1">
                <div className="text-lg font-bold text-white">{t("welcome.serverOffline")}</div>
                <div className="text-sm text-red-400">{serverStatus.error}</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const StepServer = ({ serverAddress, onAddressChange, onKeyDown, isChecking, serverStatus, onCheck, onBack, onNext }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      key="step2"
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="flex items-center justify-center gap-3 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <motion.div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6, type: "spring" }}>
          <FiServer className="text-white text-2xl" />
        </motion.div>
        <h2 className="text-4xl font-bold text-white">{t("welcome.serverSetup")}</h2>
      </motion.div>

      <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50 transition-all duration-300" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} whileHover={{ scale: 1.01 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <label className="text-base text-slate-400 font-medium mb-3 block">{t("welcome.serverAddress")}</label>
          <div className="relative">
            <input
              type="text"
              value={serverAddress}
              onChange={onAddressChange}
              onKeyDown={onKeyDown}
              placeholder={t("welcome.serverAddressPlaceholder")}
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

      <motion.button
        onClick={onCheck}
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
            {isChecking ? <FiLoader className="text-blue-400 text-2xl animate-spin" /> : <FiServer className="text-blue-400 text-2xl" />}
          </div>
          <div className="text-left">
            <div className="text-xl font-bold text-white">{isChecking ? t("welcome.checking") : t("welcome.checkConnection")}</div>
            <div className="text-sm text-slate-400">{t("welcome.connectivityTest")}</div>
          </div>
        </div>
      </motion.button>

      <ServerStatus serverStatus={serverStatus} t={t} />

      <motion.div className="grid grid-cols-2 gap-4 mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <motion.button onClick={onBack} className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center justify-center gap-3">
            <motion.div className="flex items-center justify-center w-10 h-10 bg-slate-500/20 rounded-lg" whileHover={{ x: -3 }}>
              <FiArrowLeft className="text-slate-400 text-lg" />
            </motion.div>
            <div className="text-lg font-bold text-white">{t("common.back")}</div>
          </div>
        </motion.button>

        <motion.button onClick={onNext} disabled={!serverStatus || !serverStatus.online} className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="text-lg font-bold text-white">{t("common.next")}</div>
            <motion.div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all duration-300" whileHover={{ x: 3 }}>
              <FiArrowRight className="text-blue-400 text-lg" />
            </motion.div>
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default StepServer;
