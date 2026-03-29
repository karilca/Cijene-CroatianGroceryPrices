from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from service.config import settings


security = HTTPBearer()
SUPPORTED_JWKS_ALGORITHMS = ["RS256", "ES256", "EdDSA"]
LEGACY_SHARED_SECRET_ALGORITHM = "HS256"
JWT_LEEWAY_SECONDS = 30

_jwks_client: PyJWKClient | None = None
_jwks_url: str | None = None


def _get_jwks_client() -> tuple[PyJWKClient, str]:
    supabase_url = settings.supabase_url.strip().rstrip("/")
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured",
        )

    issuer = f"{supabase_url}/auth/v1"
    jwks_url = f"{issuer}/.well-known/jwks.json"

    global _jwks_client, _jwks_url
    if _jwks_client is None or _jwks_url != jwks_url:
        _jwks_client = PyJWKClient(jwks_url)
        _jwks_url = jwks_url

    return _jwks_client, issuer


def _decode_with_jwks(token: str) -> dict:
    jwks_client, issuer = _get_jwks_client()
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=SUPPORTED_JWKS_ALGORITHMS,
        audience="authenticated",
        issuer=issuer,
        leeway=JWT_LEEWAY_SECONDS,
    )


def _decode_with_legacy_shared_secret(token: str) -> dict:
    jwt_secret = settings.supabase_jwt_secret
    if not jwt_secret:
        raise InvalidTokenError("Legacy shared JWT secret is not configured")

    return jwt.decode(
        token,
        jwt_secret,
        algorithms=[LEGACY_SHARED_SECRET_ALGORITHM],
        audience="authenticated",
        leeway=JWT_LEEWAY_SECONDS,
    )


def _decode_token(token: str) -> dict:
    try:
        return _decode_with_jwks(token)
    except (InvalidTokenError, PyJWKClientError):
        # Compatibility fallback for deployments still using legacy shared JWT secret.
        try:
            return _decode_with_legacy_shared_secret(token)
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token verification failed",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = _decode_token(credentials.credentials)
    supabase_uid = payload.get("sub")
    if not supabase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID missing in authentication token",
        )
    return supabase_uid


def get_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return _decode_token(credentials.credentials)
                