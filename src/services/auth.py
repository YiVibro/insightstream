from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from src.db.supabase import supabase_manager

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
       user = await supabase_manager.authenticate_user(token)
       if not user:
           raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or session expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
       return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    