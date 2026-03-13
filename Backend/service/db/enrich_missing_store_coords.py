import argparse
import asyncio
import csv
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import asyncpg
import httpx

from service.config import settings
from service.db.enrich import enrich_stores

logger = logging.getLogger("store-geocoder")


@dataclass
class MissingStore:
    id: int
    chain_code: str
    store_code: str
    store_type: str
    address: str
    city: str
    zipcode: str
    lat: float | None
    lon: float | None
    phone: str


@dataclass
class LookupResult:
    lat: float | None
    lon: float | None
    phone: str | None
    zipcode: str | None
    source: str


CSV_FIELDS = [
    "id",
    "chain_code",
    "code",
    "type",
    "address",
    "city",
    "zipcode",
    "lat",
    "lon",
    "phone",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Find stores with missing coordinates, enrich with Google Maps API, and "
            "append only new records to enrichment/stores.csv."
        )
    )
    parser.add_argument(
        "--stores-csv",
        type=Path,
        default=Path("enrichment/stores.csv"),
        help="Path to stores enrichment CSV file (default: enrichment/stores.csv).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit of stores to process (0 means all).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes by appending to stores CSV. Default is dry-run.",
    )
    parser.add_argument(
        "--apply-db",
        action="store_true",
        help="After CSV append, run DB enrichment from that CSV file.",
    )
    parser.add_argument(
        "--fill-existing",
        action="store_true",
        help=(
            "For existing rows in stores CSV, fill only missing fields "
            "(lat/lon/phone/zipcode) using Google results."
        ),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help=(
            "Optional report path. If omitted, writes timestamped report into "
            "./output locally (or /app/data in Docker)."
        ),
    )
    parser.add_argument(
        "-d",
        "--debug",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser.parse_args()


def build_default_report_path() -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # In Docker, host ./output is mounted to /app/data.
    base_dir = Path("/app/data") if Path("/app/data").exists() else Path("output")
    return base_dir / f"stores_google_lookup_report_{timestamp}.csv"


def normalize_field(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.replace("_", " ").split())


def build_query(store: MissingStore) -> str:
    parts = [
        store.chain_code,
        store.address,
        store.city,
        store.zipcode,
        settings.google_maps_country_hint,
    ]
    return ", ".join([normalize_field(p) for p in parts if normalize_field(p)])


def _report_row(
    store: MissingStore,
    *,
    status: str,
    source: str,
    lat: float | None,
    lon: float | None,
    zipcode: str,
    phone: str,
    note: str = "",
) -> dict[str, str]:
    return {
        "id": str(store.id),
        "chain_code": store.chain_code,
        "code": store.store_code,
        "status": status,
        "source": source,
        "lat": "" if lat is None else str(lat),
        "lon": "" if lon is None else str(lon),
        "zipcode": zipcode,
        "phone": phone,
        "note": note,
    }


def extract_postal_code(address_components: Any) -> str | None:
    if not isinstance(address_components, list):
        return None

    for component in address_components:
        if not isinstance(component, dict):
            continue
        types = component.get("types", [])
        if isinstance(types, list) and "postal_code" in types:
            code = (component.get("long_name") or component.get("short_name") or "").strip()
            return code or None

    return None


async def fetch_missing_store_coords(dsn: str) -> list[MissingStore]:
    conn = await asyncpg.connect(dsn)
    try:
        rows = await conn.fetch(
            """
            SELECT
                s.id,
                c.code AS chain_code,
                s.code AS store_code,
                s.type,
                s.address,
                s.city,
                s.zipcode,
                s.phone,
                s.lat,
                s.lon
            FROM stores s
            JOIN chains c ON c.id = s.chain_id
            WHERE s.lat IS NULL OR s.lon IS NULL
            ORDER BY c.code, s.code, s.id
            """
        )
        return [
            MissingStore(
                id=row["id"],
                chain_code=row["chain_code"],
                store_code=row["store_code"],
                store_type=row["type"] or "",
                address=row["address"] or "",
                city=row["city"] or "",
                zipcode=row["zipcode"] or "",
                lat=row["lat"],
                lon=row["lon"],
                phone=(row["phone"] or "").strip(),
            )
            for row in rows
        ]
    finally:
        await conn.close()


def ensure_stores_csv(stores_csv: Path) -> None:
    stores_csv.parent.mkdir(parents=True, exist_ok=True)
    if stores_csv.exists():
        return

    with stores_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(CSV_FIELDS)


def read_existing_rows(stores_csv: Path) -> list[dict[str, str]]:
    ensure_stores_csv(stores_csv)
    rows: list[dict[str, str]] = []
    with stores_csv.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({k: (v or "") for k, v in row.items()})
    return rows


def read_existing_keys(stores_csv: Path) -> set[tuple[str, str]]:
    ensure_stores_csv(stores_csv)
    keys: set[tuple[str, str]] = set()
    with stores_csv.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            chain_code = (row.get("chain_code") or "").strip()
            code = (row.get("code") or "").strip()
            if chain_code and code:
                keys.add((chain_code, code))
    return keys


def append_new_rows(stores_csv: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        return

    ensure_stores_csv(stores_csv)
    with stores_csv.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=CSV_FIELDS,
            lineterminator="\n",
        )
        writer.writerows(rows)


def rewrite_rows(stores_csv: Path, rows: list[dict[str, str]]) -> None:
    ensure_stores_csv(stores_csv)
    with stores_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def write_report(report_path: Path, rows: list[dict[str, str]]) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "chain_code",
                "code",
                "status",
                "source",
                "lat",
                "lon",
                "zipcode",
                "phone",
                "note",
            ],
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


async def _request_json_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    delay = max(0.0, settings.google_maps_retry_backoff_seconds)

    for attempt in range(settings.google_maps_max_retries + 1):
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()

            status = payload.get("status")
            if status in {"OVER_QUERY_LIMIT", "UNKNOWN_ERROR"}:
                if attempt < settings.google_maps_max_retries:
                    await asyncio.sleep(delay * (2**attempt))
                    continue
            return payload
        except httpx.RequestError:
            if attempt >= settings.google_maps_max_retries:
                raise
            await asyncio.sleep(delay * (2**attempt))

    return {}


async def google_lookup_store(
    client: httpx.AsyncClient,
    store: MissingStore,
) -> LookupResult:
    key = settings.google_maps_api_key.strip()
    if not key:
        raise ValueError("GOOGLE_MAPS_API_KEY is missing in environment.")

    query = build_query(store)
    text_search_params = {
        "query": query,
        "key": key,
        "language": settings.google_maps_language,
        "region": settings.google_maps_region,
    }

    text_payload = await _request_json_with_retry(
        client,
        "https://maps.googleapis.com/maps/api/place/textsearch/json",
        text_search_params,
    )
    text_status = text_payload.get("status")
    results = text_payload.get("results", []) if isinstance(text_payload, dict) else []

    if text_status == "OK" and results:
        first = results[0]
        location = (
            first.get("geometry", {}).get("location", {}) if isinstance(first, dict) else {}
        )
        lat = location.get("lat")
        lon = location.get("lng")
        place_id = first.get("place_id")

        phone: str | None = None
        zipcode: str | None = None
        if place_id and (not store.phone or not store.zipcode.strip()):
            details_params = {
                "place_id": place_id,
                "key": key,
                "language": settings.google_maps_language,
                "region": settings.google_maps_region,
                "fields": "formatted_phone_number,international_phone_number,address_components",
            }
            details_payload = await _request_json_with_retry(
                client,
                "https://maps.googleapis.com/maps/api/place/details/json",
                details_params,
            )
            details_status = details_payload.get("status")
            if details_status == "OK":
                details_result = details_payload.get("result", {})
                if isinstance(details_result, dict):
                    if not store.phone:
                        phone = (
                            details_result.get("international_phone_number")
                            or details_result.get("formatted_phone_number")
                        )
                    if not store.zipcode.strip():
                        zipcode = extract_postal_code(
                            details_result.get("address_components", [])
                        )

        if lat is not None and lon is not None:
            return LookupResult(
                lat=float(lat),
                lon=float(lon),
                phone=phone,
                zipcode=zipcode,
                source="places",
            )

    if settings.google_maps_enable_geocoding_fallback:
        geocode_params = {
            "address": query,
            "key": key,
            "language": settings.google_maps_language,
            "region": settings.google_maps_region,
        }
        geocode_payload = await _request_json_with_retry(
            client,
            "https://maps.googleapis.com/maps/api/geocode/json",
            geocode_params,
        )
        geocode_status = geocode_payload.get("status")
        geo_results = (
            geocode_payload.get("results", []) if isinstance(geocode_payload, dict) else []
        )

        if geocode_status == "OK" and geo_results:
            first = geo_results[0]
            location = (
                first.get("geometry", {}).get("location", {}) if isinstance(first, dict) else {}
            )
            lat = location.get("lat")
            lon = location.get("lng")
            if lat is not None and lon is not None:
                zipcode = None
                if not store.zipcode.strip():
                    zipcode = extract_postal_code(first.get("address_components", []))
                return LookupResult(
                    lat=float(lat),
                    lon=float(lon),
                    phone=None,
                    zipcode=zipcode,
                    source="geocoding",
                )

    return LookupResult(lat=None, lon=None, phone=None, zipcode=None, source="none")


def to_enrichment_row(store: MissingStore, result: LookupResult) -> dict[str, str]:
    phone = store.phone.strip()
    if not phone and result.phone:
        phone = result.phone.strip()

    zipcode = store.zipcode.strip()
    if not zipcode and result.zipcode:
        zipcode = result.zipcode.strip()

    return {
        "id": str(store.id),
        "chain_code": store.chain_code,
        "code": store.store_code,
        "type": store.store_type,
        "address": store.address,
        "city": store.city,
        "zipcode": zipcode,
        "lat": "" if result.lat is None else str(result.lat),
        "lon": "" if result.lon is None else str(result.lon),
        "phone": phone,
    }


async def run(args: argparse.Namespace) -> int:
    stores_csv = args.stores_csv
    report_path = args.report if args.report else build_default_report_path()

    stores = await fetch_missing_store_coords(settings.db_dsn)
    if args.limit and args.limit > 0:
        stores = stores[: args.limit]

    existing_rows = read_existing_rows(stores_csv)
    existing_keys = read_existing_keys(stores_csv)
    existing_index: dict[tuple[str, str], int] = {}
    for idx, row in enumerate(existing_rows):
        chain_code = (row.get("chain_code") or "").strip()
        code = (row.get("code") or "").strip()
        if chain_code and code:
            existing_index[(chain_code, code)] = idx

    run_seen_keys: set[tuple[str, str]] = set()

    stats = {
        "processed": 0,
        "skipped_existing": 0,
        "existing_updated": 0,
        "existing_no_change": 0,
        "lookup_success": 0,
        "lookup_failed": 0,
        "prepared_new_rows": 0,
    }

    rows_to_append: list[dict[str, str]] = []
    report_rows: list[dict[str, str]] = []

    timeout = max(1.0, float(settings.google_maps_timeout_seconds))
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        for store in stores:
            stats["processed"] += 1
            key = (store.chain_code, store.store_code)

            if key in existing_keys or key in run_seen_keys:
                if not args.fill_existing:
                    stats["skipped_existing"] += 1
                    report_rows.append(
                        _report_row(
                            store,
                            status="skipped_existing",
                            source="csv",
                            lat=None,
                            lon=None,
                            zipcode=store.zipcode,
                            phone=store.phone,
                        )
                    )
                    continue

                row_idx = existing_index.get(key)
                if row_idx is None:
                    stats["skipped_existing"] += 1
                    report_rows.append(
                        _report_row(
                            store,
                            status="skipped_existing",
                            source="csv",
                            lat=None,
                            lon=None,
                            zipcode=store.zipcode,
                            phone=store.phone,
                        )
                    )
                    continue

                current_row = existing_rows[row_idx]
                needs_lat = not (current_row.get("lat") or "").strip()
                needs_lon = not (current_row.get("lon") or "").strip()
                needs_phone = not (current_row.get("phone") or "").strip()
                needs_zip = not (current_row.get("zipcode") or "").strip()

                if not any([needs_lat, needs_lon, needs_phone, needs_zip]):
                    stats["existing_no_change"] += 1
                    report_rows.append(
                        _report_row(
                            store,
                            status="existing_no_change",
                            source="csv",
                            lat=None,
                            lon=None,
                            zipcode=current_row.get("zipcode", ""),
                            phone=current_row.get("phone", ""),
                        )
                    )
                    continue

                try:
                    result = await google_lookup_store(client, store)
                except Exception as exc:
                    stats["lookup_failed"] += 1
                    logger.warning(
                        "Lookup failed for existing %s/%s: %s",
                        store.chain_code,
                        store.store_code,
                        exc,
                    )
                    report_rows.append(
                        _report_row(
                            store,
                            status="lookup_error",
                            source="api",
                            lat=None,
                            lon=None,
                            zipcode=current_row.get("zipcode", ""),
                            phone=current_row.get("phone", ""),
                            note=str(exc),
                        )
                    )
                    continue

                changed = False
                if needs_lat and result.lat is not None:
                    current_row["lat"] = str(result.lat)
                    changed = True
                if needs_lon and result.lon is not None:
                    current_row["lon"] = str(result.lon)
                    changed = True
                if needs_phone and result.phone:
                    current_row["phone"] = result.phone.strip()
                    changed = True
                if needs_zip and result.zipcode:
                    current_row["zipcode"] = result.zipcode.strip()
                    changed = True

                if changed:
                    stats["existing_updated"] += 1
                    stats["lookup_success"] += 1
                    report_rows.append(
                        _report_row(
                            store,
                            status="existing_updated",
                            source=result.source,
                            lat=(
                                float(current_row["lat"])
                                if (current_row.get("lat") or "").strip()
                                else None
                            ),
                            lon=(
                                float(current_row["lon"])
                                if (current_row.get("lon") or "").strip()
                                else None
                            ),
                            zipcode=current_row.get("zipcode", ""),
                            phone=current_row.get("phone", ""),
                        )
                    )
                else:
                    stats["existing_no_change"] += 1
                    report_rows.append(
                        _report_row(
                            store,
                            status="existing_no_change",
                            source=result.source,
                            lat=None,
                            lon=None,
                            zipcode=current_row.get("zipcode", ""),
                            phone=current_row.get("phone", ""),
                        )
                    )

                await asyncio.sleep(max(0.0, settings.google_maps_request_delay_seconds))
                continue

            try:
                result = await google_lookup_store(client, store)
            except Exception as exc:
                stats["lookup_failed"] += 1
                logger.warning(
                    "Lookup failed for %s/%s: %s",
                    store.chain_code,
                    store.store_code,
                    exc,
                )
                report_rows.append(
                    _report_row(
                        store,
                        status="lookup_error",
                        source="api",
                        lat=None,
                        lon=None,
                        zipcode=store.zipcode,
                        phone=store.phone,
                        note=str(exc),
                    )
                )
                continue

            if result.lat is None or result.lon is None:
                stats["lookup_failed"] += 1
                report_rows.append(
                    _report_row(
                        store,
                        status="not_found",
                        source=result.source,
                        lat=None,
                        lon=None,
                        zipcode=store.zipcode,
                        phone=store.phone,
                    )
                )
            else:
                stats["lookup_success"] += 1
                row = to_enrichment_row(store, result)
                rows_to_append.append(row)
                run_seen_keys.add(key)
                stats["prepared_new_rows"] += 1
                report_rows.append(
                    _report_row(
                        store,
                        status="prepared",
                        source=result.source,
                        lat=result.lat,
                        lon=result.lon,
                        zipcode=row["zipcode"],
                        phone=row["phone"],
                    )
                )

            await asyncio.sleep(max(0.0, settings.google_maps_request_delay_seconds))

    write_report(report_path, report_rows)

    appended = 0
    rewritten = 0
    if args.apply:
        if args.fill_existing and stats["existing_updated"] > 0:
            rewrite_rows(stores_csv, existing_rows)
            rewritten = stats["existing_updated"]
        append_new_rows(stores_csv, rows_to_append)
        appended = len(rows_to_append)

    print(f"Processed: {stats['processed']}")
    print(f"Skipped existing in CSV: {stats['skipped_existing']}")
    print(f"Existing rows updated: {stats['existing_updated']}")
    print(f"Existing rows unchanged: {stats['existing_no_change']}")
    print(f"Lookup success: {stats['lookup_success']}")
    print(f"Lookup failed: {stats['lookup_failed']}")
    print(f"Prepared new rows: {stats['prepared_new_rows']}")
    print(f"Appended rows: {appended}")
    if args.fill_existing:
        print(f"Rewritten existing rows: {rewritten}")
    print(f"Report saved to: {report_path}")

    if not args.apply:
        print("Dry-run mode active. Use --apply to persist CSV changes.")

    if args.apply and args.apply_db and (appended > 0 or rewritten > 0):
        db = settings.get_db()
        await db.connect()
        try:
            await db.create_tables()
            await enrich_stores(stores_csv)
        finally:
            await db.close()
        print("DB enrichment completed from updated stores CSV.")

    return 0


def main() -> None:
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s:%(name)s:%(levelname)s:%(message)s",
    )
    # Avoid printing full request URLs (which include API key) in non-debug runs.
    if not args.debug:
        logging.getLogger("httpx").setLevel(logging.WARNING)

    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
