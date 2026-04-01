import os
from dotenv import load_dotenv

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from service.db.base import Database

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    _db: "Database | None" = None

    def __init__(self):
        self.version: str = os.getenv("VERSION", "0.1.0")
        self.archive_dir: str = os.getenv("ARCHIVE_DIR", "output")
        self.base_url: str = os.getenv("BASE_URL", "http://127.0.0.1:8080")
        self.host: str = os.getenv("HOST", "0.0.0.0")
        self.port: int = int(os.getenv("PORT", "8080"))
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        self.timezone: str = os.getenv("TIMEZONE", "Europe/Zagreb")
        self.redirect_url: str = os.getenv("REDIRECT_URL", "https://cijene.netlify.app/")
        cors_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173")
        self.cors_allow_origins: list[str] = [
            origin.strip()
            for origin in cors_origins_raw.split(",")
            if origin.strip()
        ]

        # Database configuration
        self.db_dsn: str = os.getenv(
            "DB_DSN",
            "postgresql://postgres:postgres@localhost/cijene",
        )
        self.db_min_connections: int = int(os.getenv("DB_MIN_CONNECTIONS", "5"))
        self.db_max_connections: int = int(os.getenv("DB_MAX_CONNECTIONS", "20"))
        self.db_retention_days: int = max(0, int(os.getenv("DB_RETENTION_DAYS", "0")))
        self.audit_log_retention_days: int = max(
            1,
            int(os.getenv("AUDIT_LOG_RETENTION_DAYS", "90")),
        )

        self.search_fts_weight: float = max(
            0.0,
            float(os.getenv("SEARCH_FTS_WEIGHT", "0.70")),
        )
        self.search_prefix_weight: float = max(
            0.0,
            float(os.getenv("SEARCH_PREFIX_WEIGHT", "0.20")),
        )
        self.search_trigram_weight: float = max(
            0.0,
            float(os.getenv("SEARCH_TRIGRAM_WEIGHT", "0.10")),
        )
        self.search_trigram_threshold_short: float = min(
            1.0,
            max(0.0, float(os.getenv("SEARCH_TRIGRAM_THRESHOLD_SHORT", "0.32"))),
        )
        self.search_trigram_threshold_long: float = min(
            1.0,
            max(0.0, float(os.getenv("SEARCH_TRIGRAM_THRESHOLD_LONG", "0.24"))),
        )
        self.search_trigram_long_query_len: int = max(
            1,
            int(os.getenv("SEARCH_TRIGRAM_LONG_QUERY_LEN", "5")),
        )
        self.search_trigram_threshold_multiword: float = min(
            1.0,
            max(0.0, float(os.getenv("SEARCH_TRIGRAM_THRESHOLD_MULTIWORD", "0.22"))),
        )
        self.search_token_avg_weight: float = max(
            0.0,
            float(os.getenv("SEARCH_TOKEN_AVG_WEIGHT", "0.15")),
        )

        self.cart_optimize_default_max_distance_km: float = max(
            1.0,
            float(os.getenv("CART_OPTIMIZE_DEFAULT_MAX_DISTANCE_KM", "15")),
        )
        self.cart_optimize_default_max_stores: int = max(
            1,
            int(os.getenv("CART_OPTIMIZE_DEFAULT_MAX_STORES", "5")),
        )
        self.cart_optimize_enum_store_limit: int = max(
            1,
            int(os.getenv("CART_OPTIMIZE_ENUM_STORE_LIMIT", "20")),
        )
        self.cart_optimize_cache_enabled: bool = (
            os.getenv("CART_OPTIMIZE_CACHE_ENABLED", "true").lower() == "true"
        )
        self.cart_optimize_cache_backend: str = os.getenv(
            "CART_OPTIMIZE_CACHE_BACKEND",
            "memory",
        ).strip().lower()
        if self.cart_optimize_cache_backend not in {"memory", "redis", "none"}:
            self.cart_optimize_cache_backend = "memory"
        self.cart_optimize_cache_ttl_seconds: int = max(
            1,
            int(os.getenv("CART_OPTIMIZE_CACHE_TTL_SECONDS", "900")),
        )
        self.cart_optimize_cache_location_bucket_m: float = max(
            1.0,
            float(os.getenv("CART_OPTIMIZE_CACHE_LOCATION_BUCKET_M", "200")),
        )
        self.cart_optimize_cache_version: str = os.getenv(
            "CART_OPTIMIZE_CACHE_VERSION",
            "v1",
        ).strip() or "v1"
        self.cart_optimize_cache_redis_url: str = os.getenv(
            "CART_OPTIMIZE_CACHE_REDIS_URL",
            "redis://redis:6379/0",
        )
        self.cart_optimize_tuning_enabled: bool = (
            os.getenv("CART_OPTIMIZE_TUNING_ENABLED", "true").lower() == "true"
        )
        self.cart_optimize_tuning_lookback_days: int = max(
            1,
            int(os.getenv("CART_OPTIMIZE_TUNING_LOOKBACK_DAYS", "30")),
        )
        self.cart_optimize_tuning_min_feedback_samples: int = max(
            1,
            int(os.getenv("CART_OPTIMIZE_TUNING_MIN_FEEDBACK_SAMPLES", "20")),
        )
        self.cart_optimize_tuning_acceptance_threshold: float = min(
            0.95,
            max(0.05, float(os.getenv("CART_OPTIMIZE_TUNING_ACCEPTANCE_THRESHOLD", "0.25"))),
        )
        self.cart_optimize_tuning_delta: float = min(
            0.20,
            max(0.0, float(os.getenv("CART_OPTIMIZE_TUNING_DELTA", "0.05"))),
        )
        self.cart_optimize_tuning_cache_ttl_seconds: int = max(
            30,
            int(os.getenv("CART_OPTIMIZE_TUNING_CACHE_TTL_SECONDS", "300")),
        )

        self.supabase_url = os.getenv("SUPABASE_URL", "")
        # Legacy fallback only; primary token verification uses Supabase JWKS.
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


        # Google Maps enrichment configuration
        self.google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
        self.google_maps_timeout_seconds: float = max(
            1.0,
            float(os.getenv("GOOGLE_MAPS_TIMEOUT_SECONDS", "20")),
        )
        self.google_maps_request_delay_seconds: float = max(
            0.0,
            float(os.getenv("GOOGLE_MAPS_REQUEST_DELAY_SECONDS", "0.15")),
        )
        self.google_maps_max_retries: int = max(
            0,
            int(os.getenv("GOOGLE_MAPS_MAX_RETRIES", "3")),
        )
        self.google_maps_retry_backoff_seconds: float = max(
            0.1,
            float(os.getenv("GOOGLE_MAPS_RETRY_BACKOFF_SECONDS", "0.8")),
        )
        self.google_maps_language: str = os.getenv("GOOGLE_MAPS_LANGUAGE", "hr")
        self.google_maps_region: str = os.getenv("GOOGLE_MAPS_REGION", "hr")
        self.google_maps_country_hint: str = os.getenv(
            "GOOGLE_MAPS_COUNTRY_HINT",
            "Croatia",
        )
        self.google_maps_enable_geocoding_fallback: bool = (
            os.getenv("GOOGLE_MAPS_ENABLE_GEOCODING_FALLBACK", "true").lower()
            == "true"
        )

    def get_db(self) -> "Database":
        """
        Get the database instance based on the configured settings.

        This method initializes the singleton database connection
        if it hasn't been done yet, and returns the instance.

        Returns:
            An instance of the Database subclass based on the DSN.

        """
        from service.db.base import Database

        if self._db is None:
            self._db = Database.from_url(
                self.db_dsn,
                min_size=self.db_min_connections,
                max_size=self.db_max_connections,
            )

        return self._db


settings = Settings()
