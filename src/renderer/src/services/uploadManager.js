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

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  canStartUpload() {
    return this.activeUploads.size < this.maxSimultaneousUploads;
  }

  async queueUpload(uploadConfig) {
    const uploadId = this.generateUploadId();

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

  executeUpload(upload) {
    const { config } = upload;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      upload.xhr = xhr;

      const formData = new FormData();
      formData.append("zipFile", config.file);
      formData.append("version", config.version);
      formData.append("isPublic", config.isPublic);

      if (config.multiplayer) {
        formData.append("multiplayer", JSON.stringify(config.multiplayer));
      }

      formData.append("igdbId", config.igdbId);

      if (config.executableName) {
        formData.append("executableName", config.executableName);
      }

      xhr.open("POST", config.url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${config.token}`);

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

  handleUploadComplete(upload, result) {
    upload.status = "completed";
    this.activeUploads.delete(upload.id);
    upload.resolve(result);

    this.processQueue();
  }

  handleUploadError(upload, error) {
    upload.status = "error";
    upload.error = error;
    this.activeUploads.delete(upload.id);
    upload.reject(error);

    this.processQueue();
  }

  processQueue() {
    while (this.canStartUpload() && this.uploadQueue.length > 0) {
      const nextUpload = this.uploadQueue.shift();
      this.startUpload(nextUpload);
    }
  }

  cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.xhr) {
      upload.xhr.abort();
    }

    this.uploadQueue = this.uploadQueue.filter((u) => u.id !== uploadId);
  }

  pauseUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload?.xhr) {
      upload.xhr.abort();
    }
  }

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

  getQueueInfo() {
    return {
      active: this.activeUploads.size,
      queued: this.uploadQueue.length,
      maxSimultaneous: this.maxSimultaneousUploads,
      canStartMore: this.canStartUpload(),
    };
  }

  generateUploadId() {
    return crypto.randomUUID();
  }

  setMaxFileSize(sizeInBytes) {
    this.maxFileSize = sizeInBytes;
  }

  setMaxSimultaneousUploads(max) {
    this.maxSimultaneousUploads = Math.max(1, max);
  }
}

const uploadManager = new UploadManager();

export default uploadManager;
