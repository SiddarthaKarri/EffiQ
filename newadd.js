import { db } from "./firebaseAdmin.js";

async function addDentistService() {
  try {
    console.log("🚀 Adding Dentist service...");

    const serviceId = "medicover-hospital";
    const specificServiceName = "Dentist";
    const dates = ["2025-03-27", "2025-03-28"];
    const timeSlots = {
      "9:00 AM": { capacity: 3, booked: 0 },
      "10:00 AM": { capacity: 3, booked: 0 },
      "11:00 AM": { capacity: 3, booked: 0 },
    };

    // Reference to the service document
    const serviceRef = db.collection("services").doc(serviceId);

    // Add the new specific service
    const specificServiceRef = serviceRef.collection("specificServices").doc(specificServiceName);
    await specificServiceRef.set({
      name: specificServiceName,
      tokenFee: 100,
      availableDates: dates,
    });

    // Add the time slots for each date
    for (const date of dates) {
      const timeSlotRef = specificServiceRef.collection("timeSlots").doc(date);
      await timeSlotRef.set(timeSlots);
    }

    console.log(`✅ Dentist service added successfully with dates ${dates.join(", ")} and time slots.`);
  } catch (error) {
    console.error("❌ Error adding Dentist service:", error);
  }
}

addDentistService();