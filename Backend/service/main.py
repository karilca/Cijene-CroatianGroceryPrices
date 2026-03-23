import json
import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, status
from pydantic import BaseModel
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Literal, Optional

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


class SoftDeleteRequest(BaseModel):
    confirm_email: str
    reason: Optional[str] = None


class HardDeleteRequest(BaseModel):
    confirm_email: str
    reason: Optional[str] = None


class BulkDeactivateRequest(BaseModel):
    user_ids: list[UUID]
    reason: Optional[str] = None


class BulkRoleUpdateRequest(BaseModel):
    user_ids: list[UUID]
    role_id: int
    reason: Optional[str] = None

class CartItemRequest(BaseModel):
    product_id: str
    quantity: int = 1


class FavoriteProductRequest(BaseModel):
    product_id: str


class FavoriteStoreRequest(BaseModel):
    store_id: str
    chain_code: str
    store_code: str


class UserProfileUpdateRequest(BaseModel):
    name: str


class SelfDeleteAccountRequest(BaseModel):
    confirm_email: str
    reason: Optional[str] = None


def _extract_email(payload: dict) -> str:
    return (
        payload.get("email")
        or payload.get("user_metadata", {}).get("email")
        or payload.get("app_metadata", {}).get("email")
        or "unknown@mail.com"
    )


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _normalize_name(value: str | None) -> str:
    return (value or "").strip()


def _extract_name(payload: dict, fallback_email: str) -> str:
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}

    name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or app_metadata.get("full_name")
        or app_metadata.get("name")
    )

    normalized = _normalize_name(name)
    if normalized:
        return normalized[:255]

    return fallback_email


async def _prune_audit_logs(target_db):
    await target_db.execute(
        """
        DELETE FROM admin_audit_logs
        WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
        """,
        settings.audit_log_retention_days,
    )


async def _log_admin_action(
    target_db,
    admin,
    action: str,
    target_user,
    before: dict | None = None,
    after: dict | None = None,
):
    await target_db.execute(
        """
        INSERT INTO admin_audit_logs (
            actor_supabase_uid,
            actor_email,
            target_supabase_uid,
            target_email,
            action,
            before_data,
            after_data
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        """,
        admin["supabase_uid"],
        admin.get("email"),
        target_user.get("supabase_uid") if target_user else None,
        target_user.get("email") if target_user else None,
        action,
        json.dumps(before or {}),
        json.dumps(after or {}),
    )
    await _prune_audit_logs(target_db)


async def _get_active_admin_count(target_db) -> int:
    return await target_db.fetchval(
        """
        SELECT COUNT(*)
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'ADMIN' AND u.is_active = true
        """
    )

# --- JEZGRA LOGIKE (AUTH & SYNC) ---

async def get_user_with_role(u_id: UUID, payload: dict):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    iat = payload.get("iat")
    if iat and (datetime.now(timezone.utc).timestamp() - iat) > 86400:
        raise HTTPException(status_code=401, detail="Sesija istekla.")

    query = """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name as role_name 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.supabase_uid = $1
    """
    user = await target_db.fetchrow(query, u_id)
    email = _extract_email(payload)
    extracted_name = _extract_name(payload, email)

    if user is None:
        user_role_id = await target_db.fetchval("SELECT id FROM roles WHERE name = 'USER'")
        await target_db.execute(
            """INSERT INTO users (name, email, supabase_uid, is_active, role_id, created_at)
               VALUES ($1, $2, $3, true, $4, NOW())
               ON CONFLICT (supabase_uid) DO NOTHING""",
            extracted_name, email, u_id, user_role_id
        )
        user = await target_db.fetchrow(query, u_id)
    elif not user.get("email") and email:
        await target_db.execute(
            "UPDATE users SET email = $1 WHERE supabase_uid = $2",
            email,
            u_id,
        )
        user = await target_db.fetchrow(query, u_id)

    current_name = _normalize_name(user.get("name") if user else None)
    current_email = _normalize_email(user.get("email") if user else None)
    if user and extracted_name and current_name.lower() == current_email:
        await target_db.execute(
            "UPDATE users SET name = $1 WHERE supabase_uid = $2",
            extracted_name,
            u_id,
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


# --- FAVORITES ---

@app.get("/v1/favorites/products")
async def get_favorite_products(user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    rows = await target_db.fetch("""
        SELECT DISTINCT ON (fp.product_id)
            fp.product_id,
            fp.created_at,
            cp.name,
            cp.brand,
            p.ean,
            p.quantity,
            p.unit
        FROM favorite_products fp
        LEFT JOIN products p ON p.ean = fp.product_id
        LEFT JOIN chain_products cp ON cp.product_id = p.id
        WHERE fp.user_id = $1
        ORDER BY fp.product_id, cp.name
    """, user['supabase_uid'])
    return {"items": [dict(row) for row in rows]}


@app.post("/v1/favorites/products")
async def add_favorite_product(item: FavoriteProductRequest, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute("""
        INSERT INTO favorite_products (user_id, product_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, product_id) DO NOTHING
    """, user['supabase_uid'], item.product_id)
    return {"status": "success"}


@app.delete("/v1/favorites/products/{product_id}")
async def remove_favorite_product(product_id: str, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute(
        "DELETE FROM favorite_products WHERE user_id = $1 AND product_id = $2",
        user['supabase_uid'], product_id
    )
    return {"status": "success"}


@app.get("/v1/favorites/stores")
async def get_favorite_stores(user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    rows = await target_db.fetch("""
        SELECT
            fs.store_id,
            fs.chain_code,
            fs.store_code,
            fs.created_at,
            s.type,
            s.address,
            s.city,
            s.zipcode,
            s.lat,
            s.lon,
            s.phone
        FROM favorite_stores fs
        LEFT JOIN chains c ON c.code = fs.chain_code
        LEFT JOIN stores s ON s.chain_id = c.id AND s.code = fs.store_code
        WHERE fs.user_id = $1
        ORDER BY fs.created_at DESC
    """, user['supabase_uid'])
    return {"items": [dict(row) for row in rows]}


@app.post("/v1/favorites/stores")
async def add_favorite_store(item: FavoriteStoreRequest, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute("""
        INSERT INTO favorite_stores (user_id, store_id, chain_code, store_code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, store_id) DO NOTHING
    """, user['supabase_uid'], item.store_id, item.chain_code, item.store_code)
    return {"status": "success"}


@app.delete("/v1/favorites/stores/{store_id}")
async def remove_favorite_store(store_id: str, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    await target_db.execute(
        "DELETE FROM favorite_stores WHERE user_id = $1 AND store_id = $2",
        user['supabase_uid'], store_id
    )
    return {"status": "success"}


# --- USER PROFILE ---

@app.get("/v1/user/profile")
async def get_user_profile(user = Depends(get_current_active_user)):
    return {
        "id": user["id"],
        "supabase_uid": str(user["supabase_uid"]),
        "name": user["name"],
        "email": user["email"],
        "role_id": user["role_id"],
        "role_name": user["role_name"],
        "is_active": user["is_active"],
    }


@app.put("/v1/user/profile")
async def update_user_profile(payload: UserProfileUpdateRequest, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    cleaned_name = _normalize_name(payload.name)

    if len(cleaned_name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ime mora imati barem 2 znaka.")

    if len(cleaned_name) > 80:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ime može imati maksimalno 80 znakova.")

    await target_db.execute(
        "UPDATE users SET name = $1 WHERE supabase_uid = $2",
        cleaned_name,
        user["supabase_uid"],
    )

    updated_user = await target_db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.supabase_uid = $1
        """,
        user["supabase_uid"],
    )

    return {
        "message": "Profil je uspješno ažuriran.",
        "profile": {
            "id": updated_user["id"],
            "supabase_uid": str(updated_user["supabase_uid"]),
            "name": updated_user["name"],
            "email": updated_user["email"],
            "role_id": updated_user["role_id"],
            "role_name": updated_user["role_name"],
            "is_active": updated_user["is_active"],
        },
    }


@app.post("/v1/user/profile/delete")
async def delete_own_account(payload: SelfDeleteAccountRequest, user = Depends(get_current_active_user)):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    user_email = _normalize_email(user.get("email"))
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Na računu nije evidentiran email.",
        )

    if _normalize_email(payload.confirm_email) != user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Potvrdni email se ne podudara s korisničkim emailom.",
        )

    if user["role_name"] == "ADMIN":
        active_admin_count = await _get_active_admin_count(target_db)
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nije dopušteno deaktivirati zadnjeg aktivnog administratora.",
            )

    await target_db.execute(
        """
        UPDATE users
        SET is_active = false,
            deleted_at = NOW(),
            deleted_reason = COALESCE($1, 'Self-service account deletion'),
            deleted_by_supabase_uid = $2
        WHERE supabase_uid = $2
        """,
        payload.reason,
        user["supabase_uid"],
    )

    await _log_admin_action(
        target_db,
        admin={"supabase_uid": user["supabase_uid"], "email": user.get("email")},
        action="user.self_delete",
        target_user=user,
        before={"is_active": True},
        after={
            "is_active": False,
            "deleted_reason": payload.reason or "Self-service account deletion",
        },
    )

    return {"message": "Račun je deaktiviran."}

# --- ADMIN ENDPOINTI ---

@app.get("/v1/admin/users")
async def admin_get_users(
    q: str | None = Query(None),
    role_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    order: Literal["asc", "desc"] = Query("desc"),
    sort_by: Literal["created_at", "email", "name"] = Query("created_at"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    where_clauses: list[str] = []
    params: list[object] = []

    if q and q.strip():
        params.append(f"%{q.strip()}%")
        param_index = len(params)
        where_clauses.append(f"(u.name ILIKE ${param_index} OR u.email ILIKE ${param_index})")

    if role_id is not None:
        params.append(role_id)
        param_index = len(params)
        where_clauses.append(f"u.role_id = ${param_index}")

    if is_active is not None:
        params.append(is_active)
        param_index = len(params)
        where_clauses.append(f"u.is_active = ${param_index}")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    order_sql = "ASC" if order == "asc" else "DESC"
    sort_column_map = {
        "created_at": "u.created_at",
        "email": "u.email",
        "name": "u.name",
    }
    sort_column = sort_column_map[sort_by]

    total_count = await target_db.fetchval(
        f"""
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        {where_sql}
        """,
        *params,
    )

    page_params = [*params, limit, offset]
    limit_index = len(params) + 1
    offset_index = len(params) + 2

    users = await target_db.fetch(
        f"""
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name as role_name, u.created_at, u.deleted_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        {where_sql}
        ORDER BY {sort_column} {order_sql}
        LIMIT ${limit_index} OFFSET ${offset_index}
        """,
        *page_params,
    )

    return {
        "items": [dict(u) for u in users],
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "order": order,
    }


@app.post("/v1/admin/users/bulk-deactivate")
async def admin_bulk_deactivate_users(
    payload: BulkDeactivateRequest,
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    unique_user_ids = list(dict.fromkeys(payload.user_ids))

    if len(unique_user_ids) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nema korisnika za obradu.")

    if len(unique_user_ids) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maksimalno 100 korisnika po zahtjevu.")

    users = await target_db.fetch(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.supabase_uid = ANY($1::uuid[])
        """,
        unique_user_ids,
    )
    users_by_uid = {u["supabase_uid"]: u for u in users}

    successful = 0
    failures: list[dict[str, str]] = []
    active_admin_count = await _get_active_admin_count(target_db)

    for user_id in unique_user_ids:
        target_user = users_by_uid.get(user_id)
        if target_user is None:
            failures.append({"user_id": str(user_id), "error": "Korisnik nije pronađen."})
            continue

        if admin["supabase_uid"] == user_id:
            failures.append({"user_id": str(user_id), "error": "Ne možete deaktivirati vlastiti račun."})
            continue

        if target_user["role_name"] == "ADMIN" and target_user["is_active"]:
            if active_admin_count <= 1:
                failures.append({
                    "user_id": str(user_id),
                    "error": "Nije dopušteno deaktivirati zadnjeg aktivnog administratora.",
                })
                continue
            active_admin_count -= 1

        before = {
            "is_active": target_user["is_active"],
            "role_name": target_user["role_name"],
        }

        await target_db.execute(
            """
            UPDATE users
            SET is_active = false,
                deleted_at = NOW(),
                deleted_reason = COALESCE($1, 'Bulk deactivate via admin panel'),
                deleted_by_supabase_uid = $2
            WHERE supabase_uid = $3
            """,
            payload.reason,
            admin["supabase_uid"],
            user_id,
        )

        await _log_admin_action(
            target_db,
            admin,
            action="user.bulk_deactivate",
            target_user=target_user,
            before=before,
            after={
                "is_active": False,
                "deleted_reason": payload.reason or "Bulk deactivate via admin panel",
            },
        )

        successful += 1

    await _log_admin_action(
        target_db,
        admin,
        action="user.bulk_deactivate.batch",
        target_user=None,
        before=None,
        after={
            "total_requested": len(unique_user_ids),
            "successful": successful,
            "failed": len(failures),
        },
    )

    return {
        "total_requested": len(unique_user_ids),
        "successful": successful,
        "failed": len(failures),
        "failures": failures,
    }


@app.post("/v1/admin/users/bulk-update-role")
async def admin_bulk_update_role(
    payload: BulkRoleUpdateRequest,
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    unique_user_ids = list(dict.fromkeys(payload.user_ids))

    if len(unique_user_ids) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nema korisnika za obradu.")

    if len(unique_user_ids) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maksimalno 100 korisnika po zahtjevu.")

    role = await target_db.fetchrow("SELECT id, name FROM roles WHERE id = $1", payload.role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Neispravna uloga.")

    users = await target_db.fetch(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.supabase_uid = ANY($1::uuid[])
        """,
        unique_user_ids,
    )
    users_by_uid = {u["supabase_uid"]: u for u in users}

    successful = 0
    failures: list[dict[str, str]] = []
    active_admin_count = await _get_active_admin_count(target_db)

    for user_id in unique_user_ids:
        target_user = users_by_uid.get(user_id)
        if target_user is None:
            failures.append({"user_id": str(user_id), "error": "Korisnik nije pronađen."})
            continue

        if admin["supabase_uid"] == user_id:
            failures.append({"user_id": str(user_id), "error": "Ne možete mijenjati vlastitu ulogu."})
            continue

        current_is_admin = target_user["role_name"] == "ADMIN"
        target_is_active = bool(target_user["is_active"])
        next_is_admin = role["name"] == "ADMIN"
        if current_is_admin and target_is_active and not next_is_admin:
            if active_admin_count <= 1:
                failures.append({
                    "user_id": str(user_id),
                    "error": "Nije dopušteno ukloniti zadnjeg aktivnog administratora.",
                })
                continue
            active_admin_count -= 1

        before = {
            "role_id": target_user["role_id"],
            "role_name": target_user["role_name"],
        }

        await target_db.execute(
            "UPDATE users SET role_id = $1 WHERE supabase_uid = $2",
            payload.role_id,
            user_id,
        )

        await _log_admin_action(
            target_db,
            admin,
            action="user.bulk_role_update",
            target_user=target_user,
            before=before,
            after={
                "role_id": payload.role_id,
                "role_name": role["name"],
                "reason": payload.reason,
            },
        )

        successful += 1

    await _log_admin_action(
        target_db,
        admin,
        action="user.bulk_role_update.batch",
        target_user=None,
        before=None,
        after={
            "total_requested": len(unique_user_ids),
            "successful": successful,
            "failed": len(failures),
            "role_id": payload.role_id,
            "role_name": role["name"],
        },
    )

    return {
        "total_requested": len(unique_user_ids),
        "successful": successful,
        "failed": len(failures),
        "failures": failures,
    }


@app.get("/v1/admin/check")
async def admin_check(admin = Depends(require_role("ADMIN"))):
    return {
        "is_admin": True,
        "supabase_uid": str(admin["supabase_uid"]),
        "role": admin["role_name"],
    }


@app.get("/v1/admin/audit-actions")
async def admin_get_audit_actions(admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    rows = await target_db.fetch(
        """
        SELECT DISTINCT action
        FROM admin_audit_logs
        WHERE action IS NOT NULL
          AND action <> ''
        ORDER BY action ASC
        """
    )

    return {"items": [row["action"] for row in rows]}


@app.get("/v1/admin/audit-logs")
async def admin_get_audit_logs(
    action: str | None = Query(None),
    actor_uid: UUID | None = Query(None),
    target_uid: UUID | None = Query(None),
    actor_email: str | None = Query(None),
    target_email: str | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    order: Literal["asc", "desc"] = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))
    order_sql = "ASC" if order == "asc" else "DESC"

    total_count = await target_db.fetchval(
        """
        SELECT COUNT(*)
        FROM admin_audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::uuid IS NULL OR actor_supabase_uid = $2)
          AND ($3::uuid IS NULL OR target_supabase_uid = $3)
          AND ($4::text IS NULL OR actor_email ILIKE '%' || $4 || '%')
          AND ($5::text IS NULL OR target_email ILIKE '%' || $5 || '%')
                    AND ($6::date IS NULL OR created_at::date >= $6)
                    AND ($7::date IS NULL OR created_at::date <= $7)
        """,
        action,
        actor_uid,
        target_uid,
        actor_email,
        target_email,
                from_date,
                to_date,
    )

    rows = await target_db.fetch(
                f"""
        SELECT id, actor_supabase_uid, actor_email, target_supabase_uid, target_email,
               action, before_data, after_data, created_at
        FROM admin_audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::uuid IS NULL OR actor_supabase_uid = $2)
          AND ($3::uuid IS NULL OR target_supabase_uid = $3)
          AND ($4::text IS NULL OR actor_email ILIKE '%' || $4 || '%')
          AND ($5::text IS NULL OR target_email ILIKE '%' || $5 || '%')
                    AND ($6::date IS NULL OR created_at::date >= $6)
                    AND ($7::date IS NULL OR created_at::date <= $7)
                ORDER BY created_at {order_sql}
                LIMIT $8 OFFSET $9
                """,
        action,
        actor_uid,
        target_uid,
        actor_email,
        target_email,
                from_date,
                to_date,
        limit,
        offset,
    )
    return {
        "items": [dict(row) for row in rows],
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
                "order": order,
    }

@app.put("/v1/admin/users/{u_id}")
async def admin_update_user(u_id: UUID, data: UserUpdate, admin = Depends(require_role("ADMIN"))):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    target_user = await target_db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.supabase_uid = $1
        """,
        u_id,
    )
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Korisnik nije pronađen.")

    if admin["supabase_uid"] == u_id and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ne možete deaktivirati vlastiti račun.",
        )

    role = await target_db.fetchrow("SELECT id, name FROM roles WHERE id = $1", data.role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Neispravna uloga.")

    current_is_admin = target_user["role_name"] == "ADMIN"
    target_is_active_now = bool(target_user["is_active"])
    next_is_admin = role["name"] == "ADMIN"
    # Guardrail should trigger only when changing/removing an ACTIVE admin.
    # If the target admin is already inactive, role changes do not reduce
    # the count of active admins and should be allowed.
    if current_is_admin and target_is_active_now and (not next_is_admin or not data.is_active):
        active_admin_count = await target_db.fetchval(
            """
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE r.name = 'ADMIN' AND u.is_active = true
            """
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nije dopušteno ukloniti zadnjeg aktivnog administratora.",
            )

    before = {
        "name": target_user["name"],
        "email": target_user["email"],
        "is_active": target_user["is_active"],
        "role_id": target_user["role_id"],
        "role_name": target_user["role_name"],
    }

    await target_db.execute(
        "UPDATE users SET name = COALESCE($1, name), is_active = $2, role_id = $3 WHERE supabase_uid = $4",
        data.name, data.is_active, data.role_id, u_id
    )

    await _log_admin_action(
        target_db,
        admin,
        action="user.update",
        target_user=target_user,
        before=before,
        after={
            "name": data.name if data.name is not None else target_user["name"],
            "email": target_user["email"],
            "is_active": data.is_active,
            "role_id": data.role_id,
            "role_name": role["name"],
        },
    )

    return {"message": "Korisnik uspješno ažuriran."}

@app.post("/v1/admin/users/{u_id}/soft-delete")
async def admin_soft_delete_user(
    u_id: UUID,
    payload: SoftDeleteRequest,
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    target_user = await target_db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name AS role_name, u.deleted_at
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.supabase_uid = $1
        """,
        u_id,
    )
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Korisnik nije pronađen.")

    if admin["supabase_uid"] == u_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ne možete deaktivirati vlastiti račun.",
        )

    target_email = _normalize_email(target_user.get("email"))
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ciljani korisnik nema evidentiran email.",
        )

    if _normalize_email(payload.confirm_email) != target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Potvrdni email se ne podudara s korisničkim emailom.",
        )

    if target_user["role_name"] == "ADMIN" and target_user["is_active"]:
        active_admin_count = await target_db.fetchval(
            """
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE r.name = 'ADMIN' AND u.is_active = true
            """
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nije dopušteno deaktivirati zadnjeg aktivnog administratora.",
            )

    before = {
        "is_active": target_user["is_active"],
        "deleted_at": str(target_user["deleted_at"]) if target_user["deleted_at"] else None,
        "deleted_reason": None,
    }

    await target_db.execute(
        """
        UPDATE users
        SET is_active = false,
            deleted_at = NOW(),
            deleted_reason = COALESCE($1, 'Soft delete via admin panel'),
            deleted_by_supabase_uid = $2
        WHERE supabase_uid = $3
        """,
        payload.reason,
        admin["supabase_uid"],
        u_id,
    )

    await _log_admin_action(
        target_db,
        admin,
        action="user.soft_delete",
        target_user=target_user,
        before=before,
        after={
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_reason": payload.reason or "Soft delete via admin panel",
        },
    )

    return {"message": "Korisnik je deaktiviran (soft delete)."}


@app.post("/v1/admin/users/{u_id}/hard-delete")
async def admin_hard_delete_user(
    u_id: UUID,
    payload: HardDeleteRequest,
    admin = Depends(require_role("ADMIN")),
):
    target_db = getattr(db, '_db', getattr(db, 'pool', None))

    target_user = await target_db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.is_active, u.supabase_uid, u.role_id, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.supabase_uid = $1
        """,
        u_id,
    )
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Korisnik nije pronađen.")

    if admin["supabase_uid"] == u_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ne možete obrisati vlastiti račun.",
        )

    target_email = _normalize_email(target_user.get("email"))
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ciljani korisnik nema evidentiran email.",
        )

    if _normalize_email(payload.confirm_email) != target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Potvrdni email se ne podudara s korisničkim emailom.",
        )

    if target_user["role_name"] == "ADMIN" and target_user["is_active"]:
        active_admin_count = await target_db.fetchval(
            """
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE r.name = 'ADMIN' AND u.is_active = true
            """
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nije dopušteno obrisati zadnjeg aktivnog administratora.",
            )

    before = {
        "name": target_user["name"],
        "email": target_user["email"],
        "is_active": target_user["is_active"],
        "role_name": target_user["role_name"],
        "reason": payload.reason,
    }

    async with target_db.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM cart_items WHERE user_id = $1", u_id)
            await conn.execute("DELETE FROM favorite_products WHERE user_id = $1", u_id)
            await conn.execute("DELETE FROM favorite_stores WHERE user_id = $1", u_id)
            await conn.execute("DELETE FROM users WHERE supabase_uid = $1", u_id)

    if settings.supabase_service_role_key:
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{settings.supabase_url}/auth/v1/admin/users/{u_id}",
                headers={
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                },
            )

    await _log_admin_action(
        target_db,
        admin,
        action="user.hard_delete",
        target_user=target_user,
        before=before,
        after={"deleted": True},
    )

    return {"message": "Korisnik je trajno obrisan."}

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
        await _log_admin_action(
            target_db,
            admin,
            action="role.create",
            target_user=None,
            before=None,
            after={"name": role.name, "description": role.description},
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