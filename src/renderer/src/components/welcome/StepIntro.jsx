import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiServer, FiCheckCircle, FiPlay, FiArrowRight } from "react-icons/fi";
import iconUrl from "@resources/icon.png";

const FEATURES = [
  { icon: FiServer, titleKey: "welcome.featureDistributed", descKey: "welcome.featureDistributedDesc", delay: 0.6, borderHover: "hover:border-blue-500/50", overlayFrom: "from-blue-500/10", iconBg: "bg-blue-500/20", iconColor: "text-blue-400" },
  { icon: FiCheckCircle, titleKey: "welcome.featureEasyInstall", descKey: "welcome.featureEasyInstallDesc", delay: 0.7, borderHover: "hover:border-purple-500/50", overlayFrom: "from-purple-500/10", iconBg: "bg-purple-500/20", iconColor: "text-purple-400" },
  { icon: FiPlay, titleKey: "welcome.featureLaunch", descKey: "welcome.featureLaunchDesc", delay: 0.8, borderHover: "hover:border-green-500/50", overlayFrom: "from-green-500/10", iconBg: "bg-green-500/20", iconColor: "text-green-400" },
];

const StepIntro = ({ onNext }) => {
  const { t } = useTranslation();
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

        <motion.h1
          className="text-5xl font-bold text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {t("welcome.title")}
        </motion.h1>

        <motion.p
          className="text-base text-slate-400 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {t("welcome.subtitle")}
        </motion.p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="grid grid-cols-3 gap-4 max-w-5xl mx-auto w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {FEATURES.map((feature, index) => (
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
          onClick={onNext}
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
              <div className="text-lg font-bold text-white">{t("welcome.getStarted")}</div>
              <div className="text-sm text-slate-400">{t("welcome.quickSteps")}</div>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default StepIntro;
