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

async function addSevenHillsService() {
  try {
    console.log("🚀 Adding Seven Hills Hospital service...");

    const serviceId = "seven-hills-hospital";
    const specificServiceName = "Dentist";
    const dates = ["2025-03-27", "2025-03-28"];
    const timeSlots = {
      "9:00 AM": { capacity: 3, booked: 3 },
      "10:00 AM": { capacity: 3, booked: 1 },
      "11:00 AM": { capacity: 3, booked: 1 },
    };

    // Hospital details
    const hospitalRef = db.collection("services").doc(serviceId);
    await hospitalRef.set({
      name: "Seven Hills Hospital",
      location: {
        _latitude: 17.743812,
        _longitude: 83.303128,
      },
      category: "Hospitals",
      description: "Renowned multi-specialty hospital with advanced healthcare facilities",
    });

    // Specific Service: Dentist
    const specificServiceRef = hospitalRef.collection("specificServices").doc(specificServiceName);
    await specificServiceRef.set({
      name: specificServiceName,
      tokenFee: 100,
      availableDates: dates,
    });

    // Add time slots
    for (const date of dates) {
      const timeSlotRef = specificServiceRef.collection("timeSlots").doc(date);
      await timeSlotRef.set(timeSlots);
    }

    // Dummy Bookings
    const bookingsRef = specificServiceRef.collection("bookings");

    const dummyBookings = [
      {
        userId: "USER123",
        category: "Hospitals",
        service: "Seven Hills Hospital",
        specificService: "Dentist",
        date: "2025-03-27",
        time: "9:00 AM",
        originalTimeSlot: "9:00 AM",
        wasRescheduled: false,
        tokenFee: 100,
        status: "Confirmed",
        bookingDate: {
          _seconds: 1742959401,
          _nanoseconds: 469000000,
        },
      },
      {
        userId: "USER456",
        category: "Hospitals",
        service: "Seven Hills Hospital",
        specificService: "Dentist",
        date: "2025-03-27",
        time: "10:00 AM",
        originalTimeSlot: "10:00 AM",
        wasRescheduled: false,
        tokenFee: 100,
        status: "Confirmed",
        bookingDate: {
          _seconds: 1742902174,
          _nanoseconds: 407000000,
        },
      },
    ];

    // Add bookings to Firestore
    for (const booking of dummyBookings) {
      await bookingsRef.add(booking);
    }

    console.log(`✅ Seven Hills Hospital service added successfully with dates ${dates.join(", ")} and bookings.`);
  } catch (error) {
    console.error("❌ Error adding Seven Hills Hospital service:", error);
  }
}

addSevenHillsService();