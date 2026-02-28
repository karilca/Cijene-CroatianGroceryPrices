from contextlib import asynccontextmanager
import asyncpg
from typing import (
    AsyncGenerator,
    AsyncIterator,
    List,
    Any,
)
import logging
import re
import os
from datetime import date, timedelta
from .base import Database
from .models import (
    Chain,
    ChainStats,
    ChainWithId,
    Product,
    ProductWithId,
    Store,
    ChainProduct,
    Price,
    StorePrice,
    StoreWithId,
    ChainProductWithId,
    User,
)
from service.config import settings


class PostgresDatabase(Database):
    """PostgreSQL implementation of the database interface using asyncpg."""

    def __init__(self, dsn: str, min_size: int = 10, max_size: int = 30):
        """Initialize the PostgreSQL database connection pool.

        Args:
            dsn: Database connection string
            min_size: Minimum number of connections in the pool
            max_size: Maximum number of connections in the pool
        """
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self.pool = None
        self.logger = logging.getLogger(__name__)

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(
            dsn=self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
        )

    @asynccontextmanager
    async def _get_conn(self) -> AsyncGenerator[asyncpg.Connection]:
        """Context manager to acquire a connection from the pool."""
        if not self.pool:
            raise RuntimeError("Database pool is not initialized")
        async with self.pool.acquire() as conn:
            yield conn

    @asynccontextmanager
    async def _atomic(self) -> AsyncIterator[asyncpg.Connection]:
        """Context manager for atomic transactions."""
        async with self._get_conn() as conn:
            async with conn.transaction():
                yield conn

    async def close(self) -> None:
        """Close all database connections."""
        if self.pool:
            await self.pool.close()

    async def create_tables(self) -> None:
        schema_path = os.path.join(os.path.dirname(__file__), "psql.sql")

        try:
            with open(schema_path, "r") as f:
                schema_sql = f.read()

            async with self._get_conn() as conn:
                await conn.execute(schema_sql)
                self.logger.info("Database tables created successfully")
        except Exception as e:
            self.logger.error(f"Error creating tables: {e}")
            raise

    async def prune_old_price_data(
        self, retention_days: int, batch_size: int = 10_000
    ) -> dict[str, int]:
        if retention_days <= 0:
            return {"prices": 0, "chain_prices": 0, "chain_stats": 0}

        cutoff_date = date.today() - timedelta(days=retention_days)
        deleted: dict[str, int] = {"prices": 0, "chain_prices": 0, "chain_stats": 0}

        tables = ["prices", "chain_prices", "chain_stats"]
        for table in tables:
            total = 0
            while True:
                async with self._atomic() as conn:
                    result = await conn.execute(
                        f"""
                        DELETE FROM {table}
                        WHERE ctid = ANY(
                            ARRAY(
                                SELECT ctid FROM {table}
                                WHERE price_date < $1
                                LIMIT $2
                            )
                        )
                        """,
                        cutoff_date,
                        batch_size,
                    )
                    rows_deleted = int(result.split()[-1])
                    total += rows_deleted
                    if rows_deleted < batch_size:
                        break
                self.logger.debug(
                    "Pruned %s rows from %s so far (%s total)",
                    rows_deleted,
                    table,
                    total,
                )
            deleted[table] = total

        self.logger.info(
            "Pruned data older than %s (retention=%s days): prices=%s, chain_prices=%s, chain_stats=%s",
            cutoff_date.isoformat(),
            retention_days,
            deleted["prices"],
            deleted["chain_prices"],
            deleted["chain_stats"],
        )
        return deleted

    async def analyze_tables(self, tables: list[str]) -> None:
        if not tables:
            return

        allowed_tables = {
            "users",
            "chains",
            "chain_stats",
            "stores",
            "products",
            "chain_products",
            "prices",
            "chain_prices",
        }

        invalid_tables = [t for t in tables if t not in allowed_tables]
        if invalid_tables:
            raise ValueError(f"Unsupported table names for ANALYZE: {invalid_tables}")

        async with self._get_conn() as conn:
            for table in tables:
                await conn.execute(f"ANALYZE {table}")

    async def _fetchval(self, query: str, *args: Any) -> Any:
        async with self._get_conn() as conn:
            return await conn.fetchval(query, *args)

    async def get_product_barcodes(self) -> dict[str, int]:
        async with self._get_conn() as conn:
            rows = await conn.fetch("SELECT id, ean FROM products")
            return {row["ean"]: row["id"] for row in rows}

    async def get_chain_product_map(self, chain_id: int) -> dict[str, int]:
        async with self._get_conn() as conn:
            rows = await conn.fetch(
                """
                SELECT code, id FROM chain_products WHERE chain_id = $1
                """,
                chain_id,
            )
            return {row["code"]: row["id"] for row in rows}

    async def add_chain(self, chain: Chain) -> int:
        async with self._atomic() as conn:
            chain_id = await conn.fetchval(
                "SELECT id FROM chains WHERE code = $1",
                chain.code,
            )
            if chain_id is not None:
                return chain_id
            chain_id = await conn.fetchval(
                "INSERT INTO chains (code) VALUES ($1) RETURNING id",
                chain.code,
            )
            if chain_id is None:
                raise RuntimeError(f"Failed to insert chain {chain.code}")
            return chain_id

    async def list_chains(self) -> list[ChainWithId]:
        async with self._get_conn() as conn:
            rows = await conn.fetch("SELECT id, code FROM chains")
            return [ChainWithId(**row) for row in rows]  # type: ignore

    async def list_latest_chain_stats(self) -> list[ChainStats]:
        async with self._get_conn() as conn:
            rows = await conn.fetch("""
                SELECT
                    c.code AS chain_code,
                    cs.price_date,
                    cs.price_count,
                    cs.store_count,
                    cs.created_at
                FROM chains c
                JOIN LATERAL (
                    SELECT *
                    FROM chain_stats
                    WHERE chain_id = c.id
                    ORDER BY price_date DESC
                    LIMIT 1
                ) cs ON true;
            """)
            return [ChainStats(**row) for row in rows]  # type: ignore

    async def add_store(self, store: Store) -> int:
        return await self._fetchval(
            """
            INSERT INTO stores (chain_id, code, type, address, city, zipcode)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (chain_id, code) DO UPDATE SET
                type = COALESCE($3, stores.type),
                address = COALESCE($4, stores.address),
                city = COALESCE($5, stores.city),
                zipcode = COALESCE($6, stores.zipcode)
            RETURNING id
            """,
            store.chain_id,
            store.code,
            store.type,
            store.address or None,
            store.city or None,
            store.zipcode or None,
        )

    async def add_many_stores(self, stores: list[Store]) -> dict[str, int]:
        if not stores:
            return {}

        chain_id = stores[0].chain_id
        if any(store.chain_id != chain_id for store in stores):
            raise ValueError("All stores in add_many_stores must belong to same chain")

        async with self._atomic() as conn:
            await conn.execute(
                """
                CREATE TEMP TABLE temp_stores (
                    chain_id INTEGER,
                    code VARCHAR(100),
                    type VARCHAR(100),
                    address VARCHAR(255),
                    city VARCHAR(100),
                    zipcode VARCHAR(20)
                )
                """
            )

            await conn.copy_records_to_table(
                "temp_stores",
                records=(
                    (
                        store.chain_id,
                        store.code,
                        store.type,
                        store.address or None,
                        store.city or None,
                        store.zipcode or None,
                    )
                    for store in stores
                ),
            )

            await conn.execute(
                """
                INSERT INTO stores (chain_id, code, type, address, city, zipcode)
                SELECT chain_id, code, type, address, city, zipcode
                FROM temp_stores
                ON CONFLICT (chain_id, code) DO UPDATE SET
                    type = COALESCE(EXCLUDED.type, stores.type),
                    address = COALESCE(EXCLUDED.address, stores.address),
                    city = COALESCE(EXCLUDED.city, stores.city),
                    zipcode = COALESCE(EXCLUDED.zipcode, stores.zipcode)
                """
            )

            rows = await conn.fetch(
                """
                SELECT DISTINCT s.code, s.id
                FROM stores s
                JOIN temp_stores t
                  ON t.chain_id = s.chain_id
                 AND t.code = s.code
                """
            )

            await conn.execute("DROP TABLE temp_stores")

            return {row["code"]: row["id"] for row in rows}

    async def update_store(
        self,
        chain_id: int,
        store_code: str,
        *,
        address: str | None = None,
        city: str | None = None,
        zipcode: str | None = None,
        lat: float | None = None,
        lon: float | None = None,
        phone: str | None = None,
    ) -> bool:
        """
        Update store information by chain_id and store code.
        Returns True if the store was updated, False if not found.
        """
        async with self._get_conn() as conn:
            result = await conn.execute(
                """
                UPDATE stores
                SET
                    address = COALESCE($3, stores.address),
                    city = COALESCE($4, stores.city),
                    zipcode = COALESCE($5, stores.zipcode),
                    lat = COALESCE($6, stores.lat),
                    lon = COALESCE($7, stores.lon),
                    phone = COALESCE($8, stores.phone)
                WHERE chain_id = $1 AND code = $2
                """,
                chain_id,
                store_code,
                address or None,
                city or None,
                zipcode or None,
                lat or None,
                lon or None,
                phone or None,
            )
            _, rowcount = result.split(" ")
            return int(rowcount) == 1

    async def list_stores(
        self, chain_code: str, limit: int = 1000, offset: int = 0
    ) -> tuple[list[StoreWithId], int]:
        async with self._get_conn() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    count(*) OVER() as total_count,
                    s.id, s.chain_id, s.code, s.type, s.address, s.city, s.zipcode,
                    s.lat, s.lon, s.phone
                FROM stores s
                JOIN chains c ON s.chain_id = c.id
                WHERE c.code = $1
                ORDER BY s.code
                LIMIT $2 OFFSET $3
                """,
                chain_code,
                limit,
                offset,
            )

            if not rows:
                 return [], 0
            
            # Helper to strip extra columns
            def to_store(row):
                d = dict(row)
                d.pop("total_count", None)
                return StoreWithId(**d)

            return [to_store(row) for row in rows], rows[0]["total_count"]  # type: ignore

    async def filter_stores(
        self,
        chain_codes: list[str] | None = None,
        city: str | None = None,
        address: str | None = None,
        lat: float | None = None,
        lon: float | None = None,
        d: float = 10.0,
        limit: int | None = 20,
        offset: int = 0,
    ) -> tuple[list[StoreWithId], int]:
        # Validate lat/lon parameters
        if (lat is None) != (lon is None):
            raise ValueError(
                "Both lat and lon must be provided together, or both must be None"
            )

        async with self._get_conn() as conn:
            # Build the query dynamically based on provided filters
            where_conditions = []
            params = []
            param_counter = 1

            def normalized_like_expr(column_expr: str, param_idx: int) -> str:
                return (
                    "hr_search_normalize(coalesce(" + column_expr + ", '')) "
                    "LIKE '%' || hr_search_normalize($" + str(param_idx) + ") || '%'"
                )

            # Chain codes filter
            if chain_codes:
                where_conditions.append(f"c.code = ANY(${param_counter})")
                params.append(chain_codes)
                param_counter += 1

            # City filter (case-insensitive and accent-insensitive substring match)
            if city:
                where_conditions.append(normalized_like_expr("s.city", param_counter))
                params.append(city)
                param_counter += 1

            # Address filter (case-insensitive and accent-insensitive substring match)
            if address:
                where_conditions.append(normalized_like_expr("s.address", param_counter))
                params.append(address)
                param_counter += 1

            # Geolocation filter using computed earth_point column
            if lat is not None and lon is not None:
                where_conditions.append(
                    f"s.earth_point IS NOT NULL AND "
                    f"earth_distance(s.earth_point, ll_to_earth(${param_counter}, ${param_counter + 1})) <= ${param_counter + 2}"
                )
                params.extend([lat, lon, d * 1000])  # Convert km to meters
                param_counter += 3

            # Build the complete query
            base_query = """
                SELECT
                    s.id, s.chain_id, s.code, s.type, s.address, s.city, s.zipcode,
                    s.lat, s.lon, s.phone
                FROM stores s
                JOIN chains c ON s.chain_id = c.id
            """

            query = base_query + (
                " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            )

            # Add count over window function to get total items without second query
            count_query = query.replace(
                "SELECT", "SELECT count(*) OVER() as total_count,", 1
            )
            
            # Only add LIMIT/OFFSET if limit is specified (for pagination)
            if limit is not None:
                final_query = count_query + f" ORDER BY c.code, s.code LIMIT ${param_counter} OFFSET ${param_counter + 1}"
                params.extend([limit, offset])
            else:
                final_query = count_query + " ORDER BY c.code, s.code"

            rows = await conn.fetch(final_query, *params)
            
            if not rows:
                return [], 0
                
            # Helper to strip extra columns
            def to_store(row):
                d = dict(row)
                d.pop("total_count", None)
                return StoreWithId(**d)

            return [to_store(row) for row in rows], rows[0]["total_count"]  # type: ignore

    async def add_ean(self, ean: str) -> int:
        """
        Add an empty product with only EAN barcode info.

        Args:
            ean: The EAN code to add.

        Returns:
            The database ID of the created product.
        """
        return await self._fetchval(
            "INSERT INTO products (ean) VALUES ($1) RETURNING id",
            ean,
        )

    async def add_many_eans(self, eans: list[str]) -> dict[str, int]:
        if not eans:
            return {}

        async with self._atomic() as conn:
            await conn.execute(
                """
                CREATE TEMP TABLE temp_eans (
                    ean VARCHAR(50)
                )
                """
            )

            await conn.copy_records_to_table(
                "temp_eans",
                records=((ean,) for ean in eans),
            )

            await conn.execute(
                """
                INSERT INTO products (ean)
                SELECT DISTINCT ean
                FROM temp_eans
                ON CONFLICT (ean) DO NOTHING
                """
            )

            rows = await conn.fetch(
                """
                SELECT DISTINCT p.ean, p.id
                FROM products p
                JOIN temp_eans t ON t.ean = p.ean
                """
            )

            await conn.execute("DROP TABLE temp_eans")

            return {row["ean"]: row["id"] for row in rows}

    async def get_products_by_ean(self, ean: list[str]) -> list[ProductWithId]:
        async with self._get_conn() as conn:
            rows = await conn.fetch(
                """
                SELECT id, ean, brand, name, quantity, unit
                FROM products WHERE ean = ANY($1)
                """,
                ean,
            )
            return [ProductWithId(**row) for row in rows]  # type: ignore

    async def get_product_store_prices(
        self,
        product_ids: list[int],
        store_ids: list[int] | None = None,
    ) -> list[StorePrice]:
        async with self._get_conn() as conn:
            query = """
                WITH chains_dates AS (
                  -- Find the latest loaded data per chain
                    SELECT DISTINCT ON (chain_id) chain_id, price_date AS last_price_date
                    FROM chain_stats
                    ORDER BY chain_id, price_date DESC
                )
                SELECT
                    chains.id AS chain_id,
                    chains.code AS chain_code,
                    products.ean,
                    prices.price_date,
                    prices.regular_price,
                    prices.special_price,
                    prices.best_price_30,
                    prices.unit_price,
                    prices.anchor_price,
                    stores.code AS store_code,
                    stores.type,
                    stores.address,
                    stores.city,
                    stores.zipcode,
                    stores.lat,
                    stores.lon,
                    stores.phone
                FROM chains_dates
                JOIN chains ON chains.id = chains_dates.chain_id
                JOIN chain_products ON chain_products.chain_id = chains.id
                JOIN products ON products.id = chain_products.product_id
                JOIN prices ON prices.chain_product_id = chain_products.id
                           AND prices.price_date = chains_dates.last_price_date
                JOIN stores ON stores.id = prices.store_id
                WHERE products.id = ANY($1)
            """

            params = [product_ids]
            param_idx = 2

            if store_ids is not None:
                query += f" AND stores.id = ANY(${param_idx})"
                params.append(store_ids)
                param_idx += 1

            rows = await conn.fetch(query, *params)

            return [
                StorePrice(
                    chain=row["chain_code"],
                    ean=row["ean"],
                    price_date=row["price_date"],
                    regular_price=row["regular_price"],
                    special_price=row["special_price"],
                    unit_price=row["unit_price"],
                    best_price_30=row["best_price_30"],
                    anchor_price=row["anchor_price"],
                    store=Store(
                        chain_id=row["chain_id"],
                        code=row["store_code"],
                        type=row["type"],
                        address=row["address"],
                        city=row["city"],
                        zipcode=row["zipcode"],
                        lat=row["lat"],
                        lon=row["lon"],
                        phone=row["phone"],
                    ),
                )
                for row in rows
            ]

    async def update_product(self, product: Product) -> bool:
        """
        Update product information by EAN code.

        Args:
            product: Product object containing the EAN and fields to update.
                    Only non-None fields will be updated in the database.

        Returns:
            True if the product was updated, False if not found.
        """
        async with self._get_conn() as conn:
            result = await conn.execute(
                """
                UPDATE products
                SET
                    brand = COALESCE($2, products.brand),
                    name = COALESCE($3, products.name),
                    quantity = COALESCE($4, products.quantity),
                    unit = COALESCE($5, products.unit)
                WHERE ean = $1
                """,
                product.ean,
                product.brand,
                product.name,
                product.quantity,
                product.unit,
            )
            _, rowcount = result.split(" ")
            return int(rowcount) == 1

    async def get_chain_products_for_product(
        self,
        product_ids: list[int],
        chain_ids: list[int] | None = None,
    ) -> list[ChainProductWithId]:
        async with self._get_conn() as conn:
            if chain_ids:
                # Use ANY for filtering by chain IDs
                query = """
                    SELECT
                        id, chain_id, product_id, code, name, brand,
                        category, unit, quantity
                    FROM chain_products
                    WHERE product_id = ANY($1) AND chain_id = ANY($2)
                """
                rows = await conn.fetch(query, product_ids, chain_ids)
            else:
                # Original query when no chain filtering
                query = """
                    SELECT
                        id, chain_id, product_id, code, name, brand,
                        category, unit, quantity
                    FROM chain_products
                    WHERE product_id = ANY($1)
                """
                rows = await conn.fetch(query, product_ids)
            return [ChainProductWithId(**row) for row in rows]  # type: ignore

    async def search_products(
        self,
        query: str,
        chain_codes: list[str] | None = None,
        city: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[ProductWithId], int]:
        if not query.strip():
            return [], 0

        page = max(1, page)
        per_page = max(1, min(per_page, 100))
        offset = (page - 1) * per_page

        # Cap tokens to avoid overly complex SQL
        MAX_QUERY_TOKENS = 6
        MAX_FUZZY_TOKENS = 3

        normalized_query = query.strip().lower()
        # Use \w+ to correctly tokenize Croatian chars (š, č, ć, ž, đ)
        query_tokens = re.findall(r"\w+", normalized_query)[:MAX_QUERY_TOKENS]
        first_token = query_tokens[0] if query_tokens else normalized_query
        token_count = len(query_tokens)

        trigram_threshold = (
            settings.search_trigram_threshold_long
            if len(normalized_query) >= settings.search_trigram_long_query_len
            else settings.search_trigram_threshold_short
        )

        # Per-token % operator threshold — lower for multi-word
        # because individual short tokens yield lower similarity scores
        if token_count == 1:
            trigram_operator_threshold = min(trigram_threshold, 0.18)
        else:
            trigram_operator_threshold = min(
                trigram_threshold, settings.search_trigram_threshold_multiword
            )

        async with self._get_conn() as conn:
            where_conditions: list[str] = []
            params: list[Any] = [
                query,                                    # $1 — raw query
                first_token,                              # $2 — first token
                trigram_threshold,                         # $3 — trigram threshold
                settings.search_fts_weight,                # $4 — FTS weight
                settings.search_prefix_weight,             # $5 — prefix weight
                settings.search_trigram_weight,             # $6 — trigram weight
                token_count,                               # $7 — token count
                per_page,                                  # $8 — LIMIT
                offset,                                    # $9 — OFFSET
            ]
            param_counter = len(params) + 1  # starts at 10

            if chain_codes:
                where_conditions.append(f"c.code = ANY(${param_counter})")
                params.append(chain_codes)
                param_counter += 1

            if city:
                where_conditions.append(
                    "EXISTS ("
                    " SELECT 1"
                    " FROM chain_products cp_city"
                    " JOIN prices pr_city ON pr_city.chain_product_id = cp_city.id"
                    " JOIN stores s_city ON s_city.id = pr_city.store_id"
                    " WHERE cp_city.product_id = cp.product_id"
                    f"   AND hr_search_normalize(coalesce(s_city.city, '')) LIKE '%' || hr_search_normalize(${param_counter}) || '%'"
                    ")"
                )
                params.append(city)
                param_counter += 1

            # --- Reusable SQL expressions ---
            search_doc = (
                "hr_search_normalize(coalesce(cp.name, '') || ' ' || coalesce(cp.brand, ''))"
            )
            candidate_filter = ""
            if where_conditions:
                candidate_filter = " AND " + " AND ".join(where_conditions)

            matched_doc = (
                "hr_search_normalize(coalesce(mr.name, '') || ' ' || coalesce(mr.brand, ''))"
            )

            # ============================================================
            # Dynamic SQL fragments for multi-word queries
            # Only add per-token params when token_count > 1 so that
            # every $N in the SQL has a matching entry in params.
            # ============================================================

            token_param_indices: list[int] = []
            token_avg_weight_idx: int | None = None

            if token_count > 1:
                # Pass every token as a separate parameter
                for token in query_tokens:
                    params.append(token)
                    token_param_indices.append(param_counter)
                    param_counter += 1

                # token_avg_weight as a parameter for the ranking formula
                token_avg_weight_idx = param_counter
                params.append(settings.search_token_avg_weight)
                param_counter += 1

            # 1) Prefix UNION — check ALL tokens, not just the first
            if token_count > 1 and token_param_indices:
                prefix_or = " OR ".join(
                    f"hr_search_normalize(coalesce(cp.name, '')) LIKE hr_search_normalize(${i}) || '%'"
                    for i in token_param_indices
                )
                prefix_where = f"({prefix_or})"
            else:
                prefix_where = (
                    "hr_search_normalize(coalesce(cp.name, '')) LIKE hr_search_normalize($2) || '%'"
                )

            # 2) NEW 4th UNION branch — per-token fuzzy via % (GIN-indexed)
            #    Uses only the longest tokens for efficient index scans.
            if token_count > 1 and token_param_indices:
                sorted_by_len = sorted(
                    zip(query_tokens, token_param_indices),
                    key=lambda x: len(x[0]),
                    reverse=True,
                )
                fuzzy_indices = [idx for _, idx in sorted_by_len[:MAX_FUZZY_TOKENS]]
                fuzzy_or = " OR ".join(
                    f"{search_doc} % hr_search_normalize(${i})"
                    for i in fuzzy_indices
                )
                multi_word_fuzzy_union = f"""
                    UNION

                    SELECT cp.id, cp.product_id, cp.chain_id, cp.name, cp.brand
                    FROM chain_products cp
                    JOIN chains c ON c.id = cp.chain_id
                    WHERE
                        $7 > 1
                        AND ({fuzzy_or})
                        {candidate_filter}
                """
            else:
                multi_word_fuzzy_union = ""

            # 3) Prefix bonus in scoring — match any token prefix
            if token_count > 1 and token_param_indices:
                pb_or = " OR ".join(
                    f"hr_search_normalize(coalesce(mr.name, '')) LIKE hr_search_normalize(${i}) || '%'"
                    for i in token_param_indices
                )
                prefix_bonus_sql = (
                    f"MAX(CASE WHEN {pb_or} THEN 1.0 ELSE 0.0 END) AS prefix_bonus"
                )
            else:
                prefix_bonus_sql = (
                    "MAX(CASE WHEN hr_search_normalize(coalesce(mr.name, '')) "
                    "LIKE hr_search_normalize($2) || '%' THEN 1.0 ELSE 0.0 END) AS prefix_bonus"
                )

            # 4) avg_token_similarity — average word_similarity per token
            #    Only computed on the small matched_rows set, so it's fast.
            if token_count > 1 and token_param_indices:
                sim_parts = " + ".join(
                    f"word_similarity(hr_search_normalize(${i}), {matched_doc})"
                    for i in token_param_indices
                )
                avg_token_sim_sql = (
                    f",MAX(({sim_parts}) / {token_count}::float) AS avg_token_similarity"
                )
            else:
                avg_token_sim_sql = ",0.0 AS avg_token_similarity"

            # 5) Ranking ELSE clause — only reference $token_avg_weight_idx
            #    when it actually exists in params (multi-word).
            if token_count > 1 and token_avg_weight_idx is not None:
                ranking_else_sql = (
                    f"0.20 * COALESCE(phrase_bonus, 0.0)\n"
                    f"                                    + 0.10 * COALESCE(token_similarity, 0.0)\n"
                    f"                                    + ${token_avg_weight_idx} * COALESCE(avg_token_similarity, 0.0)"
                )
            else:
                ranking_else_sql = (
                    "0.20 * COALESCE(phrase_bonus, 0.0)\n"
                    "                                    + 0.10 * COALESCE(token_similarity, 0.0)"
                )

            # ============================================================
            # Final query
            # ============================================================
            query_sql = f"""
                WITH matched_rows AS (
                    -- Branch 1: Full-text search (exact word matching via GIN tsvector)
                    SELECT cp.id, cp.product_id, cp.chain_id, cp.name, cp.brand
                    FROM chain_products cp
                    JOIN chains c ON c.id = cp.chain_id
                    WHERE
                        to_tsvector('simple', {search_doc}) @@
                        plainto_tsquery('simple', hr_search_normalize($1))
                        {candidate_filter}

                    UNION

                    -- Branch 2: Prefix matching (all tokens, via GIN trigram)
                    SELECT cp.id, cp.product_id, cp.chain_id, cp.name, cp.brand
                    FROM chain_products cp
                    JOIN chains c ON c.id = cp.chain_id
                    WHERE
                        {prefix_where}
                        {candidate_filter}

                    UNION

                    -- Branch 3: Whole-document trigram fuzzy (single-word only)
                    SELECT cp.id, cp.product_id, cp.chain_id, cp.name, cp.brand
                    FROM chain_products cp
                    JOIN chains c ON c.id = cp.chain_id
                    WHERE
                        $7 = 1
                        AND {search_doc} % hr_search_normalize($1)
                        {candidate_filter}

                    {multi_word_fuzzy_union}
                ),
                candidate_products AS (
                    SELECT
                        p.ean,
                        mr.product_id,
                        COUNT(DISTINCT mr.chain_id) AS chain_count,
                        MAX(
                            ts_rank_cd(
                                to_tsvector('simple', {matched_doc}),
                                plainto_tsquery('simple', hr_search_normalize($1))
                            )
                        ) AS fts_rank,
                        {prefix_bonus_sql},
                        MAX(
                            GREATEST(
                                similarity({matched_doc}, hr_search_normalize($1)),
                                word_similarity(hr_search_normalize($1), {matched_doc})
                            )
                        ) AS trigram_score
                        ,MAX(
                            GREATEST(
                                word_similarity(
                                    hr_search_normalize($2),
                                    hr_search_normalize(coalesce(mr.name, ''))
                                ),
                                strict_word_similarity(
                                    hr_search_normalize($2),
                                    hr_search_normalize(coalesce(mr.name, ''))
                                )
                            )
                        ) AS token_similarity
                        ,MAX(
                            CASE
                                WHEN {matched_doc} LIKE '%' || hr_search_normalize($1) || '%' THEN 1.0
                                ELSE 0.0
                            END
                        ) AS phrase_bonus
                        {avg_token_sim_sql}
                    FROM matched_rows mr
                    JOIN products p ON p.id = mr.product_id
                    GROUP BY p.id, p.ean, mr.product_id
                ),
                ranked_products AS (
                    SELECT
                        ean,
                        chain_count,
                        (
                            $4 * COALESCE(fts_rank, 0.0)
                            + $5 * COALESCE(prefix_bonus, 0.0)
                            + $6 * GREATEST(COALESCE(trigram_score, 0.0), 0.0)
                            + CASE
                                WHEN $7 = 1 THEN
                                    0.35 * COALESCE(token_similarity, 0.0)
                                ELSE
                                    {ranking_else_sql}
                              END
                        ) AS relevance
                    FROM candidate_products
                    WHERE
                        COALESCE(fts_rank, 0.0) > 0
                        OR COALESCE(prefix_bonus, 0.0) > 0
                        OR COALESCE(trigram_score, 0.0) >= $3
                        OR COALESCE(avg_token_similarity, 0.0) >= $3
                ),
                paged AS (
                    SELECT
                        ean,
                        COUNT(*) OVER() AS total_count,
                        relevance,
                        chain_count
                    FROM ranked_products
                    ORDER BY relevance DESC, chain_count DESC, ean ASC
                    LIMIT $8 OFFSET $9
                )
                SELECT ean, total_count
                FROM paged
                ORDER BY relevance DESC, chain_count DESC, ean ASC
            """

            try:
                await conn.execute(
                    "SELECT set_config('pg_trgm.similarity_threshold', $1, false)",
                    str(trigram_operator_threshold),
                )
                rows = await conn.fetch(query_sql, *params)
            finally:
                await conn.execute(
                    "SELECT set_config('pg_trgm.similarity_threshold', $1, false)",
                    "0.3",
                )

        if not rows:
            return [], 0

        eans = [row["ean"] for row in rows]
        total_count = int(rows[0]["total_count"])

        products = await self.get_products_by_ean(eans)
        ean_order = {ean: idx for idx, ean in enumerate(eans)}
        products.sort(key=lambda p: ean_order.get(p.ean, float("inf")))
        return products, total_count

    async def get_product_prices(
        self, product_ids: list[int], date: date
    ) -> list[dict[str, Any]]:
        async with self._get_conn() as conn:
            return await conn.fetch(
                """
                WITH chains_dates AS (
                    -- Find the latest loaded data per chain
                   SELECT DISTINCT ON (chain_id) chain_id, price_date AS last_price_date
                   FROM chain_stats
                   WHERE price_date <= $2
                   ORDER BY chain_id, price_date DESC
                )
                SELECT chains.code AS chain,
                       chain_products.product_id,
                       chain_prices.min_price,
                       chain_prices.max_price,
                       chain_prices.avg_price,
                       chain_prices.price_date
                FROM chains_dates
                JOIN chains ON chains.id = chains_dates.chain_id
                JOIN chain_products ON chain_products.chain_id = chains.id
                JOIN chain_prices ON chain_prices.chain_product_id = chain_products.id
                                 AND chain_prices.price_date = chains_dates.last_price_date
                WHERE chain_products.product_id = ANY($1)
                """,
                product_ids,
                date,
            )

    async def add_many_prices(self, prices: list[Price]) -> int:
        async with self._atomic() as conn:
            await conn.execute(
                """
                CREATE TEMP TABLE temp_prices (
                    chain_product_id INTEGER,
                    store_id INTEGER,
                    price_date DATE,
                    regular_price DECIMAL(10, 2),
                    special_price DECIMAL(10, 2),
                    unit_price DECIMAL(10, 2),
                    best_price_30 DECIMAL(10, 2),
                    anchor_price DECIMAL(10, 2)
                )
                """
            )
            await conn.copy_records_to_table(
                "temp_prices",
                records=(
                    (
                        p.chain_product_id,
                        p.store_id,
                        p.price_date,
                        p.regular_price,
                        p.special_price,
                        p.unit_price,
                        p.best_price_30,
                        p.anchor_price,
                    )
                    for p in prices
                ),
            )
            result = await conn.execute(
                """
                INSERT INTO prices(
                    chain_product_id,
                    store_id,
                    price_date,
                    regular_price,
                    special_price,
                    unit_price,
                    best_price_30,
                    anchor_price
                )
                SELECT * from temp_prices
                ON CONFLICT DO NOTHING
                """
            )
            await conn.execute("DROP TABLE temp_prices")
            _, _, rowcount = result.split(" ")
            rowcount = int(rowcount)
            return rowcount

    async def add_many_chain_products(
        self,
        chain_products: List[ChainProduct],
    ) -> int:
        async with self._atomic() as conn:
            await conn.execute(
                """
                CREATE TEMP TABLE temp_chain_products (
                    chain_id INTEGER,
                    product_id INTEGER,
                    code VARCHAR(100),
                    name VARCHAR(255),
                    brand VARCHAR(255),
                    category VARCHAR(255),
                    unit VARCHAR(50),
                    quantity VARCHAR(50)
                )
                """
            )
            await conn.copy_records_to_table(
                "temp_chain_products",
                records=(
                    (
                        cp.chain_id,
                        cp.product_id,
                        cp.code,
                        cp.name,
                        cp.brand,
                        cp.category,
                        cp.unit,
                        cp.quantity,
                    )
                    for cp in chain_products
                ),
            )

            result = await conn.execute(
                """
                INSERT INTO chain_products(
                    chain_id,
                    product_id,
                    code,
                    name,
                    brand,
                    category,
                    unit,
                    quantity
                )
                SELECT * from temp_chain_products
                ON CONFLICT DO NOTHING
                """
            )
            await conn.execute("DROP TABLE temp_chain_products")

            _, _, rowcount = result.split(" ")
            rowcount = int(rowcount)
            return rowcount

    async def compute_chain_prices(self, date: date) -> None:
        async with self._get_conn() as conn:
            await conn.execute(
                """
                INSERT INTO chain_prices (
                    chain_product_id,
                    price_date,
                    min_price,
                    max_price,
                    avg_price
                )
                SELECT
                    chain_product_id,
                    price_date,
                    MIN(
                        LEAST(
                            COALESCE(regular_price, special_price),
                            COALESCE(special_price, regular_price)
                        )
                    ) AS min_price,
                    MAX(
                        LEAST(
                            COALESCE(regular_price, special_price),
                            COALESCE(special_price, regular_price)
                        )
                    ) AS max_price,
                    ROUND(
                        AVG(
                            LEAST(
                                COALESCE(regular_price, special_price),
                                COALESCE(special_price, regular_price)
                            )
                        ),
                        2
                    ) AS avg_price
                FROM prices
                WHERE price_date = $1
                GROUP BY chain_product_id, price_date
                ON CONFLICT (chain_product_id, price_date)
                DO UPDATE SET
                    min_price = EXCLUDED.min_price,
                    max_price = EXCLUDED.max_price,
                    avg_price = EXCLUDED.avg_price;

                """,
                date,
            )

    async def compute_chain_stats(self, date: date) -> None:
        async with self._atomic() as conn:
            # Not doing insert in the same query because that caused deadlocks
            # for reasons which I don't understand.
            stats = await conn.fetch(
                """
                SELECT
                    cp.chain_id,
                    COUNT(*) AS price_count,
                    COUNT(DISTINCT p.store_id) AS store_count
                FROM prices p
                JOIN chain_products cp ON cp.id = p.chain_product_id
                WHERE p.price_date = $1
                GROUP BY cp.chain_id
                """,
                date,
            )

            for record in stats:
                await conn.execute(
                    """
                    INSERT INTO chain_stats(chain_id, price_date, price_count, store_count)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (chain_id, price_date)
                    DO UPDATE SET
                        price_count = EXCLUDED.price_count,
                        store_count = EXCLUDED.store_count;
                    """,
                    record["chain_id"],
                    date,
                    record["price_count"],
                    record["store_count"],
                )

    async def get_user_by_api_key(self, api_key: str) -> User | None:
        async with self._get_conn() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, name, api_key, is_active, created_at
                FROM users
                WHERE
                    api_key = $1 AND
                    is_active = TRUE
                """,
                api_key,
            )

            if row:
                return User(**row)  # type: ignore
            return None
