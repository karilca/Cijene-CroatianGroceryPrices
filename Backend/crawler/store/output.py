from csv import DictWriter
from decimal import Decimal
from logging import getLogger
from os import makedirs
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from .models import Store

logger = getLogger(__name__)

STORE_COLUMNS = [
    "store_id",
    "type",
    "address",
    "city",
    "zipcode",
]

PRODUCT_COLUMNS = [
    "product_id",
    "barcode",
    "name",
    "brand",
    "category",
    "unit",
    "quantity",
]

PRICE_COLUMNS = [
    "store_id",
    "product_id",
    "price",
    "unit_price",
    "best_price_30",
    "anchor_price",
    "special_price",
]


def transform_products(
    stores: list[Store],
) -> tuple[list[dict], list[dict], list[dict]]:
    """
    Transform store data into a structured format for CSV export.

    Args:
        stores: List of Store objects containing product data.

    Returns:
        Tuple containing:
            - List of store dictionaries with STORE_COLUMNS
            - List of product dictionaries with PRODUCT_COLUMNS
            - List of price dictionaries with PRICE_COLUMNS
    """
    store_list = []
    product_map = {}
    price_list = []

    def maybe(val: Decimal | None) -> Decimal | str:
        return val if val is not None else ""

    for store in stores:
        store_data = {
            "store_id": store.store_id,
            "type": store.store_type,
            "address": store.street_address,
            "city": store.city,
            "zipcode": store.zipcode or "",
        }
        store_list.append(store_data)

        for product in store.items:
            key = f"{store.chain}:{product.product_id}"
            if key not in product_map:
                product_map[key] = {
                    "barcode": product.barcode or key,
                    "product_id": product.product_id,
                    "name": product.product,
                    "brand": product.brand,
                    "category": product.category,
                    "unit": product.unit,
                    "quantity": product.quantity,
                }
            price_list.append(
                {
                    "store_id": store.store_id,
                    "product_id": product.product_id,
                    "price": product.price,
                    "unit_price": maybe(product.unit_price),
                    "best_price_30": maybe(product.best_price_30),
                    "anchor_price": maybe(product.anchor_price),
                    "special_price": maybe(product.special_price),
                }
            )

    return store_list, list(product_map.values()), price_list


def save_csv(path: Path, data: list[dict], columns: list[str]):
    """
    Save data to a CSV file.

    Args:
        path: Path to the CSV file.
        data: List of dictionaries containing the data to save.
        columns: List of column names for the CSV file.
    """
    if not data:
        logger.warning(f"No data to save at {path}, skipping")
        return

    if set(columns) != set(data[0].keys()):
        raise ValueError(
            f"Column mismatch: expected {columns}, got {list(data[0].keys())}"
        )
        return

    with open(path, "w", newline="") as f:
        writer = DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in data:
            writer.writerow({k: str(v) for k, v in row.items()})


def save_chain(chain_path: Path, stores: list[Store]):
    """
    Save retail chain data to CSV files.

    This function creates a directory for the retail chain and saves:

    * stores.csv - containing store information with STORE_COLUMNS
    * products.csv - containing product information with PRODUCT_COLUMNS
    * prices.csv - containing price information with PRICE_COLUMNS

    Args:
        chain_path: Path to the directory where CSV files will be saved
            (will be created if it doesn't exist).
        stores: List of Store objects containing product data.
    """

    makedirs(chain_path, exist_ok=True)

    products_by_key: dict[str, dict] = {}

    with (
        open(chain_path / "stores.csv", "w", newline="") as stores_file,
        open(chain_path / "products.csv", "w", newline="") as products_file,
        open(chain_path / "prices.csv", "w", newline="") as prices_file,
    ):
        stores_writer = DictWriter(stores_file, fieldnames=STORE_COLUMNS)
        products_writer = DictWriter(products_file, fieldnames=PRODUCT_COLUMNS)
        prices_writer = DictWriter(prices_file, fieldnames=PRICE_COLUMNS)

        stores_writer.writeheader()
        products_writer.writeheader()
        prices_writer.writeheader()

        for store in stores:
            stores_writer.writerow(
                {
                    "store_id": str(store.store_id),
                    "type": str(store.store_type),
                    "address": str(store.street_address),
                    "city": str(store.city),
                    "zipcode": str(store.zipcode or ""),
                }
            )

            for product in store.items:
                product_key = f"{store.chain}:{product.product_id}"
                if product_key not in products_by_key:
                    products_by_key[product_key] = {
                        "barcode": str(product.barcode or product_key),
                        "product_id": str(product.product_id),
                        "name": str(product.product),
                        "brand": str(product.brand),
                        "category": str(product.category),
                        "unit": str(product.unit),
                        "quantity": str(product.quantity),
                    }

                prices_writer.writerow(
                    {
                        "store_id": str(store.store_id),
                        "product_id": str(product.product_id),
                        "price": str(product.price),
                        "unit_price": str(product.unit_price or ""),
                        "best_price_30": str(product.best_price_30 or ""),
                        "anchor_price": str(product.anchor_price or ""),
                        "special_price": str(product.special_price or ""),
                    }
                )

        for product_row in products_by_key.values():
            products_writer.writerow(product_row)


def copy_archive_info(path: Path):
    archive_info = open(Path(__file__).parent / "archive-info.txt", "r").read()
    with open(path / "archive-info.txt", "w") as f:
        f.write(archive_info)


def create_archive(path: Path, output: Path):
    """
    Create a ZIP archive of price files for a given date.

    Args:
        path: Path to the directory to archive.
        output: Path to the output ZIP file.
    """
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=6) as zf:
        for file in path.rglob("*"):
            zf.write(file, arcname=file.relative_to(path))
