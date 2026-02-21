import { db } from "../lib/firebaseAdmin.js";

// 🔹 Function to copy user booking history to services
const copyBookingsToServices = async () => {
  try {
    console.log("Fetching users...");
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      if (!userData.bookingHistory || userData.bookingHistory.length === 0) {
        console.log(`No bookings found for user: ${userId}`);
        continue;
      }

      console.log(`Processing bookings for user: ${userId}`);

      for (const booking of userData.bookingHistory) {
        const { service, specificService, ...bookingData } = booking;

        // 🔹 Get service document
        const serviceQuery = await db
          .collection("services")
          .where("name", "==", service)
          .get();

        if (serviceQuery.empty) {
          console.log(`Service "${service}" not found, skipping...`);
          continue;
        }

        const serviceId = serviceQuery.docs[0].id;

        // 🔹 Reference for specific service bookings
        const bookingRef = db
          .collection("services")
          .doc(serviceId)
          .collection("specificServices")
          .doc(specificService)
          .collection("bookings");

        // 🔹 Add the booking to Firestore
        await bookingRef.add({
          userId,
          ...bookingData,
        });

        console.log(
          `✅ Booking copied for ${specificService} under ${service} (User: ${userId})`
        );
      }
    }
    console.log("✅ All bookings copied successfully!");
  } catch (error) {
    console.error("❌ Error copying bookings:", error);
  }
};

// 🔹 Run the function
copyBookingsToServices();
