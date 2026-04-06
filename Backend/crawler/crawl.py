from dataclasses import dataclass
import multiprocessing as mp
import os
import datetime
from typing import List
import logging
from pathlib import Path
from time import time
from concurrent.futures import ProcessPoolExecutor, as_completed


from crawler.store.konzum import KonzumCrawler
from crawler.store.lidl import LidlCrawler
from crawler.store.plodine import PlodineCrawler
from crawler.store.ribola import RibolaCrawler
from crawler.store.spar import SparCrawler
from crawler.store.studenac import StudenacCrawler
from crawler.store.tommy import TommyCrawler
from crawler.store.kaufland import KauflandCrawler
from crawler.store.eurospin import EurospinCrawler
from crawler.store.metro import MetroCrawler
from crawler.store.zabac import ZabacCrawler
from crawler.store.vrutak import VrutakCrawler
from crawler.store.ntl import NtlCrawler


from crawler.store.output import save_chain, copy_archive_info, create_archive

logger = logging.getLogger(__name__)

CRAWLERS = {
    StudenacCrawler.CHAIN: StudenacCrawler,
    SparCrawler.CHAIN: SparCrawler,
    KonzumCrawler.CHAIN: KonzumCrawler,
    PlodineCrawler.CHAIN: PlodineCrawler,
    LidlCrawler.CHAIN: LidlCrawler,
    TommyCrawler.CHAIN: TommyCrawler,
    KauflandCrawler.CHAIN: KauflandCrawler,
    EurospinCrawler.CHAIN: EurospinCrawler,
    MetroCrawler.CHAIN: MetroCrawler,
    ZabacCrawler.CHAIN: ZabacCrawler,
    VrutakCrawler.CHAIN: VrutakCrawler,
    NtlCrawler.CHAIN: NtlCrawler,
    RibolaCrawler.CHAIN: RibolaCrawler,
}


def get_chains() -> List[str]:
    """
    Get the list of retail chains from the crawlers.

    Returns:
        List of retail chain names.
    """
    return list(CRAWLERS.keys())


@dataclass
class CrawlResult:
    elapsed_time: float = 0
    n_stores: int = 0
    n_products: int = 0
    n_prices: int = 0


def crawl_chain(chain: str, date: datetime.date, path: Path) -> CrawlResult:
    """
    Crawl a specific retail chain for product/pricing data and save it.

    Args:
        chain: The name of the retail chain to crawl.
        date: The date for which to fetch the product data.
        path: The directory path where the data will be saved.
    """

    crawler_class = CRAWLERS.get(chain)
    if not crawler_class:
        raise ValueError(f"Unknown retail chain: {chain}")

    crawler = crawler_class()
    t0 = time()
    try:
        stores = crawler.get_all_products(date)
    except Exception as err:
        logger.error(
            "Error crawling %s for %s: %s",
            chain,
            f"{date:%Y-%m-%d}",
            err,
            exc_info=True,
        )
        return CrawlResult()

    if not stores:
        logger.error("No stores imported for %s on %s", chain, date)
        return CrawlResult()

    save_chain(path, stores)
    t1 = time()

    all_products = set()
    n_prices = 0
    for store in stores:
        n_prices += len(store.items)
        for product in store.items:
            all_products.add(product.product_id)

    return CrawlResult(
        elapsed_time=t1 - t0,
        n_stores=len(stores),
        n_products=len(all_products),
        n_prices=n_prices,
    )


def crawl(
    root: Path,
    date: datetime.date | None = None,
    chains: list[str] | None = None,
    workers: int = 4,
) -> Path:
    """
    Crawl multiple retail chains for product/pricing data and save it.

    Args:
        root: The base directory path where the data will be saved.
        date: The date for which to fetch the product data. If None, uses today's date.
        chains: List of retail chain names to crawl. If None, crawls all available chains.
        workers: Number of parallel workers for chain crawling.

    Returns:
        Path to the created ZIP archive file.
    """

    if chains is None:
        chains = get_chains()

    if date is None:
        date = datetime.date.today()

    path = root / date.strftime("%Y-%m-%d")
    zip_path = root / f"{date:%Y-%m-%d}.zip"
    os.makedirs(path, exist_ok=True)

    results = {}

    t0 = time()

    if workers <= 1 or len(chains) <= 1:
        for chain in chains:
            logger.info("Starting crawl for %s on %s", chain, f"{date:%Y-%m-%d}")
            r = crawl_chain(chain, date, path / chain)
            results[chain] = r
    else:
        n_workers = min(workers, len(chains))
        logger.info(
            "Running crawl with %s parallel workers for %s chains",
            n_workers,
            len(chains),
        )

        spawn_context = mp.get_context("spawn")
        with ProcessPoolExecutor(
            max_workers=n_workers,
            mp_context=spawn_context,
        ) as executor:
            future_to_chain = {
                executor.submit(crawl_chain, chain, date, path / chain): chain
                for chain in chains
            }

            for future in as_completed(future_to_chain):
                chain = future_to_chain[future]
                try:
                    results[chain] = future.result()
                except Exception as err:
                    logger.error(
                        "Error crawling %s for %s: %s",
                        chain,
                        f"{date:%Y-%m-%d}",
                        err,
                        exc_info=True,
                    )
                    results[chain] = CrawlResult()
    t1 = time()

    logger.info(
        "Crawled %s for %s in %.2fs",
        ",".join(chains),
        f"{date:%Y-%m-%d}",
        t1 - t0,
    )
    for chain, r in results.items():
        logger.info(
            "  * %s: %s stores, %s products, %s prices in %.2fs",
            chain,
            r.n_stores,
            r.n_products,
            r.n_prices,
            r.elapsed_time,
        )

    copy_archive_info(path)
    create_archive(path, zip_path)

    logger.info("Created archive %s with data for %s", zip_path, f"{date:%Y-%m-%d}")
    return zip_path
