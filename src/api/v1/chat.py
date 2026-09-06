from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from typing import Any, List,Optional
import supabase
from src.services.llmservice import llm_service
from src.db.supabase import supabase_manager
import os

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    userId: str
    document_ids: Optional[List[str]] = None

@router.post("/chat", tags=["Chat"])
async def chat_endpoint(request: ChatRequest):
    #if request.query:
     #  raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        # 1. Generate embedding for the user query (using RETRIEVAL_QUERY)
        query_embedding = await llm_service.embed_text(request.query)
        # 2. Perform Vector Similarity Search in Supabase via RPC
        # 2. Perform Vector Similarity Search in Supabase via RPC
        # match_response = supabase.rpc("match_document_chunks", {
        #     "query_embedding": query_embedding,
        #     "match_threshold": 0.5,
        #     "match_count": 5
        # }).execute()

        match_response = await supabase_manager.search_similar_chunks(query_embedding=query_embedding, threshold=0.5, limit=5)

        matches = match_response or []

        if request.document_ids and len(request.document_ids) > 0:
            matches = [m for m in matches if m.get("document_id") in request.document_ids]
           
        # 3. Build context from matched chunks
        context_text = "\n\n".join([match.get("content", "") for match in matches])
        sources = list(set([match.get("document_title", "Unknown Source") for match in matches]))

        # 4. Generate Answer using Gemini LLM
        prompt = f"Answer the user query based only on the provided context.\n\nContext:\n{context_text}\n\nQuery: {request.query}"
        
        llm_response = await llm_service.generate_content(prompt)
        
        answer = llm_response.text

        return {
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    