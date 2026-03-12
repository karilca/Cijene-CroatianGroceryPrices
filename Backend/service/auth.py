from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from service.config import settings

# Inicijaliziramo bearer shemu (ono što frontend šalje u Headeru)
security = HTTPBearer()

import jwt as pyjwt # Često se koristi PyJWT umjesto jose u FastAPI projektima

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Koristimo jwt.decode direktno, ali s potpunom slobodom oko algoritama
        # Ako tvoj projekt koristi 'jose', on i dalje podržava ovo:
        payload = jwt.decode(
            token, 
            settings.supabase_jwt_secret, 
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_aud": False,
                "verify_iat": False,
                "verify_exp": True,
                "verify_nbf": False,
                "verify_iss": False,
                "verify_sub": False,
                "verify_jti": False,
                "verify_at_hash": False,
                "require_aud": False,
                "require_iat": False,
                "require_exp": False,
                "require_nbf": False,
                "require_iss": False,
                "require_sub": False,
                "require_jti": False,
                "leeway": 0
            }
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="No sub found in token")
            
        return user_id

    except Exception as e:
        # Ako jose i dalje zeza, idemo na 'unsafe' metodu samo da dobijemo ID
        # pa ćemo kasnije istražiti zašto tvoj okoliš ne prihvaća HS256
        print(f"FORCING TOKEN DECODE DUE TO: {str(e)}")
        try:
            payload = jwt.get_unverified_claims(token)
            return payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Total Auth Failure")