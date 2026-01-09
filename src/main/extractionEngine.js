// src/main/extractionEngine.js - Multi-format extraction engine 🗜️
// Supports: ZIP, TAR, TAR.GZ, TGZ, 7Z, RAR

import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import tar from "tar-stream";
import { createGunzip } from "zlib";
import Seven from "node-7z";
import sevenBin from "7zip-bin";

/**
 * 🗜️ ExtractionEngine - Unified extraction for multiple archive formats
 */
export class ExtractionEngine {
  constructor() {
    this.supportedFormats = [".zip", ".tar", ".tar.gz", ".tgz", ".7z", ".rar"];

    // Get the path to embedded 7z binary
    let binPath = sevenBin.path7za;

    // En production, remplacer app.asar par app.asar.unpacked
    if (binPath.includes('app.asar') && !binPath.includes('app.asar.unpacked')) {
      binPath = binPath.replace('app.asar', 'app.asar.unpacked');
    }

    this.sevenZipPath = binPath;

    console.log(
      `[ExtractionEngine] ✅ Initialized with support for: ${this.supportedFormats.join(", ")}`
    );
    console.log(`[ExtractionEngine] 🔧 7-Zip binary: ${this.sevenZipPath}`);
  }

  /**
   * 🎯 MAIN METHOD - Extract any supported archive format
   * @param {string} archivePath - Path to the archive file
   * @param {string} extractPath - Destination directory
   * @param {Function} onProgress - Progress callback (progress, extractedFiles, totalFiles, currentFile)
   * @returns {Promise<string>} - Path to extracted content
   */
  async extract(archivePath, extractPath, onProgress = null) {
    const fileExtension = this.getFileExtension(archivePath);

    console.log(
      `[ExtractionEngine] 📦 Extracting ${fileExtension} archive: ${path.basename(archivePath)}`
    );

    // Validate format
    if (!this.isSupported(fileExtension)) {
      throw new Error(
        `Format non supporté: ${fileExtension}. Formats supportés: ${this.supportedFormats.join(", ")}`
      );
    }

    // Create extraction directory
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    // Route to appropriate extractor
    switch (fileExtension) {
      case ".zip":
        return await this.extractZip(archivePath, extractPath, onProgress);

      case ".tar":
        return await this.extractTar(archivePath, extractPath, onProgress);

      case ".tar.gz":
      case ".tgz":
        return await this.extractTarGz(archivePath, extractPath, onProgress);

      case ".7z":
      case ".rar":
        return await this.extract7z(archivePath, extractPath, onProgress);

      default:
        throw new Error(`Extracteur non implémenté pour: ${fileExtension}`);
    }
  }

  /**
   * 📂 Extract ZIP archives (using unzipper)
   */
  async extractZip(archivePath, extractPath, onProgress) {
    console.log(`[ExtractionEngine] 📂 Extracting ZIP: ${archivePath}`);

    const directory = await unzipper.Open.file(archivePath);
    const totalFiles = directory.files.length;
    let extractedCount = 0;

    console.log(
      `[ExtractionEngine] 📊 ZIP contains ${totalFiles} files/folders`
    );

    if (onProgress) {
      onProgress(0, 0, totalFiles, "Starting extraction...");
    }

    for (const entry of directory.files) {
      const outputPath = path.join(extractPath, entry.path);

      try {
        if (entry.type === "Directory") {
          await fs.promises.mkdir(outputPath, { recursive: true });
        } else {
          await fs.promises.mkdir(path.dirname(outputPath), {
            recursive: true,
          });

          await new Promise((resolve, reject) => {
            let resolved = false;
            const writeStream = fs.createWriteStream(outputPath);

            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                writeStream.destroy(); // ✅ Cleanup
                reject(new Error(`Timeout lors de l'extraction de ${entry.path}`));
              }
            }, 30000);

            const cleanup = () => {
              clearTimeout(timeout);
            };

            entry
              .stream()
              .pipe(writeStream)
              .on("finish", () => {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  resolve();
                }
              })
              .on("error", (error) => {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  writeStream.destroy();
                  reject(error);
                }
              })
              .on("close", () => {
                // ✅ FIX: Si le stream se ferme sans finish/error
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  resolve();
                }
              });
          });
        }

        extractedCount++;
        const progress = Math.round((extractedCount / totalFiles) * 100);

        if (
          onProgress &&
          (extractedCount % 10 === 0 ||
            progress % 5 === 0 ||
            extractedCount === totalFiles)
        ) {
          onProgress(progress, extractedCount, totalFiles, entry.path);
        }
      } catch (error) {
        console.warn(
          `[ExtractionEngine] ⚠️ Error extracting ${entry.path}:`,
          error.message
        );
        extractedCount++;
      }
    }

    console.log(
      `[ExtractionEngine] ✅ ZIP extraction complete: ${extractedCount}/${totalFiles} files`
    );
    return extractPath;
  }

  /**
   * 📦 Extract TAR archives (using tar-stream)
   */
  async extractTar(archivePath, extractPath, onProgress) {
    console.log(`[ExtractionEngine] 📦 Extracting TAR: ${archivePath}`);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let extractedCount = 0;
      let totalFiles = 0; // ✅ FIX: Compté pendant l'extraction au lieu d'une passe séparée

      // Single pass: extract and count simultaneously
      extract.on("entry", async (header, stream, next) => {
        totalFiles++; // Compte au fur et à mesure
          const outputPath = path.join(extractPath, header.name);

          try {
            if (header.type === "directory") {
              await fs.promises.mkdir(outputPath, { recursive: true });
              stream.resume();
              next();
            } else if (header.type === "file") {
              await fs.promises.mkdir(path.dirname(outputPath), {
                recursive: true,
              });

              const writeStream = fs.createWriteStream(outputPath);
              stream.pipe(writeStream);

              writeStream.on("finish", () => {
                extractedCount++;
                const progress = Math.round(
                  (extractedCount / totalFiles) * 100
                );

                if (
                  onProgress &&
                  (extractedCount % 10 === 0 ||
                    progress % 5 === 0 ||
                    extractedCount === totalFiles)
                ) {
                  onProgress(
                    progress,
                    extractedCount,
                    totalFiles,
                    header.name
                  );
                }

                next();
              });

              writeStream.on("error", (err) => {
                console.warn(
                  `[ExtractionEngine] ⚠️ Error writing ${header.name}:`,
                  err.message
                );
                extractedCount++;
                next();
              });
            } else {
              stream.resume();
              next();
            }
          } catch (error) {
            console.warn(
              `[ExtractionEngine] ⚠️ Error extracting ${header.name}:`,
              error.message
            );
            stream.resume();
            extractedCount++;
            next();
          }
        });

        extract.on("finish", () => {
          console.log(
            `[ExtractionEngine] ✅ TAR extraction complete: ${extractedCount}/${totalFiles} files`
          );
          resolve(extractPath);
        });

        extract.on("error", (err) => {
          reject(new Error(`TAR extraction failed: ${err.message}`));
        });

      const readStream = fs.createReadStream(archivePath);
      readStream.pipe(extract);

      readStream.on("error", (err) => {
        reject(new Error(`TAR read failed: ${err.message}`));
      });
    });
  }

  /**
   * 🗜️ Extract TAR.GZ/TGZ archives (using tar-stream + zlib)
   */
  async extractTarGz(archivePath, extractPath, onProgress) {
    console.log(`[ExtractionEngine] 🗜️ Extracting TAR.GZ: ${archivePath}`);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let extractedCount = 0;
      let totalFiles = 0;

      // First pass: count total files (with gunzip)
      const countStream = tar.extract();
      countStream.on("entry", (header, stream, next) => {
        totalFiles++;
        stream.on("end", next);
        stream.resume();
      });

      const countReadStream = fs
        .createReadStream(archivePath)
        .pipe(createGunzip());
      countReadStream.pipe(countStream);

      countStream.on("finish", () => {
        console.log(
          `[ExtractionEngine] 📊 TAR.GZ contains ${totalFiles} entries`
        );

        if (onProgress) {
          onProgress(0, 0, totalFiles, "Starting extraction...");
        }

        // Second pass: extract files
        extract.on("entry", async (header, stream, next) => {
          const outputPath = path.join(extractPath, header.name);

          try {
            if (header.type === "directory") {
              await fs.promises.mkdir(outputPath, { recursive: true });
              stream.resume();
              next();
            } else if (header.type === "file") {
              await fs.promises.mkdir(path.dirname(outputPath), {
                recursive: true,
              });

              const writeStream = fs.createWriteStream(outputPath);
              stream.pipe(writeStream);

              writeStream.on("finish", () => {
                extractedCount++;
                const progress = Math.round(
                  (extractedCount / totalFiles) * 100
                );

                if (
                  onProgress &&
                  (extractedCount % 10 === 0 ||
                    progress % 5 === 0 ||
                    extractedCount === totalFiles)
                ) {
                  onProgress(
                    progress,
                    extractedCount,
                    totalFiles,
                    header.name
                  );
                }

                next();
              });

              writeStream.on("error", (err) => {
                console.warn(
                  `[ExtractionEngine] ⚠️ Error writing ${header.name}:`,
                  err.message
                );
                extractedCount++;
                next();
              });
            } else {
              stream.resume();
              next();
            }
          } catch (error) {
            console.warn(
              `[ExtractionEngine] ⚠️ Error extracting ${header.name}:`,
              error.message
            );
            stream.resume();
            extractedCount++;
            next();
          }
        });

        extract.on("finish", () => {
          console.log(
            `[ExtractionEngine] ✅ TAR.GZ extraction complete: ${extractedCount}/${totalFiles} files`
          );
          resolve(extractPath);
        });

        extract.on("error", (err) => {
          reject(new Error(`TAR.GZ extraction failed: ${err.message}`));
        });

        const readStream = fs
          .createReadStream(archivePath)
          .pipe(createGunzip());
        readStream.pipe(extract);
      });

      countStream.on("error", (err) => {
        reject(new Error(`TAR.GZ analysis failed: ${err.message}`));
      });
    });
  }

  /**
   * 📦 Extract 7Z archives (using node-7z with better error handling)
   */
  async extract7z(archivePath, extractPath, onProgress) {
    console.log(`[ExtractionEngine] 📦 Extracting 7Z: ${archivePath}`);

    if (onProgress) {
      onProgress(0, 0, 0, "Starting 7Z extraction...");
    }

    try {
      // Verify file exists and is readable
      if (!fs.existsSync(archivePath)) {
        throw new Error(`Archive file not found: ${archivePath}`);
      }

      const stats = fs.statSync(archivePath);
      if (stats.size === 0) {
        throw new Error(`Archive file is empty: ${archivePath}`);
      }

      console.log(
        `[ExtractionEngine] 📊 7Z file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`
      );

      // Use embedded 7z binary from 7zip-bin package
      const sevenZip = Seven.extractFull(archivePath, extractPath, {
        $bin: this.sevenZipPath, // Use embedded binary (like GameVault approach)
        $progress: true,
        recursive: true,
      });

      let extractedCount = 0;
      let totalFiles = 0;
      let lastProgress = 0;

      sevenZip.on("progress", (progress) => {
        extractedCount++;
        const currentProgress = Math.round(progress.percent || 0);

        // Only send updates when progress changes significantly
        if (
          currentProgress !== lastProgress ||
          extractedCount % 10 === 0 ||
          currentProgress === 100
        ) {
          lastProgress = currentProgress;
          if (onProgress) {
            onProgress(
              currentProgress,
              extractedCount,
              totalFiles || extractedCount,
              progress.fileCount
                ? `File ${progress.fileCount}`
                : "Extracting..."
            );
          }
        }
      });

      sevenZip.on("data", (data) => {
        // Count files as they're discovered
        if (data.file) {
          totalFiles++;
        }
      });

      sevenZip.on("error", (err) => {
        console.error(`[ExtractionEngine] ❌ 7Z error:`, err);
      });

      await new Promise((resolve, reject) => {
        sevenZip.on("end", () => {
          console.log(
            `[ExtractionEngine] ✅ 7Z extraction complete: ${extractedCount} operations`
          );

          // Final progress update
          if (onProgress) {
            onProgress(100, extractedCount, extractedCount, "Complete!");
          }

          resolve();
        });

        sevenZip.on("error", (err) => {
          // More detailed error message
          const errorMsg = err.message || err.toString();
          console.error(
            `[ExtractionEngine] ❌ 7Z extraction failed:`,
            errorMsg
          );

          if (errorMsg.includes("FILE_ENDED")) {
            reject(
              new Error(
                `Archive incomplet ou corrompu. Le fichier 7z semble endommagé ou n'a pas été complètement téléchargé.`
              )
            );
          } else if (errorMsg.includes("Cannot open")) {
            reject(
              new Error(
                `Impossible d'ouvrir l'archive 7z. Vérifiez que le fichier n'est pas corrompu.`
              )
            );
          } else {
            reject(
              new Error(
                `Erreur d'extraction 7Z: ${errorMsg}. Essayez de re-télécharger le fichier.`
              )
            );
          }
        });
      });

      return extractPath;
    } catch (error) {
      console.error(`[ExtractionEngine] ❌ 7Z extraction error:`, error);
      throw error;
    }
  }

  /**
   * 🔍 Get file extension (handles .tar.gz specially)
   */
  getFileExtension(filePath) {
    const fileName = path.basename(filePath).toLowerCase();

    // Check for double extensions
    if (fileName.endsWith(".tar.gz")) {
      return ".tar.gz";
    }
    if (fileName.endsWith(".tgz")) {
      return ".tgz";
    }

    // Standard extension
    return path.extname(filePath).toLowerCase();
  }

  /**
   * ✅ Check if format is supported
   */
  isSupported(extension) {
    return this.supportedFormats.includes(extension.toLowerCase());
  }

  /**
   * 📋 Get list of supported formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }
}

// Singleton instance
export const extractionEngine = new ExtractionEngine();
