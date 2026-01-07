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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/api/photos/presign/")
async def presign_url(
    content_type: str,
    db: db_dependency
):
    try:
        object_name = f"{uuid4()}.jpg"
        presign_url = minio_client.presigned_put_object(
            bucket_name="photos",
            object_name=object_name,
            expires=timedelta(minutes=10)
        )

        return {
            "presign_url": presign_url,
            "object_name": object_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate presigned url: {str(e)}")

@app.post("/api/upload/")
async def uploadPhoto(
    file_name: str = Form(None),
    tags: str = Form(None),
    alt_text: str = Form(None),
    db: db_dependency = None
):
    try:
        if not file_name:
            raise HTTPException(status_code=400, detail="No file provided")

        db_photo = models.Photos(
            file_path=file_name,
            upload_time=datetime.now(),
            tags=tags,
            alt_text=alt_text
        )
        db.add(db_photo)
        db.commit()
        db.refresh(db_photo)
        return db_photo

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")