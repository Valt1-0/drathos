import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiX, FiSend, FiSearch } from "react-icons/fi";
import { toast } from "sonner";
import { createRequest } from "../../api/gameRequests";
import logger from "../../services/logger";

const GameRequestModal = ({ isOpen, onClose, onCreated, prefillTitle = "" }) => {
  const { t } = useTranslation();
  const [gameTitle, setGameTitle] = useState(prefillTitle);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setGameTitle(prefillTitle);
    setDescription("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gameTitle.trim()) return;
    setSubmitting(true);
    try {
      const newRequest = await createRequest({ gameTitle: gameTitle.trim(), description: description.trim() });
      toast.success(t("requests.submitted"), { duration: 1500 });
      onCreated?.(newRequest);
      window.dispatchEvent(new CustomEvent("game-request-created", { detail: newRequest }));
      handleClose();
    } catch (err) {
      logger.error("[GameRequestModal] Submit failed", err);
      toast.error(t("common.error"), { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ background: "var(--app-backgroundSecondary)", borderColor: "var(--app-border)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--app-gradient-primary)" }}
                >
                  <FiSearch className="text-lg text-white" />
                </div>
                <h2 className="text-xl font-bold text-text">{t("requests.modalTitle")}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t("requests.gameTitle")} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder={t("requests.gameTitlePlaceholder")}
                  maxLength={200}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-text placeholder-text-secondary focus:outline-none focus:border-primary transition-colors"
                  style={{
                    background: "var(--app-background)",
                    borderColor: "var(--app-border)",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t("requests.description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("requests.descriptionPlaceholder")}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-text placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors resize-none"
                  style={{
                    background: "var(--app-background)",
                    borderColor: "var(--app-border)",
                  }}
                />
                <p className="text-xs text-text-secondary mt-1 text-right">{description.length}/1000</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium text-text-secondary hover:text-text hover:border-primary/40 transition-colors"
                  style={{ borderColor: "var(--app-border)" }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !gameTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ background: "var(--app-gradient-primary)" }}
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSend className="text-sm" />
                  )}
                  {t("requests.submit")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameRequestModal;
