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
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        # Legacy fallback only; primary token verification uses Supabase JWKS.
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


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
