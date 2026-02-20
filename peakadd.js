import admin from "firebase-admin";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(fs.readFileSync(__dirname + "/serviceAccountKey.json", "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function addMalls() {
  try {
    console.log("🚀 Adding malls...");

    const malls = [
      { name: "CMR Central", location: "Vizag", image: "https://example.com/mall3.jpg", averageWaitTime: 18, currentCrowdLevel: "High", coordinates: { latitude: 17.722, longitude: 83.319 } },
      { name: "Daspalla Shopping Mall", location: "Vizag", image: "https://example.com/mall4.jpg", averageWaitTime: 12, currentCrowdLevel: "Moderate", coordinates: { latitude: 17.713, longitude: 83.316 } },
      { name: "Vizag Central", location: "Vizag", image: "https://example.com/mall5.jpg", averageWaitTime: 20, currentCrowdLevel: "High", coordinates: { latitude: 17.735, longitude: 83.312 } },
      { name: "SR Shopping Mall", location: "Gajuwaka, Vizag", image: "https://example.com/mall6.jpg", averageWaitTime: 15, currentCrowdLevel: "Moderate", coordinates: { latitude: 17.692, longitude: 83.188 } },
      { name: "Chitralaya Mall", location: "Gajuwaka, Vizag", image: "https://example.com/mall7.jpg", averageWaitTime: 10, currentCrowdLevel: "Low", coordinates: { latitude: 17.688, longitude: 83.184 } },
      { name: "MK Gold Shopping Mall", location: "Anakapalle, Vizag", image: "https://example.com/mall8.jpg", averageWaitTime: 16, currentCrowdLevel: "High", coordinates: { latitude: 17.684, longitude: 83.012 } },
      { name: "PVP Square Mall", location: "Vijayawada, Andhra Pradesh", image: "https://example.com/mall9.jpg", averageWaitTime: 22, currentCrowdLevel: "High", coordinates: { latitude: 16.506, longitude: 80.648 } },
      { name: "Trendset Mall", location: "Guntur, Andhra Pradesh", image: "https://example.com/mall10.jpg", averageWaitTime: 14, currentCrowdLevel: "Moderate", coordinates: { latitude: 16.297, longitude: 80.448 } }
    ];

    for (const mall of malls) {
      const mallRef = db.collection("malls").doc(mall.name);
      await mallRef.set(mall);
      console.log(`✅ Mall added: ${mall.name}`);

      // Add Peak Hours Sub-collection
      const peakHours = [
        { day: "Sunday", hour: 19, crowdLevel: 9 },
        { day: "Monday", hour: 18, crowdLevel: 8 },
        { day: "Tuesday", hour: 17, crowdLevel: 7 },
        { day: "Wednesday", hour: 17, crowdLevel: 7 },
        { day: "Thursday", hour: 18, crowdLevel: 8 },
        { day: "Friday", hour: 19, crowdLevel: 9 },
        { day: "Saturday", hour: 20, crowdLevel: 10 }
      ];
      for (const peak of peakHours) {
        await mallRef.collection("peakHours").add(peak);
      }

      // Add Historical Data Sub-collection
      const historicalData = [
        { date: "2025-03-31", day: "Monday", hour: 16, visitors: 120, averageStayMinutes: 45, purchases: 90, weatherCondition: "Sunny" },
        { date: "2025-04-01", day: "Tuesday", hour: 16, visitors: 100, averageStayMinutes: 40, purchases: 85, weatherCondition: "Cloudy" }
      ];
      
      for (const history of historicalData) {
        await mallRef.collection("historicalData").add(history);
      }

      // Add Reviews Sub-collection
      const reviews = [
        { userId: "user123", rating: 5, comment: "Great place!", crowdLevelReported: "Moderate", waitTimeReported: 10, timestamp: new Date() }
      ];
      for (const review of reviews) {
        await mallRef.collection("reviews").add(review);
      }
    }

    console.log("🎉 All malls added successfully!");
  } catch (error) {
    console.error("❌ Error adding malls:", error);
  }
}

addMalls();
