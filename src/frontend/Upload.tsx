import React, { useState } from 'react'

function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState('')
  const [altText, setAltText] = useState('')
  const [status, setStatus] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setStatus('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tags', tags)
    formData.append('alt_text', altText)

    try {
      setStatus('Uploading...')
      const response = await fetch("/api/photos/presign?content_type=image/jpeg")

      if (!response.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const data = await response.json();

      const upload_response = await fetch(data.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!upload_response.ok) {
        throw new Error("Upload failed");
      }

      if (response.ok) {
        const data = await response.json()
        setStatus(`Success! Photo ID: ${data.id}`)
        setFile(null)
        setTags('')
        setAltText('')
      } else {
        setStatus(`Error: ${response.statusText}`)
      }
    } catch (error) {
      setStatus(`Error: ${error}`)
    }
  }

  return (
    <div>
      <h2>Upload Photo</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

      {status && <p style={{ marginTop: '10px', color: status.includes('Error') ? 'red' : 'green' }}>{status}</p>}
    </div>
  )
}

export default Upload
