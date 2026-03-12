from fastapi import FastAPI, Request, Depends, Body, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from service.routers import v0, v1
from service.config import settings
from .auth import get_current_user  # Tvoj stražar

db = settings.get_db()

# --- MODEL ZA PODATKE KOŠARICE ---
class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = 1

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup and shutdown events."""
    await db.connect()
    await db.create_tables()
    # Run prune in background so it doesn't block API startup
    prune_task = None
    if settings.db_retention_days > 0:
        prune_task = asyncio.create_task(
            db.prune_old_price_data(settings.db_retention_days)
        )
    yield
    if prune_task and not prune_task.done():
        prune_task.cancel()
    await db.close()

app = FastAPI(
    title="Cijene API",
    description="Service for product pricing data by Croatian grocery chains",
    version=settings.version,
    debug=settings.debug,
    lifespan=lifespan,
    openapi_components={
        "securitySchemes": {"HTTPBearer": {"type": "http", "scheme": "bearer"}}
    },
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/cart/add", tags=["Cart"])
async def add_to_cart(
    item: CartItemRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        # Čisti INSERT/UPDATE bez provjere vanjskih tablica
        query = """
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id) 
            DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
        """
        
        # Otkrili smo da tvoj objekt treba dohvatiti unutrašnji driver
        target_db = None
        if hasattr(db, '_db'): target_db = db._db
        elif hasattr(db, 'pool'): target_db = db.pool
            
        if target_db:
            # Šaljemo sve kao stringove da izbjegnemo integer greške
            await target_db.execute(query, str(user_id), str(item.product_id), item.quantity)
            return {"status": "success", "message": "Proizvod dodan"}
        else:
            raise AttributeError("Nije pronađen database driver (target_db)")

    except Exception as e:
        logging.error(f"Greška pri dodavanju u košaricu: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # PAZI DA OVO BUDE ISPOD TVOJIH /cart RUTA
app.include_router(v0.router, prefix="/v0")
app.include_router(v1.router, prefix="/v1")

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found. Check documentation at /docs"},
    )

@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirects to main website."""
    return RedirectResponse(url=settings.redirect_url, status_code=302)

@app.get("/health", tags=["Service status"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

def main():
    log_level = logging.DEBUG if settings.debug else logging.INFO
    logging.basicConfig(level=log_level)
    uvicorn.run(
        "service.main:app",
        host=settings.host,
        port=settings.port,
        log_level=log_level,
        reload=settings.debug,
    )

if __name__ == "__main__":
    main()