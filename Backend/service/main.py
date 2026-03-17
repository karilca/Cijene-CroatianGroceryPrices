from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
import httpx

from service.config import settings
from service.auth_utils import get_current_user, get_user_payload
from service.db import set_db

db = settings.get_db()

# --- MODELI ---

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: bool
    role_id: int

class CartItemRequest(BaseModel):
    product_id: str
    quantity: int = 1

# --- JEZGRA LOGIKE (AUTH & SYNC) ---

async def get_user_with_role(u_id: UUID, payload: dict):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    iat = payload.get("iat")
    if iat and (datetime.now(timezone.utc).timestamp() - iat) > 86400:
        raise HTTPException(status_code=401, detail="Sesija istekla.")

    query = """
        SELECT u.id, u.name, u.is_active, u.supabase_uid, u.role_id, r.name as role_name 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.supabase_uid = $1
    """
    user = await target_db.fetchrow(query, u_id)

    if user is None:
        email = (
            payload.get("email") or
            payload.get("user_metadata", {}).get("email") or
            payload.get("app_metadata", {}).get("email") or
            "unknown@mail.com"
        )
        user_role_id = await target_db.fetchval("SELECT id FROM roles WHERE name = 'USER'")
        await target_db.execute(
            """INSERT INTO users (name, supabase_uid, is_active, role_id, created_at)
               VALUES ($1, $2, true, $3, NOW())
               ON CONFLICT (supabase_uid) DO NOTHING""",
            email, u_id, user_role_id
        )
        user = await target_db.fetchrow(query, u_id)
    return user

async def get_current_active_user(u_id_str: str = Depends(get_current_user), payload: dict = Depends(get_user_payload)):
    user = await get_user_with_role(UUID(u_id_str), payload)
    if not user['is_active']:
        raise HTTPException(status_code=403, detail="Račun je deaktiviran.")
    return user

def require_role(role_name: str):
    async def role_checker(user = Depends(get_current_active_user)):
        if user['role_name'] != role_name:
            raise HTTPException(status_code=403, detail="Pristup dopušten samo administratorima.")
        return user
    return role_checker

# --- APP SETUP ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    set_db(db)
    yield
    await db.close()

app = FastAPI(title="Cijene API - Admin Control Panel", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}

# --- KOŠARICA ---

@app.get("/v1/cart")
async def get_cart(user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    rows = await target_db.fetch("""
        SELECT DISTINCT ON (ci.product_id) ci.product_id, ci.quantity, cp.name, cp.brand
        FROM cart_items ci
        LEFT JOIN products p ON p.ean = ci.product_id
        LEFT JOIN chain_products cp ON cp.product_id = p.id
        WHERE ci.user_id = $1
        ORDER BY ci.product_id, cp.name
    """, user['supabase_uid'])
    return {"items": [dict(row) for row in rows]}

@app.post("/v1/cart/add")
async def add_to_cart(item: CartItemRequest, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute("""
        INSERT INTO cart_items (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET quantity = cart_items.quantity + $3
    """, user['supabase_uid'], item.product_id, item.quantity)
    return {"status": "success"}

@app.delete("/v1/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute(
        "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2",
        user['supabase_uid'], product_id
    )
    return {"status": "success"}

# --- ADMIN ENDPOINTI ---

@app.get("/v1/admin/users")
async def admin_get_users(admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    users = await target_db.fetch("""
        SELECT u.id, u.name, u.is_active, u.supabase_uid, u.role_id, r.name as role_name, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
    """)
    return [dict(u) for u in users]

@app.put("/v1/admin/users/{u_id}")
async def admin_update_user(u_id: UUID, data: UserUpdate, admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute(
        "UPDATE users SET name = COALESCE($1, name), is_active = $2, role_id = $3 WHERE supabase_uid = $4",
        data.name, data.is_active, data.role_id, u_id
    )
    return {"message": "Korisnik uspješno ažuriran."}

@app.delete("/v1/admin/users/{u_id}")
async def admin_delete_user(u_id: UUID, admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    async with target_db.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM cart_items WHERE user_id = $1", u_id)
            await conn.execute("DELETE FROM users WHERE supabase_uid = $1", u_id)

    if settings.supabase_service_role_key:
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{settings.supabase_url}/auth/v1/admin/users/{u_id}",
                headers={
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}"
                }
            )

    return {"message": "Korisnik trajno obrisan."}

@app.get("/v1/admin/roles")
async def admin_get_roles(admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    roles = await target_db.fetch("SELECT * FROM roles ORDER BY id ASC")
    return [dict(r) for r in roles]

@app.post("/v1/admin/roles")
async def admin_create_role(role: RoleBase, admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    try:
        await target_db.execute(
            "INSERT INTO roles (name, description) VALUES ($1, $2)",
            role.name, role.description
        )
        return {"message": "Uloga kreirana."}
    except Exception:
        raise HTTPException(status_code=400, detail="Uloga već postoji.")

# --- ROUTERI ---

from service.routers import v0, v1
app.include_router(v0.router, prefix="/v0")
app.include_router(v1.router, prefix="/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service.main:app", host=settings.host, port=settings.port, reload=settings.debug)