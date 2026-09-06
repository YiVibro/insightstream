from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.api.v1.health import router as health_router
from src.api.v1.documents import router as documents_router
from src.api.v1.chat import router as chat_router

app=FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RAG API for document retrieval and question answering",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router,prefix="/api/v1")
app.include_router(documents_router,prefix="/api/v1")
app.include_router(chat_router,prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to the RAG API! Visit /docs for API documentation.",
    }

if __name__=="__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )