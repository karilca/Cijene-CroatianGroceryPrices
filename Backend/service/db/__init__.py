from .base import Database

_db: Database | None = None

def set_db(instance: Database) -> None:
    global _db
    _db = instance

async def get_db() -> Database:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db
