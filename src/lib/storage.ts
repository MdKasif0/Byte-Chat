"use server";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase/config";
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(
  file: File,
  path: string
): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  
  // Create a unique filename to avoid overwrites
  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const storageRef = ref(storage, `${path}/${uniqueFileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed.");
  }
}
