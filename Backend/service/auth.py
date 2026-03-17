from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from service.auth_utils import get_current_user as get_current_user_verified
from service.auth_utils import get_user_payload as get_user_payload_verified

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    return get_current_user_verified(credentials)


def get_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return get_user_payload_verified(credentials)