import { useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { motion, AnimatePresence } from "framer-motion";
import logger from "../../services/logger";
import { FiX, FiUpload, FiFile, FiCheck, FiAlertCircle, FiPackage } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { uploadMod, getAllGamesForAdmin } from "../../api/mods";
import Card from "../ui/Card";
import Button from "../ui/Button";
import GameCover from "../GameCover";

// Sanitize installation path to prevent path traversal
function sanitizeInstallPath(input) {
  let sanitized = input.trim();

  // Remove absolute path indicators and leading slashes
  sanitized = sanitized.replace(/^([a-zA-Z]:)?[/\\]+/, '');

  // Remove path traversal sequences — repeat until none remain
  while (sanitized.includes('..')) {
    sanitized = sanitized.replace(/\.\./g, '');
  }

  // Remove leading/trailing slashes
  sanitized = sanitized.replace(/^[/\\]+|[/\\]+$/g, '');

  // Normalize consecutive slashes to single forward slash
  sanitized = sanitized.replace(/[/\\]+/g, '/');

  return sanitized;
}

const UploadModModal = ({ onClose, onSuccess, preselectedGame = null }) => {
  const containerRef = useFocusTrap(true);
  const { t } = useTranslation();

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [showGamesList, setShowGamesList] = useState(false);

  const [formData, setFormData] = useState({
    gameId: preselectedGame?._id || "",
    name: "",
    author: "",
    version: "1.0.0",
    installPath: "Mods",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadGames = async () => {
    if (gamesLoaded) {
      setShowGamesList(true);
      return;
    }

    setLoadingGames(true);
    setShowGamesList(true);
    try {
      const gamesList = await getAllGamesForAdmin();
      setGames(gamesList);
      setGamesLoaded(true);
    } catch (error) {
      logger.error("Error loading games:", error);
      toast.error(t('mods.loadingError'));
    } finally{
      setLoadingGames(false);
    }
  };

  const handleSelectGame = (game) => {
    setFormData({ ...formData, gameId: game._id });
    setShowGamesList(false);
  };

  const handleFileSelect = async () => {
    try {
      const result = await window.api.selectArchiveFile();

      if (result.canceled || !result.success) {
        return;
      }

      // Check file size (without loading the file into memory)
      if (result.fileSize > 20 * 1024 * 1024 * 1024) { // 20GB
        toast.error(t('mods.fileTooLarge'));
        return;
      }

      // Create a File-like object for compatibility
      const file = {
        name: result.fileName,
        size: result.fileSize,
        path: result.filePath,
        type: 'application/octet-stream'
      };

      setSelectedFile(file);
    } catch (error) {
      logger.error("Error selecting file:", error);
      toast.error(t('mods.fileSelectError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) return toast.error(t('mods.selectModFile'));
    if (!formData.gameId) return toast.error(t('mods.selectValidGame'));
    if (!formData.name.trim()) return toast.error(t('mods.enterModName'));
    if (!formData.installPath.trim()) return toast.error(t('mods.installPathRequired'));

    setUploading(true);
    setUploadProgress(0);

    try {
      // If the file has a path property (from the native API), read the file
      let fileToUpload = selectedFile;
      if (selectedFile.path) {
        const buffer = await window.api.readArchiveFile(selectedFile.path);
        if (!buffer.success) {
          throw new Error(buffer.error || 'Failed to read file');
        }
        const blob = new Blob([buffer.buffer], { type: 'application/octet-stream' });
        fileToUpload = new File([blob], selectedFile.name, { type: 'application/octet-stream' });
      }

      await uploadMod(formData, fileToUpload, setUploadProgress);
      toast.success(t('mods.uploadSuccess'));
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error("Upload error:", error);
      toast.error(`${t('mods.uploadError')}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const selectedGame = games.find(g => g._id === formData.gameId)
    ?? (preselectedGame?._id === formData.gameId ? preselectedGame : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card variant="glass">
          <Card.Header
            icon={<FiUpload className="w-5 h-5" />}
            title={t('mods.uploadMod')}
            subtitle={t('mods.subtitle')}
            action={
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<FiX />}
                onClick={onClose}
                disabled={uploading}
                aria-label={t('common.close')}
              />
            }
          />

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.modFile')} *
              </label>
              <div
                onClick={() => !uploading && handleFileSelect()}
                className="relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer overflow-hidden hover:border-opacity-100"
                style={{
                  borderColor: selectedFile ? 'var(--app-primary)' : 'var(--app-border)'
                }}
              >
                {selectedFile && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'var(--app-primary)', opacity: 0.1 }}
                  />
                )}
                <div className="relative z-10">
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                        style={{ background: 'var(--app-gradient-primary)' }}
                      >
                        <FiFile className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--app-text)' }}>
                          {selectedFile.name}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <FiCheck className="w-5 h-5" style={{ color: 'var(--app-success)' }} />
                    </div>
                  ) : (
                    <div className="text-center">
                      <FiUpload className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--app-textSecondary)' }} />
                      <p className="font-medium mb-1" style={{ color: 'var(--app-text)' }}>
                        {t('mods.clickToSelect')}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                        {t('mods.supportedFormats')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.gameLabel')} *
              </label>

              {selectedGame ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg"
                  style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-primary)'
                  }}
                  onClick={() => !uploading && loadGames()}
                >
                  <div className="flex items-center gap-3">
                    {selectedGame.coverUrl ? (
                      <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                        <GameCover
                          src={selectedGame.coverUrl}
                          alt={selectedGame.name}
                          className="w-full h-full object-cover"
                          size="cover_small"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--app-gradient-primary)' }}
                      >
                        <FiPackage className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>
                        {selectedGame.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                        Version {selectedGame.version}
                      </p>
                    </div>
                    <FiCheck className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--app-success)' }} />
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => !uploading && loadGames()}
                  disabled={uploading}
                  className="w-full p-4 rounded-xl border-2 border-dashed transition-all hover:border-opacity-100"
                  style={{
                    borderColor: 'var(--app-border)',
                    background: 'var(--app-surface)'
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiPackage className="w-5 h-5" style={{ color: 'var(--app-textSecondary)' }} />
                    <span style={{ color: 'var(--app-text)' }}>
                      {t('mods.selectGamePlaceholder')}
                    </span>
                  </div>
                </button>
              )}

              <AnimatePresence>
                {showGamesList && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 p-4 rounded-xl border max-h-96 overflow-y-auto"
                    style={{
                      background: 'var(--app-backgroundSecondary)',
                      borderColor: 'var(--app-border)'
                    }}
                  >
                    {loadingGames ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-3" style={{ borderColor: 'var(--app-primary)' }}></div>
                        <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>{t('mods.loadingGames')}</p>
                      </div>
                    ) : games.length === 0 ? (
                      <div className="text-center py-8">
                        <FiPackage className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--app-textSecondary)' }} />
                        <p style={{ color: 'var(--app-text)' }}>{t('mods.noGamesAvailableList')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {games.map((game) => (
                          <motion.button
                            key={game._id}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectGame(game)}
                            className="p-3 rounded-lg border text-left transition-all"
                            style={{
                              background: formData.gameId === game._id ? 'var(--app-primary)' : 'var(--app-surface)',
                              borderColor: formData.gameId === game._id ? 'var(--app-primary)' : 'var(--app-border)',
                              opacity: formData.gameId === game._id ? 0.2 : 1
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {game.coverUrl ? (
                                <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 shadow">
                                  <GameCover
                                    src={game.coverUrl}
                                    alt={game.name}
                                    className="w-full h-full object-cover"
                                    size="cover_small"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="w-10 h-14 rounded flex items-center justify-center flex-shrink-0"
                                  style={{ background: 'var(--app-gradient-primary)' }}
                                >
                                  <FiPackage className="w-5 h-5 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate" style={{ color: 'var(--app-text)' }}>
                                  {game.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
                                  v{game.version}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.modName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={uploading}
                placeholder={t('mods.modNamePlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none"
                style={{
                  background: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)'
                }}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  {t('mods.author')}
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  disabled={uploading}
                  placeholder={t('mods.authorPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none"
                  style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  {t('mods.version')}
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  disabled={uploading}
                  placeholder={t('mods.versionPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none"
                  style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.installPath')} *
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.installPath}
                  onChange={(e) => {
                    const sanitized = sanitizeInstallPath(e.target.value);
                    setFormData({ ...formData, installPath: sanitized });
                  }}
                  disabled={uploading}
                  placeholder="Mods"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none"
                  style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)'
                  }}
                  required
                />

                {selectedGame && formData.installPath && (
                  <div className="relative p-3 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--app-primary)' }}>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'var(--app-primary)', opacity: 0.1 }}
                    />
                    <div className="relative z-10">
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--app-textSecondary)' }}>
                        {t('mods.installPathPreview')}:
                      </p>
                      <code className="text-sm" style={{ color: 'var(--app-text)' }}>
                        {'<Game Install Dir>/' + formData.installPath.replace(/\\/g, '/')}
                      </code>
                    </div>
                  </div>
                )}

                <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
                  <FiAlertCircle className="inline w-3 h-3 mr-1" />
                  {t('mods.installPathHelp')}
                </p>
              </div>
            </div>

            {uploading && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                    {t('mods.uploading')}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--app-surface)' }}>
                  <motion.div
                    className="h-full"
                    style={{ background: 'var(--app-gradient-primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        <Card.Footer>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
              {t('mods.requiredFields')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={uploading}
              >
                {t('mods.cancel')}
              </Button>
              <Button
                variant="primary"
                gradient={true}
                size="md"
                icon={uploading ? undefined : <FiUpload />}
                onClick={handleSubmit}
                disabled={uploading || !selectedFile || !formData.gameId || !formData.name}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {t('mods.uploading')}
                  </>
                ) : (
                  t('mods.upload')
                )}
              </Button>
            </div>
          </div>
        </Card.Footer>
        </Card>
      </motion.div>
    </div>
  );
};

export default UploadModModal;
