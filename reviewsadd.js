// reviews-seeder.js
// This script adds sample reviews to malls in your Firestore database

import { db } from "./firebaseAdmin.js";

// Sample review templates to choose from
const reviewTemplates = [
  {
    comments: [
      "Great mall with plenty of stores to shop at. Not too crowded on weekdays.",
      "Love the variety of stores here. Food court could use more options though.",
      "Perfect place for weekend shopping. Gets busy after lunch time.",
      "Clean facilities and good selection of shops. Parking can be difficult on weekends.",
      "This mall has been my go-to for years. Staff is friendly and stores have good sales.",
      "Modern design and spacious layout make shopping here enjoyable.",
      "Great for killing time, but can get very crowded during sales periods.",
      "Nice atmosphere and decent store selection. Good place for family shopping.",
      "The mall has improved a lot over the years. Much better store selection now."
    ],
    userNames: [
      "ShopperAlex", "MallExplorer", "RetailTherapy", "BargainHunter", 
      "StyleSeeker", "CasualShopper", "FashionFinder", "ShoppingGuru",
      "MallWalker", "RetailFan", "BrandLover", "ShopaholicSam"
    ]
  }
];

// Function to generate a random date within the last 3 months
function getRandomRecentDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const randomTimestamp = threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime());
  const randomDate = new Date(randomTimestamp);
  
  return randomDate.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Function to get a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get a random element from an array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to generate random reviews for a mall
function generateRandomReviews(mallId, count) {
  const reviews = [];
  const template = reviewTemplates[0]; // Using the first template
  
  for (let i = 0; i < count; i++) {
    const rating = getRandomInt(3, 5); // Mostly positive ratings (3-5)
    
    // Occasionally add some lower ratings for realism
    const actualRating = Math.random() < 0.2 ? getRandomInt(1, 2) : rating;
    
    reviews.push({
      mallId: mallId,
      rating: actualRating,
      comment: getRandomElement(template.comments),
      userName: getRandomElement(template.userNames),
      date: getRandomRecentDate()
    });
  }
  
  return reviews;
}

// Main function to add reviews to each mall
async function addReviewsToMalls() {
  try {
    console.log("Starting to add reviews to malls...");
    
    // Get all malls from the database
    const mallsSnapshot = await db.collection("malls").get();
    
    if (mallsSnapshot.empty) {
      console.log("No malls found in the database.");
      return;
    }
    
    // Process each mall
    for (const mallDoc of mallsSnapshot.docs) {
      const mallId = mallDoc.id;
      const mallName = mallDoc.data().name || "Unknown Mall";
      
      console.log(`Adding reviews for mall: ${mallName} (${mallId})`);
      
      // Generate 5-10 random reviews for this mall
      const reviewCount = getRandomInt(5, 10);
      const reviews = generateRandomReviews(mallId, reviewCount);
      
      // Add each review to the reviews subcollection of this mall
      const reviewsRef = db.collection("malls").doc(mallId).collection("reviews");
      
      for (const review of reviews) {
        await reviewsRef.add(review);
        console.log(`Added review: "${review.comment.substring(0, 30)}..." (${review.rating}★)`);
      }
      
      console.log(`Successfully added ${reviewCount} reviews to ${mallName}`);
    }
    
    console.log("Completed adding reviews to all malls!");
  } catch (error) {
    console.error("Error adding reviews:", error);
  }
}

// Run the main function
addReviewsToMalls()
  .then(() => {
    console.log("Script execution completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script failed:", error);
    process.exit(1);
  });