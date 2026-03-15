import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        supabase_uid = payload.get("sub")
        if not supabase_uid:
            raise HTTPException(status_code=401, detail="User ID missing")
        return supabase_uid
    except Exception as e:
        print(f"!!! AUTH ERROR: {str(e)}")
        raise HTTPException(status_code=401, detail="Auth failed")

def get_user_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    return jwt.decode(token, options={"verify_signature": False, "verify_aud": False})