import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiX, FiPlus, FiTrash2, FiMessageSquare, FiUser, FiCalendar, FiSearch } from "react-icons/fi";
import { toast } from "sonner";
import dayjs from "dayjs";
import { useAuth } from "../contexts/authContext";
import { getAllRequests, deleteRequest } from "../api/gameRequests";
import GameRequestModal from "./modals/GameRequestModal";
import logger from "../services/logger";

const DESCRIPTION_THRESHOLD = 80;

const RequestCard = ({ request, canDelete, onDelete, index }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const username = request.userId?.username;
  const desc = request.description;
  const isTruncatable = desc && desc.length > DESCRIPTION_THRESHOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.97 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      layout
      className="group relative rounded-xl border px-3 py-2.5 transition-all hover:border-primary/30"
      style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
    >
      <div
        className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--app-gradient-primary)" }}
      />

      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text leading-tight wrap-break-word min-w-0">
            {request.gameTitle}
          </h3>

          {desc && (
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed wrap-break-word">
              {isTruncatable && !expanded ? desc.slice(0, DESCRIPTION_THRESHOLD) + "…" : desc}
              {isTruncatable && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="ml-1 font-medium hover:underline"
                  style={{ color: "var(--app-primary)" }}
                >
                  {expanded ? t("requests.showLess") : t("requests.showMore")}
                </button>
              )}
            </p>
          )}

          <div className="flex items-center gap-2.5 mt-1">
            {username && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <FiUser className="text-[9px]" />
                <span className="font-medium" style={{ color: "var(--app-primary)" }}>{username}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <FiCalendar className="text-[9px]" />
              {dayjs(request.createdAt).format("DD MMM YYYY")}
            </span>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={() => onDelete(request._id)}
            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all"
            title={t("common.delete")}
          >
            <FiTrash2 className="text-xs" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const GameRequestsPanel = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPrivileged = ["admin", "moderator"].includes(user?.role);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllRequests();
      setRequests(data);
    } catch (err) {
      logger.error("[GameRequests] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen, fetchRequests]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r =>
      r.gameTitle.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.userId?.username?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const handleDelete = async (id) => {
    try {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r._id !== id));
      toast.success(t("requests.deleted"));
    } catch (err) {
      toast.error(t("common.error"), { description: err.message });
    }
  };

  const handleCreated = (newRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    setIsModalOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={onClose}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-96 shadow-2xl"
              style={{ background: "var(--app-backgroundSecondary)", borderLeft: "1px solid var(--app-border)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--app-border)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--app-gradient-primary)" }}>
                    <FiMessageSquare className="text-sm text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text">{t("requests.title")}</h2>
                    {requests.length > 0 && (
                      <p className="text-xs text-text-secondary">{t("requests.requestCount", { count: requests.length })}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--app-gradient-primary)" }}
                  >
                    <FiPlus className="text-xs" />
                    {t("requests.newRequest")}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors"
                  >
                    <FiX className="text-base" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-2 border-b" style={{ borderColor: "var(--app-border)" }}>
                <div className="relative">
                  <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("common.search")}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none focus:border-primary/60 transition-colors"
                    style={{ background: "var(--app-background)", borderColor: "var(--app-border)", color: "var(--app-text)" }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loading && requests.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 pb-12">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
                      <FiMessageSquare className="text-2xl text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">{t("requests.empty")}</p>
                      <p className="text-xs text-text-secondary mt-1">{t("requests.emptyDesc")}</p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ background: "var(--app-gradient-primary)" }}
                    >
                      <FiPlus className="text-xs" />
                      {t("requests.newRequest")}
                    </button>
                  </div>
                )}

                {!loading && requests.length > 0 && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                    <FiSearch className="text-xl text-text-secondary" />
                    <p className="text-xs text-text-secondary">{t("requests.noResults", { query: search })}</p>
                  </div>
                )}

                {!loading && filtered.length > 0 && (
                  <div className="p-3">
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-2">
                        {filtered.map((req, i) => (
                          <RequestCard
                            key={req._id}
                            request={req}
                            index={i}
                            canDelete={isPrivileged || req.userId?._id === user?._id || req.userId === user?._id}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GameRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
};

export default GameRequestsPanel;
