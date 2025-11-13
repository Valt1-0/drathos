import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FiSettings,
  FiUser,
  FiDownload,
  FiMoon,
  FiSun,
  FiFolder,
  FiCheck,
  FiActivity,
  FiCircle,
  FiImage,
  FiTrash2,
  FiAlertTriangle,
} from "react-icons/fi";
import { SiDiscord } from "react-icons/si";
import { useAuth } from "../contexts/authContext";
import imageCacheService from "../services/imageCacheService";
import logger from "../services/logger";
import BugReportModal from "../components/modals/BugReportModal";

const SettingsPage = () => {
  const [theme, setTheme] = useState("dark");
  const [downloadPath, setDownloadPath] = useState("");
  const { user } = useAuth();

  // Discord RPC States
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordStatus, setDiscordStatus] = useState({
    isConnected: false,
    user: null,
  });
  const [discordLoading, setDiscordLoading] = useState(false);

  // Image Cache States
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheLoading, setCacheLoading] = useState(false);

  // Bug Report Modal State
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  // Change theme (light/dark)
  const handleThemeChange = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const selectDownloadPath = async () => {
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);
        window.store.set("downloadPath", newPath);
      }
    } catch (error) {
      logger.error("[Settings] Error selecting/creating folder", error);
      toast.error("Error", {
        description: "Unable to select folder",
      });
    }
  };

  // Discord RPC - Toggle
  const handleDiscordToggle = async () => {
    setDiscordLoading(true);

    try {
      if (discordEnabled) {
        // Disable Discord RPC
        await window.api.discordRPC.setEnabled({ enabled: false });
        setDiscordEnabled(false);
        await window.store.set("discordRPCEnabled", false);

        toast.success("Discord RPC disabled", {
          description: "Your activity will no longer be displayed on Discord",
        });
      } else {
        // Enable Discord RPC
        const result = await window.api.discordRPC.initialize({
          enabled: true,
        });

        if (result.success) {
          setDiscordEnabled(true);
          await window.store.set("discordRPCEnabled", true);

          // Get status
          const status = await window.api.discordRPC.getStatus();
          setDiscordStatus(status);

          toast.success("Discord RPC enabled", {
            description: result.connected
              ? `Connected to Discord${status.user ? ` (${status.user.username})` : ""}`
              : "Discord is not running, will be available on next launch",
          });
        } else {
          toast.error("Discord RPC error", {
            description: result.error || "Unable to connect to Discord",
          });
        }
      }
    } catch (error) {
      logger.error("[Settings] Discord RPC error", error);
      toast.error("Discord RPC error", {
        description: error.message,
      });
    } finally {
      setDiscordLoading(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      toast.success("Settings saved", {
        description: "Your changes have been saved successfully",
      });
    } catch (error) {
      toast.error("Save error", {
        description: "Unable to save settings",
      });
    }
  };

  // Clear Image Cache
  const handleClearImageCache = async () => {
    setCacheLoading(true);
    try {
      await imageCacheService.clearCache();
      const newSize = await imageCacheService.getCacheSize();
      setCacheSize(newSize);

      toast.success("Cache cleared", {
        description: "All cached images have been deleted",
      });
    } catch (error) {
      logger.error("[Settings] Error clearing cache", error);
      toast.error("Error", {
        description: "Unable to clear cache",
      });
    } finally {
      setCacheLoading(false);
    }
  };

  // Clean Expired Images
  const handleCleanExpiredImages = async () => {
    setCacheLoading(true);
    try {
      const deletedCount = await imageCacheService.cleanExpiredImages();
      const newSize = await imageCacheService.getCacheSize();
      setCacheSize(newSize);

      toast.success("Cleanup complete", {
        description: `${deletedCount} expired image(s) deleted`,
      });
    } catch (error) {
      logger.error("[Settings] Error cleaning cache", error);
      toast.error("Error", {
        description: "Unable to clean cache",
      });
    } finally {
      setCacheLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const storedPath = await window.store.get("downloadPath");
      const storedEnabled = await window.store.get("discordRPCEnabled");

      if (storedPath) setDownloadPath(storedPath);
      if (storedEnabled) {
        setDiscordEnabled(storedEnabled);
        // Get Discord status
        try {
          const status = await window.api.discordRPC.getStatus();
          setDiscordStatus(status);
        } catch (error) {
          logger.error("[Settings] Error fetching Discord status", error);
        }
      }

      // Get image cache size
      try {
        const size = await imageCacheService.getCacheSize();
        setCacheSize(size);
      } catch (error) {
        logger.error("[Settings] Error fetching cache size", error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
      <div className="px-6 md:px-16 py-6 pb-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FiSettings className="text-white text-xl" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Settings
              </h1>
            </div>
            <p className="text-gray-400 text-sm ml-13">
              Configure your Drathos experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Account Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
                    <FiUser className="text-blue-400 text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Account</h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Username
                    </span>
                    <input
                      type="text"
                      value={user.username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="Your username"
                    />
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg">
                    {theme === "dark" ? (
                      <FiMoon className="text-purple-400 text-xl" />
                    ) : (
                      <FiSun className="text-purple-400 text-xl" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">Appearance</h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Application theme
                    </span>
                    <button
                      onClick={handleThemeChange}
                      className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-purple-500 hover:bg-gray-700 transition-all flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {theme === "dark" ? (
                          <>
                            <FiMoon className="text-purple-400" />
                            <span>Dark mode</span>
                          </>
                        ) : (
                          <>
                            <FiSun className="text-yellow-400" />
                            <span>Light mode</span>
                          </>
                        )}
                      </span>
                      <span className="text-sm text-gray-400">
                        Click to change
                      </span>
                    </button>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Discord Rich Presence Section - Full width */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 rounded-lg">
                      <SiDiscord className="text-indigo-400 text-xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Discord Rich Presence</h3>
                      <p className="text-xs text-gray-400">Display your game activity on Discord</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {discordEnabled && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                      discordStatus.isConnected
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      <FiCircle className={`text-xs ${
                        discordStatus.isConnected ? 'animate-pulse' : ''
                      }`} />
                      <span className="text-xs font-medium">
                        {discordStatus.isConnected
                          ? `Connected${discordStatus.user ? ` · ${discordStatus.user.username}` : ''}`
                          : 'Waiting for Discord'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-400">
                    Enable this option to automatically display "Drathos" and the current game on your Discord profile.
                    Make sure Discord Desktop is running.
                  </p>

                  {/* Toggle Button */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <FiActivity className="text-indigo-400" />
                      <span>Show my game activity on Discord</span>
                    </div>
                    <button
                      onClick={handleDiscordToggle}
                      disabled={discordLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        discordEnabled
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-gray-600 hover:bg-gray-500"
                      } ${discordLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                          discordEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Info Box - Current Activity */}
                  {discordEnabled && discordStatus.currentActivity && (
                    <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FiActivity className="text-indigo-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-300">Current activity</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {discordStatus.currentActivity.type === "game"
                              ? `Playing ${discordStatus.currentActivity.gameName}`
                              : "Browsing in Drathos"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info - Discord required */}
                  {!discordStatus.isConnected && discordEnabled && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FiCircle className="text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-300">Discord not detected</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Launch Discord Desktop to see your activity appear
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Image Cache Section - Full width */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-orange-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-500/20 rounded-lg">
                      <FiImage className="text-orange-400 text-xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Image Cache</h3>
                      <p className="text-xs text-gray-400">Management of local game cover cache</p>
                    </div>
                  </div>

                  {/* Cache Size Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400">
                    <FiImage className="text-xs" />
                    <span className="text-xs font-medium">
                      {cacheSize} cached image{cacheSize > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-400">
                    Game covers are automatically cached locally to improve performance.
                    The cache is automatically cleaned after 7 days.
                  </p>

                  {/* Cache Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={handleCleanExpiredImages}
                      disabled={cacheLoading}
                      className={`px-4 py-3 bg-gray-700/50 border border-gray-600 hover:border-orange-500 hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
                        cacheLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <FiActivity className="text-orange-400" />
                      <span>Clean expired images</span>
                    </button>

                    <button
                      onClick={handleClearImageCache}
                      disabled={cacheLoading}
                      className={`px-4 py-3 bg-gray-700/50 border border-gray-600 hover:border-red-500 hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
                        cacheLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <FiTrash2 className="text-red-400" />
                      <span>Clear entire cache</span>
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FiImage className="text-orange-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-300">Active optimizations</p>
                        <ul className="text-xs text-gray-400 mt-1 space-y-1">
                          <li>• Lazy loading of images</li>
                          <li>• Automatic compression of IGDB covers</li>
                          <li>• Local cache with IndexedDB</li>
                          <li>• Animated placeholders during loading</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Downloads Section - Full width */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg">
                    <FiDownload className="text-green-400 text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Downloads
                  </h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Game installation path
                    </span>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <FiFolder className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={downloadPath || "No path selected"}
                          readOnly
                          className="w-full pl-10 pr-3 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 cursor-not-allowed"
                        />
                      </div>
                      <button
                        onClick={selectDownloadPath}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                      >
                        <FiFolder />
                        Browse
                      </button>
                    </div>
                    {downloadPath && (
                      <p className="text-xs text-gray-500 mt-2">
                        Games will be installed in this folder
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Action buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 flex justify-between items-center"
          >
            <button
              onClick={() => setIsBugReportOpen(true)}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-all duration-300 border border-red-500/30 hover:border-red-500/50 flex items-center gap-2"
            >
              <FiAlertTriangle className="w-5 h-5" />
              Report a Bug
            </button>

            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
            >
              <FiCheck />
              Save settings
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
