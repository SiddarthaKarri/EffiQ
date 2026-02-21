import "dotenv/config";
import admin from "firebase-admin";
import fs from "fs";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

const getServiceAccount = () => {
  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  if (serviceAccountPath) {
    const fileContent = fs.readFileSync(serviceAccountPath, "utf8");
    return JSON.parse(fileContent);
  }

  throw new Error(
    "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in your environment."
  );
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

const db = admin.firestore();

export { admin, db };
