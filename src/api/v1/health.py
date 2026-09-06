from fastapi import APIRouter
from src.config import settings

router = APIRouter()

@router.get("/health",tags=["Health Check"])
async def health_check():
    """
    Health check endpoint to verify if the API is running and environment variables are set correctly.
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
    }
