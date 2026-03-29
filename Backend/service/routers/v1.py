from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import datetime
from uuid import UUID

from service.config import settings
from service.db.models import ChainStats, ProductWithId, StorePrice
from service.auth_utils import get_current_user, get_user_payload


def _extract_email(payload: dict) -> str:
    return (
        payload.get("email")
        or payload.get("user_metadata", {}).get("email")
        or payload.get("app_metadata", {}).get("email")
        or "unknown@mail.com"
    )


def _extract_name(payload: dict, fallback_email: str) -> str:
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}

    name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or app_metadata.get("full_name")
        or app_metadata.get("name")
    )

    normalized = (name or "").strip()
    if normalized:
        return normalized[:255]

    return fallback_email


async def get_current_active_user_for_v1(
    payload: dict = Depends(get_user_payload),
) -> str:
    from fastapi import status
    u_id_str = payload.get("sub")
    if not u_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID missing in authentication token",
        )
    target_db = getattr(db, "_db", getattr(db, "pool", None))

    iat = payload.get("iat")
    if iat and (datetime.datetime.now(datetime.timezone.utc).timestamp() - iat) > 86400:
        raise HTTPException(status_code=401, detail="Sesija istekla.")

    u_id = UUID(u_id_str)
    is_hard_deleted = await target_db.fetchval(
        "SELECT 1 FROM hard_deleted_users WHERE supabase_uid = $1",
        u_id,
    )
    if is_hard_deleted:
        raise HTTPException(status_code=403, detail="Račun je deaktiviran.")

    user = await target_db.fetchrow(
        "SELECT is_active FROM users WHERE supabase_uid = $1",
        u_id,
    )

    if user is None:
        email = _extract_email(payload)
        extracted_name = _extract_name(payload, email)
        user_role_id = await target_db.fetchval("SELECT id FROM roles WHERE name = 'USER'")
        await target_db.execute(
            """INSERT INTO users (name, email, supabase_uid, is_active, role_id, created_at)
               VALUES ($1, $2, $3, true, $4, NOW())
               ON CONFLICT (supabase_uid) DO NOTHING""",
            extracted_name,
            email,
            u_id,
            user_role_id,
        )
        user = await target_db.fetchrow(
            "SELECT is_active FROM users WHERE supabase_uid = $1",
            u_id,
        )

    if user is None or not user["is_active"]:
        raise HTTPException(status_code=403, detail="Račun je deaktiviran.")

    return u_id_str

router = APIRouter(
    tags=["Products, Chains and Stores"],
    dependencies=[Depends(get_current_active_user_for_v1)],
)
db = settings.get_db()
logger = logging.getLogger(__name__)


def normalize_brand_text(value: str | None) -> str | None:
    if not value:
        return None
    stripped = value.strip()
    if not stripped or stripped == "#":
        return None
    return stripped


class ListChainsResponse(BaseModel):
    """List chains response schema."""

    chains: list[str] = Field(..., description="List of retail chain codes.")


@router.get("/chains/", summary="List retail chains")
async def list_chains() -> ListChainsResponse:
    """List all available chains."""
    chains = await db.list_chains()
    return ListChainsResponse(chains=[chain.code for chain in chains])


class StoreResponse(BaseModel):
    """Store response schema."""

    chain_code: str = Field(..., description="Code of the retail chain.")
    code: str = Field(..., description="Unique code of the store.")
    type: str | None = Field(
        ...,
        description="Type of the store (e.g., supermarket, hypermarket).",
    )
    address: str | None = Field(..., description="Physical address of the store.")
    city: str | None = Field(..., description="City where the store is located.")
    zipcode: str | None = Field(..., description="Postal code of the store location.")
    lat: float | None = Field(..., description="Latitude coordinate of the store.")
    lon: float | None = Field(..., description="Longitude coordinate of the store.")
    phone: str | None = Field(..., description="Phone number of the store.")


class ListStoresResponse(BaseModel):
    """List stores response schema."""

    stores: list[StoreResponse] = Field(
        ..., description="List stores for the specified chain."
    )
    total_count: int = Field(..., description="Total number of stores matching the query.")
    page: int = Field(..., description="Current page number.")
    per_page: int = Field(..., description="Number of items per page.")


@router.get(
    "/{chain_code}/stores/",
    summary="List retail chain stores",
)
async def list_stores(chain_code: str) -> ListStoresResponse:
    """
    List all stores (locations) for a particular chain.

    Future plan: Allow filtering by store type and location.
    """
    stores, total_count = await db.list_stores(chain_code)

    if not stores:
        raise HTTPException(status_code=404, detail=f"No chain {chain_code}")

    return ListStoresResponse(
        stores=[
            StoreResponse(
                chain_code=chain_code,
                code=store.code,
                type=store.type,
                address=store.address,
                city=store.city,
                zipcode=store.zipcode,
                lat=store.lat,
                lon=store.lon,
                phone=store.phone,
            )
            for store in stores
        ],
        total_count=total_count,
        page=1,
        per_page=len(stores),
    )


@router.get("/stores/", summary="Search stores")
async def search_stores(
    chains: str = Query(
        None,
        description="Comma-separated list of chain codes to include, or all",
    ),
    city: str = Query(
        None,
        description="City name for case-insensitive and accent-insensitive substring match (đ≈dj)",
    ),
    address: str = Query(
        None,
        description="Address for case-insensitive and accent-insensitive substring match (đ≈dj)",
    ),
    lat: float = Query(
        None,
        description="Latitude coordinate for geolocation search",
    ),
    lon: float = Query(
        None,
        description="Longitude coordinate for geolocation search",
    ),
    d: float = Query(
        10.0,
        description="Distance in kilometers for geolocation search (default: 10.0)",
    ),
    page: int = Query(
        1,
        description="Page number (default: 1)",
    ),
    per_page: int = Query(
        20,
        description="Number of items per page (default: 20, max: 100)",
    ),
) -> ListStoresResponse:
    """
    Search for stores by chain codes, city, address, and/or geolocation.

    City and address filters are case-insensitive and accent-insensitive,
    including đ/dj normalization.

    For geolocation search, both lat and lon must be provided together.
    Note that the geolocation search will only return stores that have
    the geo information available in the database.
    """
    # Validate lat/lon parameters
    if (lat is None) != (lon is None):
        raise HTTPException(
            status_code=400,
            detail="Both latitude and longitude must be provided for geolocation search",
        )

    # Validate pagination
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20
    if per_page > 100:
        per_page = 100

    offset = (page - 1) * per_page

    # Parse chain codes
    chain_codes = None
    if chains:
        chain_codes = [c.strip().lower() for c in chains.split(",") if c.strip()]

    try:
        stores, total_count = await db.filter_stores(
            chain_codes=chain_codes,
            city=city,
            address=address,
            lat=lat,
            lon=lon,
            d=d,
            limit=per_page,
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get chain code mapping for response
    chains_map = {}
    if stores:
        all_chains = await db.list_chains()
        chains_map = {chain.id: chain.code for chain in all_chains}

    return ListStoresResponse(
        stores=[
            StoreResponse(
                chain_code=chains_map.get(store.chain_id, "unknown"),
                code=store.code,
                type=store.type,
                address=store.address,
                city=store.city,
                zipcode=store.zipcode,
                lat=store.lat,
                lon=store.lon,
                phone=store.phone,
            )
            for store in stores
        ],
        total_count=total_count,
        page=page,
        per_page=per_page,
    )


class ChainProductResponse(BaseModel):
    """Chain product with price information response schema."""

    chain: str = Field(..., description="Chain code.")
    code: str = Field(..., description="Product code within the chain.")
    name: str = Field(..., description="Product name within the chain.")
    brand: str | None = Field(..., description="Product brand within the chain.")
    category: str | None = Field(..., description="Product category within the chain.")
    unit: str | None = Field(..., description="Product unit within the chain.")
    quantity: str | None = Field(..., description="Product quantity within the chain.")
    min_price: Decimal = Field(..., description="Minimum price across chain stores.")
    max_price: Decimal = Field(..., description="Maximum price across chain stores.")
    avg_price: Decimal = Field(..., description="Average price across chain stores.")
    price_date: datetime.date = Field(
        ..., description="Date on which this price was published"
    )


class ProductResponse(BaseModel):
    """Basic product information response schema."""

    ean: str = Field(..., description="EAN barcode of the product.")
    brand: str | None = Field(..., description="Brand of the product.")
    name: str | None = Field(..., description="Name of the product.")
    quantity: str | None = Field(..., description="Quantity of the product.")
    unit: str | None = Field(..., description="Unit of the product.")
    chains: list[ChainProductResponse] = Field(
        ..., description="List of chain-specific product information."
    )


class ProductListItemResponse(BaseModel):
    """Lightweight product information for search results."""

    ean: str = Field(..., description="EAN barcode of the product.")
    brand: str | None = Field(..., description="Brand of the product.")
    name: str | None = Field(..., description="Name of the product.")
    quantity: str | None = Field(..., description="Quantity of the product.")
    unit: str | None = Field(..., description="Unit of the product.")


class ProductSearchResponse(BaseModel):
    products: list[ProductListItemResponse] = Field(
        ..., description="List of products matching the search query."
    )
    total_count: int = Field(..., description="Total number of products matching the query.")
    page: int = Field(..., description="Current page number.")
    per_page: int = Field(..., description="Number of items per page.")


async def prepare_product_response(
    products: list[ProductWithId],
    date: datetime.date | None,
    filtered_chains: list[str] | None,
) -> list[ProductResponse]:
    chains = await db.list_chains()
    if filtered_chains:
        chains = [c for c in chains if c.code in filtered_chains]
    chain_id_to_code = {chain.id: chain.code for chain in chains}

    if not date:
        date = datetime.date.today()

    product_ids = [product.id for product in products]

    chain_products = await db.get_chain_products_for_product(
        product_ids,
        [chain.id for chain in chains],
    )

    product_response_map = {
        product.id: ProductResponse(
            ean=product.ean,
            brand=normalize_brand_text(product.brand),
            name=product.name or "",
            quantity=str(product.quantity) if product.quantity else None,
            unit=product.unit,
            chains=[],
        )
        for product in products
    }

    cpr_map = {}
    for cp in chain_products:
        product_id = cp.product_id
        chain = chain_id_to_code[cp.chain_id]

        cpr_data = cp.to_dict()
        cpr_data["chain"] = chain
        cpr_data["brand"] = normalize_brand_text(cpr_data.get("brand"))
        cpr_map[(product_id, chain)] = cpr_data

    prices = await db.get_product_prices(product_ids, date)
    for p in prices:
        product_id = p["product_id"]
        chain = p["chain"]
        cpr_data = cpr_map.get((product_id, chain))
        if not cpr_data:
            continue

        cpr_data["min_price"] = p["min_price"]
        cpr_data["max_price"] = p["max_price"]
        cpr_data["avg_price"] = p["avg_price"]
        cpr_data["price_date"] = p["price_date"]
        product_response_map[product_id].chains.append(ChainProductResponse(**cpr_data))

    # Fixup global product brand and name using chain data
    # Logic here is that the longest string is the most likely to be most useful
    for product in product_response_map.values():
        if not product.brand:
            chain_brands = [cpr.brand for cpr in product.chains if cpr.brand]
            chain_brands.sort(key=lambda x: len(x))
            if chain_brands:
                product.brand = chain_brands[0].capitalize()

        if not product.name:
            chain_names = [cpr.name for cpr in product.chains if cpr.name]
            chain_names.sort(key=lambda x: len(x), reverse=True)
            if chain_names:
                product.name = chain_names[0].capitalize()

    return [p for p in product_response_map.values() if p.chains]


async def prepare_product_list_response(
    products: list[ProductWithId],
) -> list[ProductListItemResponse]:
    def normalize_fallback_text(value: str | None) -> str | None:
        if not value:
            return value
        stripped = value.strip()
        if not stripped:
            return None
        return stripped.capitalize()

    missing_ids = [p.id for p in products if not p.name or not normalize_brand_text(p.brand)]

    fallback: dict[int, dict[str, str | None]] = {}
    if missing_ids:
        chain_products = await db.get_chain_products_for_product(missing_ids)
        for cp in chain_products:
            current = fallback.setdefault(cp.product_id, {"name": None, "brand": None})

            if cp.name and (
                not current["name"] or len(cp.name) > len(current["name"])
            ):
                current["name"] = cp.name

            cp_brand = normalize_brand_text(cp.brand)
            if cp_brand and (
                not current["brand"] or len(cp_brand) > len(current["brand"])
            ):
                current["brand"] = cp_brand

    return [
        ProductListItemResponse(
            ean=product.ean,
            brand=normalize_brand_text(product.brand)
            or normalize_fallback_text(fallback.get(product.id, {}).get("brand")),
            name=product.name
            or normalize_fallback_text(fallback.get(product.id, {}).get("name")),
            quantity=str(product.quantity) if product.quantity else None,
            unit=product.unit,
        )
        for product in products
    ]


@router.get("/products/{ean}/", summary="Get product data/prices by barcode")
async def get_product(
    ean: str,
    date: datetime.date = Query(
        None,
        description="Date in YYYY-MM-DD format, defaults to today",
    ),
    chains: str = Query(
        None,
        description="Comma-separated list of chain codes to include",
    ),
) -> ProductResponse:
    """
    Get product information including chain products and prices by their
    barcode. For products that don't have official EAN codes and use
    chain-specific codes, use the "chain:<product_code>" format.

    The price information is for the last known date earlier than or
    equal to the specified date. If no date is provided, current date is used.
    """

    products = await db.get_products_by_ean([ean])
    if not products:
        raise HTTPException(
            status_code=404,
            detail=f"Product with EAN {ean} not found",
        )

    product_responses = await prepare_product_response(
        products=products,
        date=date,
        filtered_chains=(
            [c.lower().strip() for c in chains.split(",")] if chains else None
        ),
    )

    if not product_responses:
        with_chains = " with specified chains" if chains else ""
        raise HTTPException(
            status_code=404,
            detail=f"No product information found for EAN {ean}{with_chains}",
        )

    return product_responses[0]


class StorePricesResponse(BaseModel):
    store_prices: list[StorePrice] = Field(
        ..., description="For a given product return latest price data per store."
    )


@router.get("/prices/", summary="Get product prices by store with filtering")
async def get_prices(
    eans: str = Query(
        ...,
        description="Comma-separated list of EAN barcodes (required)",
    ),
    chains: str = Query(
        None,
        description="Comma-separated list of chain codes to include",
    ),
    city: str = Query(
        None,
        description="City name for case-insensitive and accent-insensitive substring match (đ≈dj)",
    ),
    address: str = Query(
        None,
        description="Address for case-insensitive and accent-insensitive substring match (đ≈dj)",
    ),
    lat: float = Query(
        None,
        description="Latitude coordinate for geolocation search",
    ),
    lon: float = Query(
        None,
        description="Longitude coordinate for geolocation search",
    ),
    d: float = Query(
        10.0,
        description="Distance in kilometers for geolocation search (default: 10.0)",
    ),
) -> StorePricesResponse:
    """
    Get product prices by store with store filtering capabilities.

    Returns prices for products in stores matching the filter criteria.
    City and address filters are case-insensitive and accent-insensitive,
    including đ/dj normalization.
    For geolocation search, both lat and lon must be provided together.
    The EANs parameter is required and must contain at least one EAN code.
    """
    # Validate EANs parameter
    if not eans or not eans.strip():
        raise HTTPException(
            status_code=400,
            detail="EANs parameter is required and must be non-empty",
        )

    # Parse EAN codes
    ean_list = [e.strip() for e in eans.split(",") if e.strip()]
    if not ean_list:
        raise HTTPException(
            status_code=400,
            detail="At least one valid EAN code must be provided",
        )

    # Validate lat/lon parameters
    if (lat is None) != (lon is None):
        raise HTTPException(
            status_code=400,
            detail="Both latitude and longitude must be provided for geolocation search",
        )

    try:
        # Get products by EANs
        products = await db.get_products_by_ean(ean_list)
        if not products:
            raise HTTPException(
                status_code=404,
                detail=f"No products found for the provided EANs: {eans}",
            )

        # Parse chain codes for store filtering
        chain_codes = None
        if chains:
            chain_codes = [c.strip().lower() for c in chains.split(",") if c.strip()]

        # Filter stores if any filter criteria are provided
        if chain_codes or city or address or lat or lon:
            try:
                filtered_stores, _ = await db.filter_stores(
                    chain_codes=chain_codes,
                    city=city,
                    address=address,
                    lat=lat,
                    lon=lon,
                    d=d,
                    limit=None,  # No limit - we need all stores for price comparison
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

            store_ids = [store.id for store in filtered_stores]
        else:
            # If no filters are applied, get all stores
            store_ids = None

        store_prices = await db.get_product_store_prices(
            product_ids=[product.id for product in products],
            store_ids=store_ids,
        )
        return StorePricesResponse(store_prices=store_prices)
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Prices lookup failed",
            extra={
                "eans": ean_list,
                "chains": chains,
                "city": city,
                "address": address,
                "lat": lat,
                "lon": lon,
                "distance_km": d,
            },
        )
        raise HTTPException(
            status_code=500,
            detail="Price lookup failed. Please retry your query.",
        )


@router.get("/products/", summary="Search for products by name")
async def search_products(
    q: str = Query(..., description="Search query for product names"),
    date: datetime.date = Query(
        None,
        description="Date in YYYY-MM-DD format, defaults to today",
    ),
    chains: str = Query(
        None,
        description="Comma-separated list of chain codes to include",
    ),
    city: str = Query(
        None,
        description="City name for case-insensitive and accent-insensitive filtering",
    ),
    page: int = Query(
        1,
        description="Page number (default: 1)",
    ),
    per_page: int = Query(
        20,
        description="Number of items per page (default: 20, max: 100)",
    ),
) -> ProductSearchResponse:
    """
    Search for products by name.

    Returns a lightweight list of products that match the search query.

    Price and chain-specific details are intentionally omitted for faster
    response times. Use /products/{ean}/ for full product details.
    """
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20
    if per_page > 100:
        per_page = 100

    chain_codes = None
    if chains:
        chain_codes = [c.strip().lower() for c in chains.split(",") if c.strip()]

    if not q.strip():
        return ProductSearchResponse(
            products=[],
            total_count=0,
            page=page,
            per_page=per_page,
        )

    try:
        products, total_count = await db.search_products(
            q,
            chain_codes=chain_codes,
            city=city,
            page=page,
            per_page=per_page,
        )

        product_list = await prepare_product_list_response(products)
    except Exception:
        logger.exception(
            "Product search failed",
            extra={
                "query": q,
                "chains": chain_codes,
                "city": city,
                "page": page,
                "per_page": per_page,
            },
        )
        raise HTTPException(
            status_code=500,
            detail="Product search failed. Please retry your query.",
        )

    return ProductSearchResponse(
        products=product_list,
        total_count=total_count,
        page=page,
        per_page=per_page,
    )


class ProductSuggestResponse(BaseModel):
    products: list[ProductListItemResponse] = Field(
        ..., description="List of product suggestions."
    )


@router.get("/products/suggest", summary="Lightweight product suggestions for autocomplete")
async def suggest_products(
    q: str = Query(..., description="Search query for product names"),
    limit: int = Query(
        8,
        description="Maximum number of suggestions (default: 8, max: 20)",
    ),
) -> ProductSuggestResponse:
    """
    Fast product suggestions for autocomplete.

    Uses only FTS + prefix matching (no fuzzy trigram scoring) for
    significantly faster response times compared to the full search endpoint.
    """
    limit = max(1, min(limit, 20))

    if not q.strip():
        return ProductSuggestResponse(products=[])

    products = await db.suggest_products(q, limit=limit)
    product_list = await prepare_product_list_response(products)
    return ProductSuggestResponse(products=product_list)


class ChainStatsResponse(BaseModel):
    chain_stats: list[ChainStats] = Field(..., description="List chain stats.")


@router.get("/chain-stats/", summary="Return stats of currently loaded data per chain.")
async def chain_stats() -> ChainStatsResponse:
    """Return stats of currently loaded data per chain."""

    chain_stats = await db.list_latest_chain_stats()
    return ChainStatsResponse(chain_stats=chain_stats)
