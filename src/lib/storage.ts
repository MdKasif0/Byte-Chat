
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
import type { Database } from "./supabase/database.types";

const BUCKET_NAME = 'chat-files';

export async function uploadFile(
  file: File,
  path: string
): Promise<string> {
  const supabase = createServerActionClient<Database>({ cookies });

  if (!file) {
    throw new Error("No file provided for upload.");
  }
  
  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${path}/${uniqueFileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed.");
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  
  return publicUrl;
}
