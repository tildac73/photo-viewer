from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Annotated
from datetime import datetime, timedelta
from . import models
from .database import engine, SessionLocal
from sqlalchemy.orm import Session
from minio import Minio
from uuid import uuid4
import os

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

minio_endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
minio_client = Minio(
    minio_endpoint,
    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
    secure=os.getenv("MINIO_SECURE", "false").lower() == "true"
)
if not minio_client.bucket_exists("photos"):
    minio_client.make_bucket("photos")

db_dependency = Annotated[Session, Depends(get_db)]

@app.get("/photos/presign")
async def presignUrl (
    content_type: str,
    db: db_dependency
):
    try:
        object_name = f"{uuid4()}.jpg"

        presignUrl = minio_client.presigned_put_object(
            bucket_name="photos",
            object_name=object_name,
            expires=timedelta(minutes=10),
        )

        return {
            "upload_url": presignUrl,
            "object_name": object_name,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PhotoCreate(BaseModel):
    object_name: str
    tags: str | None = None
    alt_text: str | None = None

@app.post("/photos")
def create_photo(
    payload: PhotoCreate,
    db: db_dependency
):
    photo = models.Photos(
        file_path=payload.object_name,
        upload_time=datetime.now(),
        tags=payload.tags,
        alt_text=payload.alt_text
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo
