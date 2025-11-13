/**
 * Upload Manager Service
 * Handles file upload optimization including:
 * - File size verification
 * - Upload queue management (max simultaneous uploads)
 * - Resumable uploads support
 */

class UploadManager {
  constructor() {
    this.maxSimultaneousUploads = 2; // Max concurrent uploads
    this.activeUploads = new Map(); // Currently uploading files
    this.uploadQueue = []; // Pending uploads
    this.maxFileSize = 200 * 1024 * 1024 * 1024; // 200 GB default max
    this.minFileSize = 1024; // 1 KB minimum
    this.resumableUploads = new Map(); // Store resumable upload data
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
        error: "No file provided",
      };
    }

    if (file.size < this.minFileSize) {
      return {
        valid: false,
        error: `File is too small. Minimum size is ${this.formatBytes(
          this.minFileSize
        )}`,
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File is too large. Maximum size is ${this.formatBytes(
          this.maxFileSize
        )}`,
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
    const { config } = upload;
    upload.status = "uploading";
    this.activeUploads.set(upload.id, upload);

    try {
      // Check for resumable upload
      const resumeData = this.resumableUploads.get(config.file.name);
      if (resumeData && config.resumable) {
        // Resume upload
        const result = await this.resumeUpload(upload, resumeData);
        this.handleUploadComplete(upload, result);
      } else {
        // New upload
        const result = await this.executeUpload(upload);
        this.handleUploadComplete(upload, result);
      }
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

            // Save progress for resumable uploads
            if (config.resumable) {
              this.saveUploadProgress(config.file.name, {
                loaded: event.loaded,
                total: event.total,
                lastModified: config.file.lastModified,
                uploadId: upload.id,
              });
            }

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

            // Clear resumable data on success
            if (config.resumable) {
              this.clearUploadProgress(config.file.name);
            }

            resolve(responseData);
          } catch (err) {
            reject(new Error("Invalid server response"));
          }
        } else {
          reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.onabort = () => {
        // Save state for resume
        if (config.resumable) {
          reject(new Error("Upload paused"));
        } else {
          reject(new Error("Upload cancelled"));
        }
      };

      xhr.send(formData);
    });
  }

  /**
   * Resume an upload
   * @param {Object} upload - Upload object
   * @param {Object} resumeData - Resume data
   * @returns {Promise} Upload result
   */
  async resumeUpload(upload, resumeData) {
    // For now, restart the upload (full resumable upload requires server support)
    // This clears the saved progress and starts fresh
    console.log(
      "[UploadManager] Resuming upload from",
      resumeData.loaded,
      "bytes"
    );
    return this.executeUpload(upload);
  }

  /**
   * Save upload progress for resumable uploads
   * @param {string} fileName - File name
   * @param {Object} progressData - Progress data
   */
  saveUploadProgress(fileName, progressData) {
    this.resumableUploads.set(fileName, {
      ...progressData,
      savedAt: Date.now(),
    });
  }

  /**
   * Clear upload progress
   * @param {string} fileName - File name
   */
  clearUploadProgress(fileName) {
    this.resumableUploads.delete(fileName);
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
   * Pause an upload (for resumable uploads)
   * @param {string} uploadId - Upload ID
   */
  pauseUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.xhr && upload.config.resumable) {
      upload.xhr.abort();
      upload.status = "paused";
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
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
