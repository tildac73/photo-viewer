This project aims to produce a working photo viewer

Key goals for this project include
 - supporting large-scale photo upload
 - storing photo metadata
 - supporting image search based on concepts

Key Tech Stack Choices
 - FastAPI (python)
 - PostgreSQL
 - minIO photo storage

 Data model
 - photo_id (UUID)
 - file_path
 - upload_time
 - tags (TEXT[])
 - alt_text

How to use the Docker
 - "docker compose up --build"