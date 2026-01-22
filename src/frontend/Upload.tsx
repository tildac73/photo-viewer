import React, { useState } from 'react'
import { useUpload } from './useUpload'

function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState('')
  const [altText, setAltText] = useState('')
  const { upload, isLoading, error, success } = useUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e : React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
  
    await upload({
      file,
      tags: "profile,avatar",
      altText: "User profile photo",
    });
  };

  return (
    <div>
      <h2>Upload Photo</h2>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label htmlFor="file">Choose Photo:</label>
          <input
            type="file"
            id="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <label htmlFor="tags">Tags:</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., vacation, beach"
          />
        </div>

        <div>
          <label htmlFor="altText">Alt Text:</label>
          <input
            type="text"
            id="altText"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the photo"
          />
        </div>

        <button type="submit">Upload</button>
      </form>

      <p
        style={{
          marginTop: "10px",
          color: error ? "red" : "green",
        }}
      >
        {isLoading
          ? "Uploading..."
          : error
          ? "Upload Failed"
          : success
          ? "Upload Successful"
          : ""}
      </p>

    </div>
  )
}

export default Upload
