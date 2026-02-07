import React, { useState } from 'react'
import { useUpload } from './useUpload'
import './Upload.scss'

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
      tags,
      altText,
    });
  };

  const statusClass = isLoading
    ? 'loading'
    : error
    ? 'error'
    : success
    ? 'success'
    : '';

  const statusText = isLoading
    ? 'Uploading...'
    : error
    ? 'Upload Failed'
    : success
    ? 'Upload Successful'
    : '';

  return (
    <div className="upload_container">
      <h1 className="upload_heading">Upload Photo</h1>
      <form onSubmit={handleUpload} className="upload_form">
        <div className="upload_file_input">
          <label htmlFor="file">
            {file ? file.name : 'Choose Photo'}
          </label>
          <input
            type="file"
            id="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="upload_field">
          <label htmlFor="tags">Tags</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., vacation, beach"
          />
        </div>

        <div className="upload_field">
          <label htmlFor="altText">Alt Text</label>
          <input
            type="text"
            id="altText"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the photo"
          />
        </div>

        <button
          type="submit"
          className="upload_submit"
          disabled={!file || isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {statusText && (
        <p className={`upload_status ${statusClass}`}>
          {statusText}
        </p>
      )}
    </div>
  )
}

export default Upload
