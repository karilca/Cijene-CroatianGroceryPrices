import datetime
import logging
import re
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, as_completed, wait
from typing import List
from json import loads

from bs4 import BeautifulSoup
from crawler.store.models import Product, Store

from .base import BaseCrawler

logger = logging.getLogger(__name__)


class KauflandCrawler(BaseCrawler):
    """Crawler for Kaufland store prices."""

    CHAIN = "kaufland"
    BASE_URL = "https://www.kaufland.hr"
    INDEX_URL = f"{BASE_URL}/akcije-novosti/popis-mpc.html"
    STORE_WORKERS = 8

    # Mapping for price fields
    PRICE_MAP = {
        # field: (column, is_required)
        "price": ("maloprod.cijena(EUR)", False),
        "unit_price": ("cijena jed.mj.(EUR)", False),
        "special_price": ("MPC poseb.oblik prod", False),
        "best_price_30": ("Najniža MPC u 30dana", False),
        "anchor_price": ("Sidrena cijena", False),
    }

    # Mapping for other fields
    FIELD_MAP = {
        "product": ("naziv proizvoda", True),
        "product_id": ("šifra proizvoda", True),
        "brand": ("marka proizvoda", False),
        "quantity": ("neto količina(KG)", False),
        "unit": ("jedinica mjere", False),
        "barcode": ("barkod", False),
        "category": ("kategorija proizvoda", False),
    }

    CITIES = [
        "Zagreb Blato",
        "Zagreb",
        "Karlovac",
        "Velika Gorica",
        "Zapresic",
        "Zadar",
        "Cakovec",
        "Đakovo",
        "Sisak",
        "Koprivnica",
        "Slavonski Brod",
        "Nova Gradiska",
        "Sinj",
        "Rovinj",
        "Osijek",
        "Virovitica",
        "Biograd",
        "Dugo Selo",
        "Sibenik",
        "Pula",
        "Porec",
        "Makarska",
        "Kutina",
        "Split",
        "Vinkovci",
        "Rijeka",
        "Bjelovar",
        "Ivanec",
        "Trogir",
        "Umag",
        "Vukovar",
        "Zabok",
        "Cibaca",
        "Pozega",
        "Dakovo",
        "Vodice",
        "Varazdin",
        "Samobor",
    ]

    # Pattern to extract date and price from anchor price string
    # Example format: "MPC 2.5.2025=7,99€"
    ANCHOR_PRICE_PATTERN = re.compile(r"MPC\s+(\d+\.\d+\.\d+)=(.+)")

    # Pattern to parse store information from filename
    # Format: Supermarket_Put_Gaceleza_1D_Vodice_6730_15_05_2025_7_30.csv
    ADDRESS_PATTERN = re.compile(r"(Supermarket|Hipermarket)_(.+?)_(\d{4})_")

    def get_index(self, date: datetime.date) -> dict[str, str]:
        """
        Get all CSV links from the Kaufland index page.

        Args:
            date: Date to get prices for

        Returns:
            Dictionary with title → URL mappings for CSV files.
        """

        # 0. Fetch the Kaufland index page

        content = self.fetch_text(self.INDEX_URL)
        if not content:
            raise ValueError("Failed to fetch Kaufland index page")

        soup = BeautifulSoup(content, "html.parser")

        # 1. Locate the Vue AssetList component
        list_el = soup.select_one("div[data-component=AssetList]")
        if not list_el:
            raise ValueError("Failed to find CSV links in Kaufland index page")

        # 2. Extract the AssetList component settings from a prop attrib
        vue_props = loads(str(list_el.get("data-props")))

        json_url = self.BASE_URL + vue_props.get("settings", {}).get("dataUrlAssets")
        if not json_url:
            raise ValueError("Failed to find JSON URL in Kaufland index page")

        # 3. Fetch the JSON data from the URL
        logger.debug("Fetching JSON data from %s", json_url)
        json_content = self.fetch_text(json_url)
        if not json_content:
            raise ValueError("Failed to fetch JSON data from Kaufland index page")

        # 4. Parse the JSON data to extract CSV URLs
        json_data = loads(json_content)

        urls = {}
        date_str = date.strftime("_%d_%m_%Y_")
        date_str2 = date.strftime("_%d%m%Y_")
        for item in json_data:
            label = item.get("label")
            url = item.get("path")
            if not label or not url:
                continue

            # Kaufland occasionally changes filename formatting and inserts spaces
            # around the compact date segment (e.g. "_ 06032026 _"). Normalize
            # whitespace in both label and path before date filtering.
            normalized_label = re.sub(r"\s+", "", label)
            normalized_url = re.sub(r"\s+", "", url)

            if (
                date_str in normalized_label
                or date_str2 in normalized_label
                or date_str in normalized_url
                or date_str2 in normalized_url
            ):
                urls[label] = f"{self.BASE_URL}{url.replace(' ', '%20')}"

        # Typo Fallback for 31.05.2026 (they copy-pasted files from March 31st: 31032026)
        if not urls and date == datetime.date(2026, 5, 31):
            logger.warning("No Kaufland URLs found for 2026-05-31. Falling back to copy-paste typo of 31-03-2026 (March 31st)...")
            typo_date = datetime.date(2026, 3, 31)
            typo_str = typo_date.strftime("_%d_%m_%Y_")
            typo_str2 = typo_date.strftime("_%d%m%Y_")
            for item in json_data:
                label = item.get("label")
                url = item.get("path")
                if not label or not url:
                    continue
                normalized_label = re.sub(r"\s+", "", label)
                normalized_url = re.sub(r"\s+", "", url)
                if (
                    typo_str in normalized_label
                    or typo_str2 in normalized_label
                    or typo_str in normalized_url
                    or typo_str2 in normalized_url
                ):
                    urls[label] = f"{self.BASE_URL}{url.replace(' ', '%20')}"

        return urls

    def parse_store_info(self, title: str) -> Store:
        """
        Extract store information from the CSV title.

        Args:
            title: Title of the CSV file

        Returns:
            Store object with parsed information
        """
        # Format example: Supermarket_Put_Gaceleza_1D_Vodice_6730_15_05_2025_7_30.csv
        match = self.ADDRESS_PATTERN.search(title)
        if not match:
            raise ValueError(f"Could not parse store info from filename: {title}")

        store_type, address_part, store_id = match.groups()

        store_type = store_type.lower()
        street_address = address_part.replace("_", " ").title()
        city = ""
        normalized_street = self.strip_diacritics(street_address)

        # Look for cities in the address
        for city_name in self.CITIES:
            if normalized_street.endswith(self.strip_diacritics(city_name)):
                city = city_name
                street_address = street_address[: -len(city_name)].strip()
                break

        # Create store object
        store = Store(
            chain=self.CHAIN,
            store_type=store_type,
            store_id=store_id,
            name=f"{self.CHAIN.capitalize()} {city}",
            street_address=street_address,
            city=city,
            zipcode="",
            items=[],
        )

        logger.info(
            "Parsed store: %s (%s), %s, %s",
            store.store_type,
            store.store_id,
            store.street_address,
            store.city,
        )
        return store

    def get_store_prices(self, csv_url: str) -> List[Product]:
        """
        Get and parse prices from a store's CSV file.

        Args:
            csv_url: URL of the CSV file

        Returns:
            List of Product objects
        """
        try:
            content = self.fetch_text(csv_url, encodings=["windows-1250", "utf-8-sig"])

            # Normalize column names - some stores use "WG" instead of "kategorija proizvoda"
            # Replace only in the header line (first line)
            lines = content.split("\n", 1)
            if len(lines) >= 1:
                lines[0] = lines[0].replace('"WG"', '"kategorija proizvoda"')
                lines[0] = lines[0].replace('\tWG\t', '\tkategorija proizvoda\t')
                # Handle unquoted WG at the end of the line (header)
                # Note: split('\n') removes \n, but \r might remain
                lines[0] = re.sub(r'\tWG(\r?)$', r'\tkategorija proizvoda\1', lines[0])
                content = "\n".join(lines)

            return list(self.parse_csv(content, delimiter="\t"))
        except Exception as e:
            logger.error(
                "Failed to get store prices from %s: %s",
                csv_url,
                e,
                exc_info=True,
            )
            return []

    def _process_store_file(self, file_info: tuple[str, str]) -> Store | None:
        title, url = file_info
        try:
            store = self.parse_store_info(title)
            products = self.get_store_prices(url)
        except Exception as e:
            logger.error("Error processing store from %s: %s", url, e, exc_info=True)
            return None

        if not products:
            logger.warning("No products found for %s, skipping", url)
            return None

        store.items = products
        return store

    def parse_csv_row(self, row: dict) -> Product:
        anchor_price = row.get("Sidrena cijena")
        row["Datum sidrenja"] = ""

        if anchor_price:
            match = self.ANCHOR_PRICE_PATTERN.search(anchor_price)
            if match:
                date_str, price_str = match.groups()
                date_match = re.fullmatch(r"\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*", date_str)
                if date_match:
                    day_txt, month_txt, year_txt = date_match.groups()
                    year: int | None = None

                    if len(year_txt) == 4:
                        year = int(year_txt)
                    elif len(year_txt) == 2:
                        year = 2000 + int(year_txt)
                    elif len(year_txt) == 3:
                        # Handle typo in year (missing digit, e.g., 26.09.205 instead of 26.09.2025)
                        year = 2020 + int(year_txt[-1])
                        logger.debug(
                            "Fixed typo in anchor price date: %s -> %s.%s.%s",
                            date_str,
                            day_txt,
                            month_txt,
                            year,
                        )

                    if year is not None:
                        try:
                            parsed_date = datetime.date(
                                year,
                                int(month_txt),
                                int(day_txt),
                            )
                            row["Datum sidrenja"] = parsed_date.isoformat()
                            row["Sidrena cijena"] = price_str
                        except ValueError as err:
                            logger.warning(
                                "Error parsing anchor price %s: %s",
                                anchor_price,
                                err,
                            )
                            row["Sidrena cijena"] = ""
                    else:
                        row["Sidrena cijena"] = ""
                else:
                    row["Sidrena cijena"] = ""
            else:
                row["Sidrena cijena"] = ""

        return super().parse_csv_row(row)

    def get_all_products(self, date: datetime.date) -> list[Store]:
        """
        Main method to fetch and parse all store, product and price info.

        Args:
            date: The date to search for in the price list.

        Returns:
            List of Store objects with their products.
        """
        csv_links = self.get_index(date)
        if not csv_links:
            return []

        stores = []

        file_items = list(csv_links.items())
        n_workers = min(self.STORE_WORKERS, len(file_items))
        if n_workers <= 1:
            for file_info in file_items:
                store = self._process_store_file(file_info)
                if store:
                    stores.append(store)
            return stores

        logger.info(
            "Processing %s Kaufland stores with %s workers",
            len(file_items),
            n_workers,
        )

        with ThreadPoolExecutor(max_workers=n_workers) as executor:
            inflight: set[Future[Store | None]] = set()

            for file_info in file_items:
                if len(inflight) >= n_workers:
                    done, inflight = wait(inflight, return_when=FIRST_COMPLETED)
                    for future in done:
                        store = future.result()
                        if store:
                            stores.append(store)

                inflight.add(executor.submit(self._process_store_file, file_info))

            for future in as_completed(inflight):
                store = future.result()
                if store:
                    stores.append(store)

        return stores


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    crawler = KauflandCrawler()
    stores = crawler.crawl(datetime.date.today())
    print(stores[0])
    print(stores[0].items[0])
