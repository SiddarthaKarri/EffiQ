import admin from "firebase-admin";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Firebase Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync(__dirname + "/serviceAccountKey.json", "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Recursively fetch and print Firestore structure along with document data.
 */
async function fetchFirestoreData(collectionPath = "", depth = 0) {
  const prefix = "  ".repeat(depth);
  const collectionRef = db.collection(collectionPath || "/");

  const snapshot = await collectionRef.listDocuments();

  if (snapshot.length === 0) {
    console.log(`${prefix}[Empty Collection]`);
    return;
  }

  for (const docRef of snapshot) {
    const docSnapshot = await docRef.get();
    const docData = docSnapshot.exists ? docSnapshot.data() : {};

    console.log(`${prefix}- 📄 ${docRef.id}`);
    // console.log(`${prefix}  📜 Data:`, JSON.stringify(docData, null, 2));

    // Check for subcollections
    const subcollections = await docRef.listCollections();
    for (const subcollectionRef of subcollections) {
      console.log(`${prefix}  📂 ${subcollectionRef.id}/`);
      await fetchFirestoreData(`${collectionPath}/${docRef.id}/${subcollectionRef.id}`, depth + 2);
    }
  }
}

// // /**
//  * Fetch and print the structure of the `services` collection.
// */
// async function fetchServicesStructure() {
//  console.log("📂 Fetching `services` collection structure...");
//  const servicesSnapshot = await db.collection("services").get();

//  for (const serviceDoc of servicesSnapshot.docs) {
//    console.log(`- 📄 Service: ${serviceDoc.id}`);
//    console.log(`  📜 Data:`, serviceDoc.data());

//    // Fetch `specificServices` sub-collection
//    const specificServicesSnapshot = await serviceDoc.ref.collection("specificServices").get();
//    for (const specificServiceDoc of specificServicesSnapshot.docs) {
//      console.log(`  📂 Specific Service: ${specificServiceDoc.id}`);
//      console.log(`    📜 Data:`, specificServiceDoc.data());

//      // Fetch `timeSlots` sub-collection
//      const timeSlotsSnapshot = await specificServiceDoc.ref.collection("timeSlots").get();
//      for (const timeSlotDoc of timeSlotsSnapshot.docs) {
//        console.log(`    📂 Time Slot: ${timeSlotDoc.id}`);
//        console.log(`      📜 Data:`, timeSlotDoc.data());
//      }
//    }
//  }
// }
/**
 * Start fetching Firestore data
 */

async function main() {
  console.log("🗄 Firestore Database Structure with Data:");
  const collections = await db.listCollections();

  for (const collection of collections) {
    console.log(`📂 ${collection.id}/`);
    await fetchFirestoreData(collection.id, 1);
  }
}

main().catch(console.error);
