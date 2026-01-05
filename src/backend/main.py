from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Annotated
from datetime import datetime
from . import models
from .database import engine, SessionLocal
from sqlalchemy.orm import Session
from minio import Minio
from uuid import uuid4

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

minio_client = Minio(
    "minio:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)
if not minio_client.bucket_exists("photos"):
    minio_client.make_bucket("photos")

db_dependency = Annotated[Session, Depends(get_db)]

@app.post("/upload/")
async def uploadPhoto(
    file: UploadFile = File(...),
    tags: str = Form(...),
    alt_text: str = Form(...),
    db: db_dependency = None
):
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid4()}.{file_extension}"

    minio_client.put_object(
        bucket_name="photos",
        object_name=unique_filename,
        data=file.file,
        length=1,
        part_size=10*1024*1024
    )

    db_photo = models.Photos(
        file_path=unique_filename,
        upload_time=datetime.now(),
        tags=tags,
        alt_text=alt_text
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo