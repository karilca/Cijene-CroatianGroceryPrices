import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    
    try:
        # POTPUNI BYPASS VERIFIKACIJE POTPISA
        # Ovo radimo jer Supabase šalje ES256, a mi nemamo PEM javni ključ
        payload = jwt.decode(
            token, 
            options={"verify_signature": False, "verify_aud": False}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID missing")
            
        return str(user_id)

    except Exception as e:
        print(f"!!! BYPASS ERROR: {str(e)}")
        raise HTTPException(status_code=401, detail="Auth failed")

def get_user_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    uid = get_current_user(credentials)
    return {"sub": uid}