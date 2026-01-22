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
import boto3

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

s3 = boto3.client("s3", region_name="ap-southeast-2")
db_dependency = Annotated[Session, Depends(get_db)]

@app.get("/api/photos/presign/")
async def presign_url(
    content_type: str,
    db: db_dependency
):
    try:
        object_name = f"{uuid4()}.jpg"
        presign_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": "tildac-photo-viewer-bucket",
                "Key": object_name,
                "ContentType": content_type,
            },
            ExpiresIn=3600
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

from fastapi import APIRouter, HTTPException
import boto3
from datetime import timedelta

router = APIRouter()

@app.get("/api/wardrobe/items/{item_id}/delete-url")
async def get_delete_url(item_id: int, db: db_dependency):
    try:
        item = db.query(models.Photos).filter(models.Photos.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        delete_url = s3.generate_presigned_url(
            'delete_object',
            Params={
                'Bucket': 'tildac-photo-viewer-bucket',
                'Key': item.file_path
            },
            ExpiresIn=300
        )
        
        return {"deleteUrl": delete_url}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate delete URL: {str(e)}")

@app.delete("/api/wardrobe/items/{item_id}")
async def delete_item(item_id: int, db: db_dependency):
    try:
        item = db.query(models.Photos).filter(models.Photos.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        db.delete(item)
        db.commit()
        
        return {"message": "Item deleted successfully", "id": item_id}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")


@app.get("/api/wardrobe/{itemId}") 
async def getWardrobeItemById(
    itemId: int,
    db: db_dependency
):
    try:
        photo = db.query(models.Photos).filter(models.Photos.id == itemId).first()
        
        if not photo:
            raise HTTPException(status_code=404, detail=f"Item with id {itemId} not found")
        
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": "tildac-photo-viewer-bucket",
                "Key": photo.file_path,
            },
            ExpiresIn=3600
        )
        
        return {
            "id": photo.id,
            "file_path": photo.file_path,
            "url": presigned_url,
            "upload_time": photo.upload_time,
            "tags": photo.tags,
            "alt_text": photo.alt_text
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve item: {str(e)}")

@app.get("/api/wardrobe")
async def getAllWardrobeItems(
    db: db_dependency,
    skip: int = 0,
    limit: int = 100
):
    try:
        photos = db.query(models.Photos).offset(skip).limit(limit).all()
        
        items = []
        for photo in photos:
            presigned_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": "tildac-photo-viewer-bucket",
                    "Key": photo.file_path,
                },
                ExpiresIn=3600
            )
            
            items.append({
                "id": photo.id,
                "file_path": photo.file_path,
                "url": presigned_url,
                "upload_time": photo.upload_time,
                "tags": photo.tags,
                "alt_text": photo.alt_text
            })
        
        return {
            "items": items,
            "total": len(items),
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve items: {str(e)}")
