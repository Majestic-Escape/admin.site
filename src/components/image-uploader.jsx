"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImageUploader() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files).slice(0, 5);
    setFiles(selectedFiles);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log(result);
        }
        router.refresh();
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        max={5}
      />
      {uploading && <p>Uploading...</p>}
      <div>
        {files.map((file, index) => (
          <p key={index}>{file.name}</p>
        ))}
      </div>
    </div>
  );
}
