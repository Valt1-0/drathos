// import fs from "fs";
// import path from "path";
// import crypto from "crypto";
// import os from "os";

// const STORAGE_FILE = path.join(os.homedir(), ".userData.json");
// const ENCRYPTION_KEY = crypto
//   .createHash("sha256")
//   .update("abracadabra")
//   .digest("base64")
//   .substr(0, 32);
// const IV_LENGTH = 16;

// // Fonction pour chiffrer les données
// const encrypt = (text) => {
//   const iv = crypto.randomBytes(IV_LENGTH);
//   const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
//   let encrypted = cipher.update(text, "utf8", "hex");
//   encrypted += cipher.final("hex");
//   return iv.toString("hex") + ":" + encrypted;
// };

// // Fonction pour déchiffrer les données
// const decrypt = (text) => {
//   const [iv, encrypted] = text.split(":");
//   const decipher = crypto.createDecipheriv(
//     "aes-256-cbc",
//     ENCRYPTION_KEY,
//     Buffer.from(iv, "hex"),
//   );
//   let decrypted = decipher.update(encrypted, "hex", "utf8");
//   decrypted += decipher.final("utf8");
//   return decrypted;
// };

// // Charger les données depuis le fichier
// const loadData = () => {
//   if (!fs.existsSync(STORAGE_FILE)) return {};
//   const encryptedData = fs.readFileSync(STORAGE_FILE, "utf8");
//   try {
//     const decryptedData = decrypt(encryptedData);
//     return JSON.parse(decryptedData);
//   } catch (err) {
//     console.error("Erreur lors du déchiffrement du fichier :", err);
//     return {};
//   }
// };

// // Sauvegarder les données dans le fichier
// const saveData = (data) => {
//   try {
//     const jsonData = JSON.stringify(data);
//     const encryptedData = encrypt(jsonData);
//     fs.writeFileSync(STORAGE_FILE, encryptedData, "utf8");
//   } catch (err) {
//     console.error("Erreur lors de la sauvegarde des données :", err);
//   }
// };

// // Interface de stockage
// const secureStorage = {
//   get: (key) => {
//     const data = loadData();
//     return data[key];
//   },
//   set: (key, value) => {
//     const data = loadData();
//     data[key] = value;
//     saveData(data);
//   },
//   delete: (key) => {
//     const data = loadData();
//     delete data[key];
//     saveData(data);
//   },
//   clear: () => {
//     saveData({});
//   },
// };

// export default secureStorage;