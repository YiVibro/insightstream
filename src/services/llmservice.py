import os
from google import genai
from google.genai import types
from src.config import settings

class LLMService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    async def embed_text(self, text: str):
         response = self.client.models.embed_content(
                    model="gemini-embedding-2",
                    contents=text,
                    config=types.EmbedContentConfig(
                        output_dimensionality=1536,
                        task_type="RETRIEVAL_QUERY"
                    )
         )
         embedding = response.embeddings[0].values

         return embedding
    
    async def generate_content(self, prompt: str):
         response = self.client.models.generate_content(
             model="gemini-2.5-flash",
             contents=prompt
         )
         return response
  
llm_service = LLMService(api_key=settings.GEMINI_API_KEY)




