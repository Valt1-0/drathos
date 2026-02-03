import { useState, useEffect, useRef } from "react";
import { FiUser } from "react-icons/fi";
import { buildProfilePictureUrlSync } from "../utils/urlHelper";
import imageCacheService from "../services/imageCacheService";

// Cache serverAddress globally to avoid repeated async calls
let cachedServerAddress = null;
let serverAddressPromise = null;

const getServerAddress = async () => {
  if (cachedServerAddress) return cachedServerAddress;
  if (serverAddressPromise) return serverAddressPromise;

  serverAddressPromise = window.store?.get("serverAddress").then(addr => {
    cachedServerAddress = addr;
    return addr;
  });

  return serverAddressPromise;
};

/**
 * ProfileAvatar - A component that displays a user's profile picture
 * Handles both local uploads and external URLs automatically
 * Uses imageCacheService for caching
 */
const ProfileAvatar = ({
  profilePicture,
  username,
  size = "md",
  className = "",
  showFallback = true
}) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const mountedRef = useRef(true);

  const sizes = {
    xs: "w-8 h-8 text-sm",
    sm: "w-10 h-10 text-lg",
    md: "w-14 h-14 text-2xl",
    lg: "w-20 h-20 text-3xl",
    xl: "w-24 h-24 text-4xl",
    "2xl": "w-32 h-32 text-5xl"
  };

  const sizeClass = sizes[size] || sizes.md;

  useEffect(() => {
    mountedRef.current = true;

    const loadImageUrl = async () => {
      if (!profilePicture) {
        if (mountedRef.current) {
          setImageUrl(null);
        }
        return;
      }

      try {
        const serverAddress = await getServerAddress();
        const fullUrl = buildProfilePictureUrlSync(profilePicture, serverAddress);

        if (!fullUrl || !mountedRef.current) return;

        // Use imageCacheService for caching
        const cachedUrl = await imageCacheService.fetchAndCache(fullUrl);

        if (mountedRef.current) {
          setImageUrl(cachedUrl);
          setImageError(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setImageUrl(null);
        }
      }
    };

    loadImageUrl();

    return () => {
      mountedRef.current = false;
    };
  }, [profilePicture]);

  const handleImageError = () => {
    setImageError(true);
  };

  const dimensionClasses = sizeClass.split(' ').slice(0, 2).join(' ');

  // Show image if we have a valid URL and no error
  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={username || "Profile"}
        className={`${dimensionClasses} rounded-xl object-cover border-2 ${className}`}
        style={{ borderColor: 'var(--app-border)' }}
        onError={handleImageError}
      />
    );
  }

  // Show fallback avatar (also during loading to avoid flash)
  if (showFallback) {
    return (
      <div
        className={`${dimensionClasses} rounded-xl flex items-center justify-center ${className}`}
        style={{ background: 'linear-gradient(135deg, var(--app-primary), var(--app-secondary))' }}
      >
        <FiUser className="text-white" />
      </div>
    );
  }

  return null;
};

export default ProfileAvatar;
