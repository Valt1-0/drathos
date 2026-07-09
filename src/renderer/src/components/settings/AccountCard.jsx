import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FiUser, FiCamera, FiUpload, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../../contexts/authContext";
import { useConnection } from "../../contexts/connectionContext";
import { Button, Card, Input } from "../ui";
import ProfileAvatar from "../ProfileAvatar";
import { uploadProfilePicture, deleteProfilePicture } from "../../api/user";
import logger from "../../services/logger";

const AccountCard = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { isOnline } = useConnection();
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error(t("common.error"), { description: t("settings.invalidImageType") });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("common.error"), { description: t("settings.imageTooLarge") });
        return;
      }

      setUploadingPicture(true);
      setUploadProgress(0);
      try {
        const result = await uploadProfilePicture(file, setUploadProgress);
        setProfilePicture(result.profilePicture);
        updateUser({ profilePicture: result.profilePicture });
        toast.success(t("settings.profilePictureUpdated"));
      } catch (error) {
        logger.error("[Settings] Error uploading profile picture", error);
        toast.error(t("common.error"), { description: error.message || t("settings.profilePictureError") });
      } finally {
        setUploadingPicture(false);
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [t, updateUser]
  );

  const handleDelete = useCallback(async () => {
    setUploadingPicture(true);
    try {
      await deleteProfilePicture();
      setProfilePicture(null);
      updateUser({ profilePicture: null });
      toast.success(t("settings.profilePictureDeleted"));
    } catch (error) {
      logger.error("[Settings] Error deleting profile picture", error);
      toast.error(t("common.error"), { description: error.message || t("settings.profilePictureError") });
    } finally {
      setUploadingPicture(false);
    }
  }, [t, updateUser]);

  return (
    <div id="setting-account">
      <Card variant="glass" hover>
        <Card.Header
          icon={<FiUser className="text-sm" />}
          title={t("settings.account")}
          subtitle={t("settings.manageProfile")}
        />
        <Card.Body>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group">
                <ProfileAvatar
                  profilePicture={profilePicture}
                  username={user.username}
                  size="lg"
                  className="rounded-xl"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: isOnline ? 1 : 0 }}
                  className={`absolute inset-0 rounded-xl flex items-center justify-center ${isOnline ? "cursor-pointer" : "cursor-not-allowed"}`}
                  style={{ background: "rgba(0, 0, 0, 0.6)" }}
                  onClick={() => isOnline && !uploadingPicture && fileInputRef.current?.click()}
                >
                  {uploadingPicture ? (
                    uploadProgress !== null && uploadProgress < 100 ? (
                      <span className="text-white text-xs font-bold">{uploadProgress}%</span>
                    ) : (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )
                  ) : (
                    <FiCamera className="text-base text-white" />
                  )}
                </motion.div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleUpload}
                className="hidden"
                disabled={!isOnline}
              />
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPicture || !isOnline} icon={<FiUpload />} iconPosition="left">
                  {t("settings.uploadPicture")}
                </Button>
                {profilePicture && (
                  <Button variant="danger" size="sm" onClick={handleDelete} disabled={uploadingPicture || !isOnline} icon={<FiTrash2 />} iconPosition="left">
                    {t("settings.deletePicture")}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <Input label={t("settings.username")} value={user.username} icon={<FiUser />} disabled />
              {user.role && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--app-background)" }}>
                  <span className="text-xs" style={{ color: "var(--app-textSecondary)" }}>{t("settings.role")}:</span>
                  <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded" style={{ background: user.role === "admin" ? "var(--app-primary)" : "var(--app-secondary)", color: "#fff" }}>
                    {user.role}
                  </span>
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--app-textSecondary)" }}>
                {isOnline ? t("settings.pictureHint") : t("settings.offlineNoChanges")}
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AccountCard;
