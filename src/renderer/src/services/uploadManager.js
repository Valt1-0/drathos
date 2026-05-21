import { MAX_UPLOAD_FILE_SIZE, MIN_UPLOAD_FILE_SIZE } from "../utils/constants.js";
import i18n from "../i18n/config";

class UploadManager {
  constructor() {
    this.maxSimultaneousUploads = 2;
    this.activeUploads = new Map();
    this.uploadQueue = [];
    this.maxFileSize = MAX_UPLOAD_FILE_SIZE;
    this.minFileSize = MIN_UPLOAD_FILE_SIZE;
  }

  /**
   * Verify file size before upload
   * @param {File} file - File to verify
   * @returns {Object} Validation result
   */
  verifyFileSize(file) {
    if (!file) {
      return {
        valid: false,
        error: i18n.t("upload.noFileProvided"),
      };
    }

    if (file.size < this.minFileSize) {
      return {
        valid: false,
        error: i18n.t("upload.fileTooSmall", { size: this.formatBytes(this.minFileSize) }),
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: i18n.t("upload.fileTooLarge", { size: this.formatBytes(this.maxFileSize) }),
        fileSize: file.size,
        maxSize: this.maxFileSize,
      };
    }

    return {
      valid: true,
      fileSize: file.size,
      formattedSize: this.formatBytes(file.size),
    };
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Check if upload can start (not exceeding max concurrent uploads)
   * @returns {boolean} True if upload can start
   */
  canStartUpload() {
    return this.activeUploads.size < this.maxSimultaneousUploads;
  }

  /**
   * Add upload to queue or start immediately if possible
   * @param {Object} uploadConfig - Upload configuration
   * @returns {Promise} Upload promise
   */
  async queueUpload(uploadConfig) {
    const uploadId = this.generateUploadId();

    // Check file size first
    const sizeCheck = this.verifyFileSize(uploadConfig.file);
    if (!sizeCheck.valid) {
      throw new Error(sizeCheck.error);
    }

    const upload = {
      id: uploadId,
      config: uploadConfig,
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      upload.resolve = resolve;
      upload.reject = reject;

      if (this.canStartUpload()) {
        this.startUpload(upload);
      } else {
        this.uploadQueue.push(upload);
        uploadConfig.onQueued?.(upload);
      }
    });
  }

  /**
   * Start an upload
   * @param {Object} upload - Upload object
   */
  async startUpload(upload) {
    upload.status = "uploading";
    this.activeUploads.set(upload.id, upload);

    try {
      const result = await this.executeUpload(upload);
      this.handleUploadComplete(upload, result);
    } catch (error) {
      this.handleUploadError(upload, error);
    }
  }

  /**
   * Execute the actual upload
   * @param {Object} upload - Upload object
   * @returns {Promise} Upload result
   */
  executeUpload(upload) {
    const { config } = upload;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      upload.xhr = xhr; // Store for potential abort/pause

      const formData = new FormData();
      formData.append("zipFile", config.file);
      formData.append("version", config.version);
      formData.append("isPublic", config.isPublic);

      // New multiplayer format
      if (config.multiplayer) {
        formData.append("multiplayer", JSON.stringify(config.multiplayer));
      }

      formData.append("igdbId", config.igdbId);

      if (config.executableName) {
        formData.append("executableName", config.executableName);
      }

      xhr.open("POST", config.url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${config.token}`);

      // Progress tracking
      let lastLoaded = 0;
      let lastTime = Date.now();

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const currentTime = Date.now();
            const timeElapsed = (currentTime - lastTime) / 1000;

            const bytesUploaded = event.loaded - lastLoaded;
            const speed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;
            const bytesRemaining = event.total - event.loaded;
            const eta = speed > 0 ? bytesRemaining / speed : 0;

            lastLoaded = event.loaded;
            lastTime = currentTime;

            upload.progress = percent;
            config.onProgress?.({
              percent,
              loaded: event.loaded,
              total: event.total,
              speed,
              eta,
              uploadId: upload.id,
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve(responseData);
          } catch (err) {
            reject(new Error("Invalid server response"));
          }
        } else {
          let errorMessage = `HTTP Error ${xhr.status}: ${xhr.statusText}`;
          try {
            const responseData = JSON.parse(xhr.responseText);
            if (responseData.message) errorMessage = responseData.message;
            if (responseData.details) errorMessage += `: ${responseData.details}`;
          } catch {}
          const uploadErr = new Error(errorMessage);
          if (xhr.status === 409) uploadErr.isDuplicate = true;
          reject(uploadErr);
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.onabort = () => {
        reject(new Error("Upload cancelled"));
      };

      xhr.send(formData);
    });
  }

  /**
   * Handle upload completion
   * @param {Object} upload - Upload object
   * @param {Object} result - Upload result
   */
  handleUploadComplete(upload, result) {
    upload.status = "completed";
    this.activeUploads.delete(upload.id);
    upload.resolve(result);

    // Start next upload in queue
    this.processQueue();
  }

  /**
   * Handle upload error
   * @param {Object} upload - Upload object
   * @param {Error} error - Error object
   */
  handleUploadError(upload, error) {
    upload.status = "error";
    upload.error = error;
    this.activeUploads.delete(upload.id);
    upload.reject(error);

    // Start next upload in queue
    this.processQueue();
  }

  /**
   * Process the upload queue
   */
  processQueue() {
    while (this.canStartUpload() && this.uploadQueue.length > 0) {
      const nextUpload = this.uploadQueue.shift();
      this.startUpload(nextUpload);
    }
  }

  /**
   * Cancel an upload
   * @param {string} uploadId - Upload ID
   */
  cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.xhr) {
      upload.xhr.abort();
    }

    // Remove from queue if queued
    this.uploadQueue = this.uploadQueue.filter((u) => u.id !== uploadId);
  }

  /**
   * Pause an upload
   * @param {string} uploadId - Upload ID
   */
  pauseUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload?.xhr) {
      upload.xhr.abort();
    }
  }

  /**
   * Get upload status
   * @param {string} uploadId - Upload ID
   * @returns {Object|null} Upload status
   */
  getUploadStatus(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload) {
      return {
        id: upload.id,
        status: upload.status,
        progress: upload.progress,
        fileName: upload.config.file.name,
      };
    }
    return null;
  }

  /**
   * Get queue information
   * @returns {Object} Queue info
   */
  getQueueInfo() {
    return {
      active: this.activeUploads.size,
      queued: this.uploadQueue.length,
      maxSimultaneous: this.maxSimultaneousUploads,
      canStartMore: this.canStartUpload(),
    };
  }

  /**
   * Generate unique upload ID
   * @returns {string} Upload ID
   */
  generateUploadId() {
    return crypto.randomUUID();
  }

  /**
   * Set maximum file size
   * @param {number} sizeInBytes - Max size in bytes
   */
  setMaxFileSize(sizeInBytes) {
    this.maxFileSize = sizeInBytes;
  }

  /**
   * Set maximum simultaneous uploads
   * @param {number} max - Max simultaneous uploads
   */
  setMaxSimultaneousUploads(max) {
    this.maxSimultaneousUploads = Math.max(1, max);
  }
}

// Singleton instance
const uploadManager = new UploadManager();

export default uploadManager;
