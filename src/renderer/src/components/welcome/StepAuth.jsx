import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiX, FiArrowRight, FiArrowLeft } from "react-icons/fi";

const StepAuth = ({
  authMode,
  setAuthMode,
  error,
  formData,
  setFormData,
  onKeyDown,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  inviteRequired,
  onSubmit,
  onBack,
}) => {
  const { t } = useTranslation();
  return (
    <motion.div
      key="step3"
      className="flex flex-col gap-4 max-w-3xl mx-auto w-full px-4"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="flex flex-col items-center gap-6 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <motion.h2 className="text-3xl font-bold text-white" key={authMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {authMode === "login" ? t("welcome.login") : t("welcome.register")}
        </motion.h2>

        <div className="bg-slate-800/50 rounded-lg p-1 inline-flex border border-slate-700/50">
          <button onClick={() => setAuthMode("login")} className={`px-8 py-2 rounded-md text-sm font-medium transition-all duration-200 ${authMode === "login" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"}`}>
            {t("welcome.login")}
          </button>
          <button onClick={() => setAuthMode("register")} className={`px-8 py-2 rounded-md text-sm font-medium transition-all duration-200 ${authMode === "register" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"}`}>
            {t("welcome.register")}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-red-500/50" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -20, height: 0 }}>
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-red-500/20 rounded-lg">
                <FiX className="text-red-400 text-lg" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold text-white">{t("common.error")}</div>
                <div className="text-xs text-red-400">{error}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div key={authMode} className="space-y-3" initial={{ opacity: 0, x: authMode === "login" ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: authMode === "login" ? 30 : -30 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
          <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} layout>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <label className="text-sm text-slate-400 font-medium mb-2 block">{t("welcome.username")}</label>
              <input
                type="text"
                placeholder={t("welcome.usernamePlaceholder")}
                className="w-full p-3 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                onKeyDown={onKeyDown}
              />
            </div>
          </motion.div>

          <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} layout>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <label className="text-sm text-slate-400 font-medium mb-2 block">{t("welcome.password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("welcome.passwordPlaceholder")}
                  className="w-full p-3 pr-12 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={onKeyDown}
                />
                <motion.div className="absolute text-slate-400 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowPassword(!showPassword)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {authMode === "register" && (
            <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 transition-all duration-300" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay: 0.3 }} layout>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <label className="text-sm text-slate-400 font-medium mb-2 block">{t("welcome.confirmPassword")}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("welcome.confirmPasswordPlaceholder")}
                    className="w-full p-3 pr-12 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    onKeyDown={onKeyDown}
                  />
                  <motion.div className="absolute text-slate-400 inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowConfirmPassword(!showConfirmPassword)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    {showConfirmPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {authMode === "register" && inviteRequired && (
            <motion.div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-blue-500/30 transition-all duration-300" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay: 0.4 }} layout>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <label className="text-sm text-slate-400 font-medium mb-2 block">{t("welcome.inviteCode")}</label>
                <input
                  type="text"
                  placeholder={t("welcome.inviteCodePlaceholder")}
                  className="w-full p-3 text-base rounded-lg text-white bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500 uppercase tracking-widest font-mono"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  onKeyDown={onKeyDown}
                />
                <p className="text-xs text-slate-500 mt-2">{t("welcome.inviteCodeHint")}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div className="grid grid-cols-2 gap-3 mt-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: authMode === "register" ? 0.5 : 0.4 }}>
        <motion.button onClick={onBack} className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center justify-center gap-2">
            <motion.div className="flex items-center justify-center w-9 h-9 bg-slate-500/20 rounded-lg" whileHover={{ x: -3 }}>
              <FiArrowLeft className="text-slate-400 text-lg" />
            </motion.div>
            <div className="text-base font-bold text-white">{t("common.back")}</div>
          </div>
        </motion.button>

        <motion.button onClick={onSubmit} className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center justify-center gap-2">
            <div className="text-base font-bold text-white">{authMode === "login" ? t("welcome.signIn") : t("welcome.signUp")}</div>
            <motion.div className="flex items-center justify-center w-9 h-9 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all duration-300" whileHover={{ x: 3 }}>
              <FiArrowRight className="text-blue-400 text-lg" />
            </motion.div>
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default StepAuth;
