-- Users table to store API users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    api_key VARCHAR(64) UNIQUE,
    supabase_uid UUID UNIQUE,
    role_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    deleted_reason TEXT,
    deleted_by_supabase_uid UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS supabase_uid UUID,
ADD COLUMN IF NOT EXISTS role_id INTEGER,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by_supabase_uid UUID,
ALTER COLUMN api_key DROP NOT NULL;

-- Ensure uniqueness on supabase_uid for existing installations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'users_supabase_uid_key'
    ) THEN
        CREATE UNIQUE INDEX users_supabase_uid_key ON users (supabase_uid);
    END IF;
END $$;

UPDATE users
SET email = name
WHERE email IS NULL AND name LIKE '%@%';

-- Roles table for auth/authorization
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure role_id FK exists when users table was created before roles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_role_id'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_role_id
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Default roles used by API
INSERT INTO roles (name, description)
VALUES
    ('USER', 'Regular user'),
    ('ADMIN', 'Administrator')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_api_key ON users (api_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid
ON users (supabase_uid)
WHERE supabase_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role_id, is_active);

CREATE TABLE IF NOT EXISTS hard_deleted_users (
    supabase_uid UUID PRIMARY KEY,
    email VARCHAR(255),
    deleted_reason TEXT,
    deleted_by_supabase_uid UUID,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hard_deleted_users_deleted_at ON hard_deleted_users (deleted_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_supabase_uid UUID NOT NULL,
    actor_email VARCHAR(255),
    target_supabase_uid UUID,
    target_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs (actor_supabase_uid);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs (target_supabase_uid);

-- Chains table to store retailer chains
CREATE TABLE IF NOT EXISTS chains (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Chain stats table to store statistics of loaded data per chain
CREATE TABLE IF NOT EXISTS chain_stats (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains (id),
    price_date DATE NOT NULL,
    price_count INTEGER NOT NULL,
    store_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chain_id, price_date)
);

-- Stores table to store retailer locations
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains (id),
    code VARCHAR(100) NOT NULL,
    type VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    zipcode VARCHAR(20),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chain_id, code)
);

-- Add new columns to existing stores table if they don't exist
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Requires "cube" and "earthdistance" extensions for geospatial queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE OR REPLACE FUNCTION hr_search_normalize(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
    SELECT translate(replace(lower(input_text), 'đ', 'dj'), 'ščćž', 'sccz');
$$;

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS earth_point earth GENERATED ALWAYS AS (ll_to_earth (lat, lon)) STORED;
CREATE INDEX IF NOT EXISTS idx_stores_earth_point ON stores USING GIST (earth_point);
CREATE INDEX IF NOT EXISTS idx_stores_city_normalized_trgm ON stores
USING GIN (hr_search_normalize(coalesce(city, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_address_normalized_trgm ON stores
USING GIN (hr_search_normalize(coalesce(address, '')) gin_trgm_ops);

-- Products table to store global product information
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    ean VARCHAR(50) UNIQUE NOT NULL,
    brand VARCHAR(255),
    name VARCHAR(255),
    quantity DECIMAL(10, 3),
    unit VARCHAR(10) CHECK (unit IN ('L', 'kg', 'm', 'kom')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_ean ON products (ean);

-- Chain products table to store retailer-specific product information
CREATE TABLE IF NOT EXISTS chain_products (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains (id),
    product_id INTEGER REFERENCES products (id),
    code VARCHAR(100) NOT NULL,
    brand VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    unit VARCHAR(50),
    quantity VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chain_id, code)
);

CREATE INDEX IF NOT EXISTS idx_chain_products_product_id ON chain_products (product_id);
CREATE INDEX IF NOT EXISTS idx_chain_products_product_chain ON chain_products (product_id, chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_products_search_tsv ON chain_products
USING GIN (to_tsvector('simple', hr_search_normalize(coalesce(name, '') || ' ' || coalesce(brand, ''))));
CREATE INDEX IF NOT EXISTS idx_chain_products_search_trgm ON chain_products
USING GIN (hr_search_normalize(coalesce(name, '') || ' ' || coalesce(brand, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chain_products_name_trgm ON chain_products
USING GIN (hr_search_normalize(coalesce(name, '')) gin_trgm_ops);

-- Prices table to store product prices
CREATE TABLE IF NOT EXISTS prices (
    id BIGSERIAL PRIMARY KEY,
    chain_product_id INTEGER NOT NULL REFERENCES chain_products (id),
    store_id INTEGER NOT NULL REFERENCES stores (id),
    price_date DATE NOT NULL,
    regular_price DECIMAL(10, 2) NOT NULL,
    special_price DECIMAL(10, 2),
    unit_price DECIMAL(10, 2),
    -- current_price DECIMAL(10, 2) NOT NULL,
    best_price_30 DECIMAL(10, 2),
    anchor_price DECIMAL(10, 2),
    UNIQUE (chain_product_id, store_id, price_date)
);

-- Mark regular_price as required if the table already exists
ALTER TABLE prices ALTER COLUMN regular_price SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prices_store_chain_product ON prices (store_id, chain_product_id);
CREATE INDEX IF NOT EXISTS idx_prices_chain_product_date_store ON prices (chain_product_id, price_date, store_id);

-- Prices table to store min/max/avg prices per chain
CREATE TABLE IF NOT EXISTS chain_prices (
    id SERIAL PRIMARY KEY,
    chain_product_id INTEGER NOT NULL REFERENCES chain_products (id),
    price_date DATE NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    avg_price DECIMAL(10, 2) NOT NULL,
    UNIQUE (chain_product_id, price_date)
);

-- Cart table used by authenticated API endpoints
CREATE TABLE IF NOT EXISTS cart_items (
    user_id UUID NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items (product_id);

CREATE TABLE IF NOT EXISTS cart_optimize_runs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    mode VARCHAR(32) NOT NULL,
    algorithm_used VARCHAR(64),
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    partial_fulfillment BOOLEAN NOT NULL DEFAULT FALSE,
    heuristic_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    stores_considered INTEGER,
    stores_after_pruning INTEGER,
    candidates_evaluated INTEGER,
    stores_visited INTEGER,
    total_cost DECIMAL(10, 2),
    computation_time_ms INTEGER,
    total_request_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_optimize_runs_created_at ON cart_optimize_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_optimize_runs_mode_created ON cart_optimize_runs (mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_optimize_runs_user_created ON cart_optimize_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cart_optimize_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    mode VARCHAR(32) NOT NULL,
    accepted BOOLEAN NOT NULL,
    algorithm_used VARCHAR(64),
    recommendation_total_cost DECIMAL(10, 2),
    recommendation_stores_visited INTEGER,
    recommendation_average_distance_km DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_optimize_feedback_created_at ON cart_optimize_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_optimize_feedback_mode_created ON cart_optimize_feedback (mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_optimize_feedback_user_created ON cart_optimize_feedback (user_id, created_at DESC);

-- Favorites tables used by authenticated API endpoints
CREATE TABLE IF NOT EXISTS favorite_products (
    user_id UUID NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorite_stores (
    user_id UUID NOT NULL,
    store_id VARCHAR(150) NOT NULL,
    chain_code VARCHAR(50) NOT NULL,
    store_code VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_products_user_id ON favorite_products (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_products_product_id ON favorite_products (product_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stores_user_id ON favorite_stores (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stores_chain_store ON favorite_stores (chain_code, store_code);
