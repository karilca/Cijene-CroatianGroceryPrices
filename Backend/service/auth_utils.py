from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os


JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"

security = HTTPBearer()

def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Dekodiranje tokena koji šalje Frontend
        payload = jwt.decode(auth.credentials, JWT_SECRET, algorithms=[ALGORITHM], audience="authenticated")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
                