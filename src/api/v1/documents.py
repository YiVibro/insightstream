import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from uuid import uuid4
from src.config import settings
from src.services.s3 import S3Service
from src.services.auth import get_current_user
from src.db.supabase import supabase_manager

router = APIRouter()

ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "text/plain"]
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

class UploadRequest(BaseModel):
    fileName: str
    contentType: str = Field(..., description="The MIME type of the file being uploaded.")
    fileSize: int = Field(..., description="The size of the file in bytes.")

class DoneUploadRequest(BaseModel):
    document_id: str
    file_path: str

@router.post("/get-upload-url", tags=["S3 URL"])
async def get_presigned_url(upload_request: UploadRequest, user=Depends(get_current_user)):
    if upload_request.contentType not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed types are: PDF, JPEG, PNG, TXT."
        )
        
    if upload_request.fileSize > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB."
        )

    # Safely retrieve user_id from object or dict
    user_id = getattr(user, "id", None) or (user.get("sub") if isinstance(user, dict) else user.get("id"))
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not resolve user ID from authentication token."
        )

    s3_service = S3Service()
    
    # Generate unique storage path
    original_title, ext = os.path.splitext(upload_request.fileName)
    document_id = str(uuid4())
    unique_key = f"incoming/{user_id}/{document_id}{ext}"

    # Generate S3 presigned URL (Synchronous call - no await)
    url = s3_service.generate_presigned_url(
        bucket_name=settings.AWS_S3_BUCKET_NAME,
        object_name=unique_key,
        expiration=3600
    )

    # Insert into updated documents table (Synchronous call - removed 'await')
    db_response = supabase_manager.get_client().table("documents").insert({
        "id":document_id,
        "user_id": user_id,
        "filename": upload_request.fileName,
        "file_path": unique_key,
        "file_type": upload_request.contentType,
        "file_size_bytes": upload_request.fileSize,
        "status": "pending"
    }).execute()

    document_id = db_response.data[0]["id"] if db_response.data else None

    return {
        "url": url,
        "document_id": document_id,
        "file_path": unique_key
    }


