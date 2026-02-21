import { db } from "../lib/firebaseAdmin.js";

const services = [
//   { 
//     name: "Apollo Hospitals", 
//     location: { latitude: 17.7250, longitude: 83.3150 },
//     category: "Hospitals",
//     description: "Leading multi-specialty hospital in Vizag.",
//     adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
//     specificServices: [
//       { name: "Cardiology", tokenFee: 200, availableDates: ["2025-03-31", "2025-04-07"] },
//       { name: "Neurology", tokenFee: 250, availableDates: ["2025-04-01", "2025-04-06"] },
//       { name: "Orthopedics", tokenFee: 180, availableDates: ["2025-04-02", "2025-04-05"] },
//       { name: "Dermatology", tokenFee: 150, availableDates: ["2025-04-03", "2025-04-04"] }
//     ]
//   },
//   { 
//     name: "OMNI RK Multi Specialty Hospital", 
//     location: { latitude: 17.7385, longitude: 83.3181 },
//     category: "Hospitals",
//     description: "Advanced healthcare services.",
//     adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
//     specificServices: [
//       { name: "Pediatrics", tokenFee: 170, availableDates: ["2025-03-31", "2025-04-07"] },
//       { name: "ENT", tokenFee: 190, availableDates: ["2025-04-02", "2025-04-05"] }
//     ]
//   },
//   { 
//     name: "CARE Hospitals", 
//     location: { latitude: 17.7274, longitude: 83.3201 },
//     category: "Hospitals",
//     description: "Trusted hospital with expert doctors.",
//     adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
//     specificServices: [
//       { name: "Oncology", tokenFee: 300, availableDates: ["2025-04-01", "2025-04-06"] },
//       { name: "Gastroenterology", tokenFee: 220, availableDates: ["2025-04-03", "2025-04-07"] }
//     ]
//   },
//   { 
//     name: "Q1 Hospitals", 
//     location: { latitude: 17.7391, longitude: 83.3254 },
//     category: "Hospitals",
//     description: "Comprehensive patient care.",
//     adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
//     specificServices: [
//       { name: "Urology", tokenFee: 210, availableDates: ["2025-03-31", "2025-04-05"] },
//       { name: "Psychiatry", tokenFee: 230, availableDates: ["2025-04-02", "2025-04-06"] }
//     ]
//   },
//   { 
//     name: "WelcomCafe Oceanic Restaurant", 
//     location: { latitude: 17.7292, longitude: 83.3149 },
//     category: "Restaurant",
//     description: "Fine dining with ocean views.",
//     adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
//     specificServices: [
//       { name: "Table Booking", tokenFee: 50, availableDates: ["2025-03-31", "2025-04-07"] }
//     ]
//   }
    { 
      name: "Hotel Jas Vizag", 
      location: { latitude: 17.7210, longitude: 83.3192 },
      category: "Hotel",
      description: "Comfortable stay with premium services.",
      adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
      specificServices: [
        { name: "Table Booking", tokenFee: 60, availableDates: ["2025-04-01", "2025-04-06"] }
      ]
    },
    { 
      name: "The Food Junction", 
      location: { latitude: 17.7288, longitude: 83.3105 },
      category: "Restaurant",
      description: "Casual dining with delicious multi-cuisine options.",
      adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
      specificServices: [
        { name: "Table Booking", tokenFee: 40, availableDates: ["2025-04-02", "2025-04-07"] }
      ]
    },
    { 
      name: "The Eatery", 
      location: { latitude: 17.7235, longitude: 83.3178 },
      category: "Restaurant",
      description: "A cozy spot for delicious food and great ambiance.",
      adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
      specificServices: [
        { name: "Table Booking", tokenFee: 50, availableDates: ["2025-04-03", "2025-04-08"] }
      ]
    },
    { 
      name: "Horizon Restaurant", 
      location: { latitude: 17.7261, longitude: 83.3127 },
      category: "Restaurant",
      description: "Fine dining with a rooftop view of the city.",
      adminId: ["PYcE6A84WRgtbGPkYa0pPtrDHKD3"],
      specificServices: [
        { name: "Table Booking", tokenFee: 70, availableDates: ["2025-04-04", "2025-04-09"] }
      ]
    }
  

];

async function addServices() {
  try {
    console.log("🚀 Adding services...");

    for (const service of services) {
      const serviceRef = db.collection("services").doc(service.name);
      await serviceRef.set({
        name: service.name,
        location: service.location,
        category: service.category,
        description: service.description,
        adminId: service.adminId
      });

      for (const specificService of service.specificServices) {
        const specificServiceRef = serviceRef.collection("specificServices").doc(specificService.name);
        await specificServiceRef.set({
          name: specificService.name,
          tokenFee: specificService.tokenFee,
          availableDates: specificService.availableDates
        });

        for (const date of specificService.availableDates) {
          const timeSlotRef = specificServiceRef.collection("timeSlots").doc(date);
          await timeSlotRef.set({
            "9:00 AM": { capacity: 3, booked: 0 },
            "10:00 AM": { capacity: 3, booked: 0 },
            "11:00 AM": { capacity: 3, booked: 0 }
          });
        }

        // Add a dummy booking to the `bookings` sub-collection
        const bookingsRef = specificServiceRef.collection("bookings");
        await bookingsRef.add({
          userId: "PYcE6A84WRgtbGPkYa0pPtrDHKD3",
          date: specificService.availableDates[0], // Use the first available date
          time: "9:00 AM", // Use a default time slot
          originalTimeSlot: "9:00 AM",
          tokenFee: specificService.tokenFee,
          status: "Confirmed",
          bookingDate: new Date(), // Fixed timestamp
          wasRescheduled: false,
          category: "Hospitals"
        });
      }

      console.log(`✅ Service added: ${service.name}`);
    }

    console.log("🎉 All services added successfully!");
  } catch (error) {
    console.error("❌ Error adding services:", error);
  }
}

addServices();
