import { admin, db } from "../lib/firebaseAdmin.js";

async function migrateFirestore() {
  try {
    console.log("🚀 Starting Firestore migration...");

    /** ================================
     *  1️⃣ USERS COLLECTION
     *  ================================= */
    const users = [
      {
        userId: "user123",
        email: "user@example.com",
        displayName: "John Doe",
        balance: 500,
        phoneNumber: "+911234567890",
        isAdmin: false,
        bookingHistory: [],
      },
    ];

    for (const user of users) {
      const userRef = db.collection("users").doc(user.userId);
      await userRef.set(user, { merge: true });
      console.log(`✅ User ${user.displayName} added.`);
    }

    /** ================================
     *  2️⃣ SERVICES COLLECTION
     *  ================================= */
    const services = [
      {
        serviceId: "medicover-hospital",
        name: "Medicover Hospital",
        category: "Hospitals",
        description: "Top multi-specialty hospital",
        specificServices: {
          "Heart Specialist": {
            tokenFee: 100,
            availableDates: ["2025-03-15", "2025-03-17"],
            timeSlots: {
              "2025-03-15": {
                "10:00 AM": { capacity: 3, booked: 0 },
                "11:00 AM": { capacity: 3, booked: 0 },
                "12:00 PM": { capacity: 3, booked: 0 },
              },
              "2025-03-17": {
                "10:00 AM": { capacity: 3, booked: 0 },
                "02:00 PM": { capacity: 3, booked: 0 },
                "06:30 PM": { capacity: 3, booked: 0 },
              }
            }
          }
        }
      }
    ];

    for (const service of services) {
      const serviceRef = db.collection("services").doc(service.serviceId);
      await serviceRef.set(
        {
          name: service.name,
          category: service.category,
          description: service.description,
        },
        { merge: true }
      );

      // Add Specific Services
      for (const [specificService, details] of Object.entries(service.specificServices)) {
        const specificRef = serviceRef.collection("specificServices").doc(specificService);
        await specificRef.set(
          {
            name: specificService,
            tokenFee: details.tokenFee,
            availableDates: details.availableDates,
          },
          { merge: true }
        );

        // Add Time Slots
        for (const [date, slots] of Object.entries(details.timeSlots)) {
          const timeSlotRef = specificRef.collection("timeSlots").doc(date);
          await timeSlotRef.set(slots, { merge: true });
        }
      }

      console.log(`✅ Service ${service.name} added.`);
    }

    /** ================================
     *  3️⃣ BOOKINGS COLLECTION
     *  ================================= */
    const bookings = [
      {
        userId: "user123",
        category: "Hospitals",
        service: "Medicover Hospital",
        specificService: "Heart Specialist",
        date: "2025-03-15",
        time: "10:00 AM",
        tokenFee: 100,
        status: "Confirmed",
        bookingDate: admin.firestore.Timestamp.now(),
      },
    ];

    for (const booking of bookings) {
      // Check Slot Availability
      const serviceRef = db.collection("services").doc("medicover-hospital")
        .collection("specificServices").doc(booking.specificService)
        .collection("timeSlots").doc(booking.date);

      const slotSnap = await serviceRef.get();
      if (slotSnap.exists) {
        const slotData = slotSnap.data();
        if (slotData[booking.time].booked >= slotData[booking.time].capacity) {
          console.log(`⚠️ Slot full for ${booking.time} on ${booking.date}, auto-rescheduling...`);
          continue;
        }
      }

      const bookingRef = db.collection("bookings").doc();
      await bookingRef.set(booking);
      console.log(`✅ Booking for ${booking.service} at ${booking.time} confirmed.`);

      // Update User's Booking History
      const userRef = db.collection("users").doc(booking.userId);
      await userRef.update({
        bookingHistory: admin.firestore.FieldValue.arrayUnion(booking),
        balance: admin.firestore.FieldValue.increment(-booking.tokenFee),
      });

      // Update Slot Availability
      await serviceRef.update({
        [`${booking.time}.booked`]: admin.firestore.FieldValue.increment(1),
      });

      console.log(`🔄 Updated slot booking for ${booking.time} on ${booking.date}.`);
    }

    console.log("✅ Firestore migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateFirestore();
