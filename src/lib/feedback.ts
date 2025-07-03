
"use server";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/config";

export async function submitFeedback(
    userId: string,
    rating: number,
    report: string,
    userAgent: string
): Promise<void> {
  if (!report.trim() || rating < 1 || rating > 5) {
    throw new Error("Invalid feedback data provided.");
  }
  
  const feedbackData = {
      userId,
      rating,
      report,
      userAgent,
      createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "feedback"), feedbackData);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw new Error("Could not submit your feedback. Please try again later.");
  }
}
