import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  FiUserPlus,
  FiPlus,
  FiCopy,
  FiTrash2,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { Card, Button, Toggle } from "../ui";
import {
  getServerLimits,
  setRegistrationEnabled as apiSetRegistrationEnabled,
} from "../../api/server";
import {
  listInvitations,
  createInvitation,
  deleteInvitation,
} from "../../api/user";
import logger from "../../services/logger";

const STATUS_STYLES = {
  active: { color: "#10B981", bg: "rgba(16,185,129,0.15)" },
  used: { color: "var(--app-textSecondary)", bg: "rgba(255,255,255,0.06)" },
  expired: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
};

const RegistrationCard = ({ isOnline }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [invites, setInvites] = useState([]);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [settings, invitations] = await Promise.all([
        getServerLimits(),
        listInvitations(),
      ]);
      setEnabled(settings.registrationEnabled !== false);
      setInvites(invitations);
    } catch (err) {
      logger.error("[RegistrationCard] load error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(
    async (next) => {
      setToggling(true);
      const previous = enabled;
      setEnabled(next); // optimistic
      try {
        await apiSetRegistrationEnabled(next);
        toast.success(
          next ? t("settings.registrationOpened") : t("settings.registrationClosed")
        );
      } catch (err) {
        setEnabled(previous); // rollback
        logger.error("[RegistrationCard] toggle error", err);
        toast.error(t("common.error"), { description: err.message });
      } finally {
        setToggling(false);
      }
    },
    [enabled, t]
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const invite = await createInvitation();
      setInvites((prev) => [{ ...invite, status: "active" }, ...prev]);
      await navigator.clipboard.writeText(invite.code).catch(() => {});
      toast.success(t("settings.inviteCreated"), { description: t("settings.inviteCopied") });
    } catch (err) {
      logger.error("[RegistrationCard] create error", err);
      toast.error(t("common.error"), { description: err.message });
    } finally {
      setCreating(false);
    }
  }, [t]);

  const handleCopy = useCallback(
    async (code) => {
      try {
        await navigator.clipboard.writeText(code);
        toast.success(t("settings.inviteCopied"));
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t]
  );

  const handleRevoke = useCallback(
    async (id) => {
      try {
        await deleteInvitation(id);
        setInvites((prev) => prev.filter((inv) => inv._id !== id));
        toast.success(t("settings.inviteRevoked"));
      } catch (err) {
        logger.error("[RegistrationCard] revoke error", err);
        toast.error(t("common.error"), { description: err.message });
      }
    },
    [t]
  );

  const activeInvites = invites.filter((inv) => inv.status === "active");
  const otherInvites = invites.filter((inv) => inv.status !== "active");

  return (
    <div id="setting-registration">
      <Card variant="glass" hover>
        <Card.Header
          icon={<FiUserPlus className="text-sm" />}
          title={t("settings.registration")}
          subtitle={t("settings.registrationDesc")}
        />
        <Card.Body>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--app-primary)", borderTopColor: "transparent" }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Toggle
                checked={enabled}
                onChange={handleToggle}
                disabled={toggling || !isOnline}
                label={t("settings.openRegistration")}
                description={
                  enabled
                    ? t("settings.openRegistrationOn")
                    : t("settings.openRegistrationOff")
                }
              />

              <div
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--app-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
                      {t("settings.inviteCodes")}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--app-textSecondary)" }}>
                      {t("settings.inviteCodesDesc", { count: activeInvites.length })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreate}
                    disabled={creating || !isOnline}
                    icon={
                      creating ? (
                        <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin border-white" />
                      ) : (
                        <FiPlus />
                      )
                    }
                    iconPosition="left"
                  >
                    {t("settings.generateCode")}
                  </Button>
                </div>

                {invites.length === 0 ? (
                  <p className="text-xs py-3 text-center" style={{ color: "var(--app-textSecondary)" }}>
                    {t("settings.noInviteCodes")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {[...activeInvites, ...otherInvites].map((inv) => {
                        const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.used;
                        const isActive = inv.status === "active";
                        return (
                          <motion.div
                            key={inv._id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 py-1.5"
                          >
                            <code
                              className="text-sm font-mono font-semibold tracking-wider px-2 py-1 rounded-md"
                              style={{
                                color: isActive ? "var(--app-primary)" : "var(--app-textSecondary)",
                                background: "rgba(255,255,255,0.04)",
                                textDecoration: inv.status === "used" ? "line-through" : "none",
                              }}
                            >
                              {inv.code}
                            </code>
                            <span
                              className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1"
                              style={{ color: style.color, background: style.bg }}
                            >
                              {inv.status === "active" && <FiCheckCircle size={10} />}
                              {inv.status === "expired" && <FiClock size={10} />}
                              {t(`settings.inviteStatus.${inv.status}`)}
                            </span>
                            {inv.usedBy && (
                              <span className="text-xs truncate" style={{ color: "var(--app-textSecondary)" }}>
                                {t("settings.inviteUsedBy", { user: inv.usedBy })}
                              </span>
                            )}
                            <div className="flex-1" />
                            {isActive && (
                              <>
                                <button
                                  onClick={() => handleCopy(inv.code)}
                                  title={t("settings.copyCode")}
                                  className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                                  style={{ color: "var(--app-textSecondary)" }}
                                >
                                  <FiCopy size={14} />
                                </button>
                                <button
                                  onClick={() => handleRevoke(inv._id)}
                                  disabled={!isOnline}
                                  title={t("settings.revokeCode")}
                                  className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-40"
                                  style={{ color: "#EF4444" }}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default RegistrationCard;
