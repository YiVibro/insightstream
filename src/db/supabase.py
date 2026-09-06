from typing import Any, Dict, List, Optional
from supabase import Client, create_client
from starlette.concurrency import run_in_threadpool
import jwt 
from src.config import settings

class SupabaseClientManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        else:
            raise ValueError("Supabase URL and Service Role Key must be set in environment variables.")

    def get_client(self) -> Client:
        if not self.client:
            raise RuntimeError("Supabase client is not initialized.")
        return self.client
    
    async def authenticate_user(self, token: str) -> Dict[str, Any]:
        """Verify token asynchronously via Supabase API, falling back to local JWT decode."""
        def _fetch_from_supabase():
            # Pass token positionally to supabase-py SDK
            return self.get_client().auth.get_user(token)

        try:
            # Offload blocking HTTP network request to threadpool to avoid read timeouts
            res = await run_in_threadpool(_fetch_from_supabase)
            if res and res.user:
                return res.user
        except Exception as remote_err:
            # Fall back to local JWT verification if remote network call fails or times out
            try:
                payload = jwt.decode(
                    token, 
                    settings.SUPABASE_JWT_SECRET, 
                    algorithms=["HS256", "ES256"], 
                    options={"verify_aud": False}
                )
                return payload
            except Exception :
                raise remote_err

    async def insert_document_metadata(
        self, filename: str, file_path: str, file_type: str, file_size: int, user_id: str
    ) -> Dict[str, Any]:
        """Inserts record into the documents table asynchronously."""
        data = {
            "user_id": user_id,
            "filename": filename,
            "file_path": file_path,
            "file_type": file_type,
            "file_size_bytes": file_size,
            "status": "pending"
        }
        
        def _insert():
            return self.get_client().table("documents").insert(data).execute()

        response = await run_in_threadpool(_insert)
        return response.data[0] if response.data else {}

    async def insert_document_chunks(
        self, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        def _insert():
            return self.get_client().table("document_chunks").insert(chunks).execute()

        response = await run_in_threadpool(_insert)
        return response.data

    async def search_similar_chunks(
        self,
        query_embedding: List[float],
        threshold: float = 0.5,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Calls the PostgreSQL RPC match_document_chunks for vector similarity."""
        def _rpc():
            return self.get_client().rpc(
                "match_document_chunks",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                },
            ).execute()

        response = await run_in_threadpool(_rpc)
        return response.data

supabase_manager = SupabaseClientManager()