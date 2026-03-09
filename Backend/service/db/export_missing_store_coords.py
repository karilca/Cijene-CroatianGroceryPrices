import argparse
import asyncio
import csv
from datetime import datetime
from pathlib import Path

import asyncpg

from service.config import settings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Export stores that are missing latitude or longitude to a TXT file."
        )
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help=(
            "Output TXT path. If omitted, file is created in Backend/output/ "
            "with timestamp in name."
        ),
    )
    return parser.parse_args()


async def fetch_missing_store_coords(dsn: str) -> list[asyncpg.Record]:
    conn = await asyncpg.connect(dsn)
    try:
        return await conn.fetch(
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
    finally:
        await conn.close()


def build_default_output_path() -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # In Docker, host ./output is mounted to /app/data.
    base_dir = Path("/app/data") if Path("/app/data").exists() else Path("output")
    return base_dir / f"stores_missing_coords_{timestamp}.txt"


def write_report(output_path: Path, rows: list[asyncpg.Record]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        # Same column order as enrichment/stores.csv for easy copy/paste workflow.
        writer.writerow([
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
        ])

        for row in rows:
            writer.writerow([
                row["id"],
                row["chain_code"],
                row["store_code"],
                row["type"] or "",
                row["address"] or "",
                row["city"] or "",
                row["zipcode"] or "",
                "" if row["lat"] is None else row["lat"],
                "" if row["lon"] is None else row["lon"],
                row["phone"] or "",
            ])


def main() -> None:
    args = parse_args()
    output_path = args.output if args.output is not None else build_default_output_path()

    rows = asyncio.run(fetch_missing_store_coords(settings.db_dsn))
    write_report(output_path, rows)

    print(f"Exported {len(rows)} stores without full coordinates.")
    print("Format: CSV-compatible with enrichment/stores.csv columns.")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
