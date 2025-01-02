// storage.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

let STORAGE_FILE = ""; // Sera défini dynamiquement

const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update("abracadabra")
  .digest("base64")
  .substr(0, 32);
const IV_LENGTH = 16;

// Définir le fichier de stockage dynamiquement
export const initializeStorage = (userDataPath) => {
  STORAGE_FILE = path.join(userDataPath, "userData.json");
  console.log("Fichier de stockage initialisé :", STORAGE_FILE);
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text) => {
  const [iv, encrypted] = text.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex"),
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const loadData = () => {
  if (!fs.existsSync(STORAGE_FILE)) return {};
  const encryptedData = fs.readFileSync(STORAGE_FILE, "utf8");
  console.log("Données chiffrées chargées :", encryptedData);
  console.log(STORAGE_FILE);

  try {
    const decryptedData = decrypt(encryptedData);
    return JSON.parse(decryptedData);
  } catch (err) {
    console.error("Error during decryption:", err);
    return {};
  }
};

const saveData = (data) => {
  try {
    const jsonData = JSON.stringify(data);
    const encryptedData = encrypt(jsonData);
    fs.writeFileSync(STORAGE_FILE, encryptedData, "utf8");
  } catch (err) {
    console.error("Error during data saving:", err);
  }
};

// Add clear method to clear all data
const clearData = () => {
  try {
    saveData({}); // Overwrite the data with an empty object
  } catch (err) {
    console.error("Error during clearing data:", err);
  }
};

export { loadData, saveData, clearData };
