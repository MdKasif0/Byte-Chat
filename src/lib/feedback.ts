
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "./supabase/database.types";

export async function submitFeedback(
    userId: string,
    rating: number,
    report: string,
    userAgent: string
): Promise<void> {
  const supabase = createServerActionClient<Database>({ cookies });

  if (!report.trim() || rating < 1 || rating > 5) {
    throw new Error("Invalid feedback data provided.");
  }
  
  const feedbackData = {
      user_id: userId,
      rating,
      report,
      user_agent: userAgent,
  };

  const { error } = await supabase.from("feedback").insert(feedbackData);

  if (error) {
    console.error("Error submitting feedback:", error);
    throw new Error("Could not submit your feedback. Please try again later.");
  }
}
