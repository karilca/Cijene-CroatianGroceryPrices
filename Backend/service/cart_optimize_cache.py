from __future__ import annotations

import asyncio
import hashlib
import importlib
import json
from logging import getLogger
from math import cos, radians
from time import monotonic
from typing import Any

from service.config import settings

logger = getLogger(__name__)


class _InMemoryTTLCache:
    def __init__(self) -> None:
        self._entries: dict[str, tuple[float, str]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> str | None:
        now = monotonic()
        async with self._lock:
            item = self._entries.get(key)
            if item is None:
                return None

            expires_at, value = item
            if expires_at <= now:
                self._entries.pop(key, None)
                return None

            return value

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        expires_at = monotonic() + max(1, ttl_seconds)
        async with self._lock:
            self._entries[key] = (expires_at, value)


class CartOptimizeCache:
    def __init__(self) -> None:
        self._memory = _InMemoryTTLCache()
        self._redis: Any = None
        self._initialized = False
        self._effective_backend = "none"

    async def initialize(self) -> None:
        if self._initialized:
            return

        self._initialized = True
        if not settings.cart_optimize_cache_enabled:
            self._effective_backend = "none"
            return

        backend = settings.cart_optimize_cache_backend
        if backend == "redis":
            redis_class = _load_redis_class()
            if redis_class is None:
                logger.warning(
                    "Cart optimize cache backend is redis, but redis package is not installed; falling back to memory cache."
                )
                self._effective_backend = "memory"
                return

            try:
                redis_client = redis_class.from_url(
                    settings.cart_optimize_cache_redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await redis_client.ping()
                self._redis = redis_client
                self._effective_backend = "redis"
                return
            except Exception as exc:
                logger.warning(
                    "Redis cache is unavailable (%s); falling back to memory cache.",
                    exc,
                )
                self._redis = None
                self._effective_backend = "memory"
                return

        self._effective_backend = "memory"

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    @property
    def effective_backend(self) -> str:
        return self._effective_backend

    async def get_json(self, key: str) -> dict[str, Any] | None:
        raw = await self._get_raw(key)
        if raw is None:
            return None

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return None

        if not isinstance(parsed, dict):
            return None
        return parsed

    async def set_json(self, key: str, value: dict[str, Any]) -> None:
        if self._effective_backend == "none":
            return

        encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        ttl_seconds = settings.cart_optimize_cache_ttl_seconds

        if self._effective_backend == "redis" and self._redis is not None:
            try:
                await self._redis.set(key, encoded, ex=ttl_seconds)
                return
            except Exception as exc:
                logger.warning(
                    "Redis cache write failed (%s); continuing without cache write.",
                    exc,
                )
                return

        await self._memory.set(key, encoded, ttl_seconds=ttl_seconds)

    async def _get_raw(self, key: str) -> str | None:
        if self._effective_backend == "none":
            return None

        if self._effective_backend == "redis" and self._redis is not None:
            try:
                return await self._redis.get(key)
            except Exception as exc:
                logger.warning(
                    "Redis cache read failed (%s); treating as cache miss.",
                    exc,
                )
                return None

        return await self._memory.get(key)


def _load_redis_class() -> type[Any] | None:
    try:
        module = importlib.import_module("redis.asyncio")
    except Exception:
        return None
    return getattr(module, "Redis", None)


def _bucket_coordinate(latitude: float, longitude: float) -> tuple[float, float]:
    bucket_size_m = settings.cart_optimize_cache_location_bucket_m
    lat_step = bucket_size_m / 111_320.0
    lon_scale = max(0.01, cos(radians(latitude)))
    lon_step = bucket_size_m / (111_320.0 * lon_scale)

    lat_bucket = round(latitude / lat_step) * lat_step
    lon_bucket = round(longitude / lon_step) * lon_step
    return (round(lat_bucket, 6), round(lon_bucket, 6))


def build_cart_optimize_cache_key(
    *,
    cart_items: list[dict[str, object]],
    mode: str,
    user_lat: float | None,
    user_lon: float | None,
    max_distance_km: float,
    max_stores: int,
    chains: list[str] | None,
    mode_weight_delta: float = 0.0,
) -> str:
    normalized_items = sorted(
        {
            (
                str(item.get("product_id") or "").strip(),
                max(1, int(item.get("quantity") or 1)),
            )
            for item in cart_items
            if str(item.get("product_id") or "").strip()
        }
    )

    location_bucket = None
    if user_lat is not None and user_lon is not None:
        location_bucket = _bucket_coordinate(user_lat, user_lon)

    payload = {
        "v": settings.cart_optimize_cache_version,
        "mode": mode,
        "locationBucket": location_bucket,
        "maxDistanceKm": round(float(max_distance_km), 3),
        "maxStores": int(max_stores),
        "chains": sorted(chains or []),
        "items": normalized_items,
        "enumLimit": settings.cart_optimize_enum_store_limit,
        "modeWeightDelta": round(float(mode_weight_delta), 4),
    }

    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    ).hexdigest()
    return f"cart-optimize:{settings.cart_optimize_cache_version}:{digest}"


cart_optimize_cache = CartOptimizeCache()
