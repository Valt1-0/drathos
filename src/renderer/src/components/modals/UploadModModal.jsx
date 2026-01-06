import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUpload, FiFile, FiCheck, FiAlertCircle } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { uploadMod, getAllGamesForAdmin } from "../../api/mods";
import Card from "../ui/Card";
import Button from "../ui/Button";

// Sanitize installation path to prevent security issues
function sanitizeInstallPath(input) {
  // Remove leading/trailing slashes and whitespace
  let sanitized = input.trim().replace(/^[/\\]+|[/\\]+$/g, '');

  // Block path traversal
  sanitized = sanitized.replace(/\.\./g, '');

  // Remove absolute path indicators
  sanitized = sanitized.replace(/^([a-zA-Z]:)?[/\\]/, '');

  // Normalize consecutive slashes to single forward slash
  sanitized = sanitized.replace(/[/\\]+/g, '/');

  return sanitized;
}

const UploadModModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();

  const fileInputRef = useRef(null);

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [formData, setFormData] = useState({
    gameId: "",
    name: "",
    author: "",
    version: "1.0.0",
    installPath: "Mods",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const gamesList = await getAllGamesForAdmin();
      setGames(gamesList);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error(t('mods.loadingError'));
    } finally{
      setLoadingGames(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.zip') && !ext.endsWith('.7z') && !ext.endsWith('.rar')) {
      toast.error(t('mods.invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB
      toast.error(t('mods.fileTooLarge'));
      return;
    }

    setSelectedFile(file);
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
      await uploadMod(formData, selectedFile, setUploadProgress);
      toast.success(t('mods.uploadSuccess'));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`${t('mods.uploadError')}: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const selectedGame = games.find(g => g._id === formData.gameId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card variant="glass">
          {/* Header */}
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
              />
            }
          />

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.modFile')} *
              </label>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer overflow-hidden"
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.7z,.rar"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
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

            {/* Game Selection */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                {t('mods.gameLabel')} *
              </label>
              <select
                value={formData.gameId}
                onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                disabled={uploading || loadingGames}
                className="w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none"
                style={{
                  background: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)'
                }}
                required
              >
                <option value="">{t('mods.selectGamePlaceholder')}</option>
                {games.map(game => (
                  <option key={game._id} value={game._id}>
                    {game.name} (v{game.version})
                  </option>
                ))}
              </select>
            </div>

            {/* Mod Name */}
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

            {/* Two Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Author */}
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

              {/* Version */}
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

            {/* Installation Path */}
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

                {/* Path Preview */}
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

                {/* Help Text */}
                <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
                  <FiAlertCircle className="inline w-3 h-3 mr-1" />
                  {t('mods.installPathHelp')}
                </p>
              </div>
            </div>

            {/* Upload Progress */}
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

        {/* Footer */}
        <Card.Footer>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
              * Champs obligatoires
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
