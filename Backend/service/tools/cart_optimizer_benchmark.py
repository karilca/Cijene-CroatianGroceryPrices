from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from statistics import mean, median
from time import perf_counter

from service.cart_optimizer import CartOptimizationError, optimize_cart_exact
from service.db.models import Store, StorePrice

MODES = ("greedy", "balanced", "conservative")


@dataclass(slots=True)
class BenchmarkRow:
    scenario_id: int
    mode: str
    exact_ms: float
    heuristic_ms: float
    exact_cost: float
    heuristic_cost: float
    cost_gap_pct: float
    exact_stores: int
    heuristic_stores: int
    heuristic_fallback_used: bool


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]

    ordered = sorted(values)
    position = q * (len(ordered) - 1)
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def _decimal_price(value: float) -> Decimal:
    return Decimal(f"{value:.2f}")


def _generate_scenario(
    *,
    seed: int,
    scenario_id: int,
    cart_size: int,
    store_count: int,
    max_stores: int,
) -> tuple[list[dict[str, object]], list[StorePrice], float, float]:
    rng = random.Random(seed + scenario_id)
    today = date.today()

    user_lat = 45.812 + rng.uniform(-0.04, 0.04)
    user_lon = 15.977 + rng.uniform(-0.06, 0.06)

    cart_items: list[dict[str, object]] = []
    for i in range(cart_size):
        product_id = f"{3850000000000 + scenario_id * 100 + i}"
        quantity = rng.randint(1, 3)
        cart_items.append(
            {
                "product_id": product_id,
                "quantity": quantity,
                "name": f"Product {i + 1}",
            }
        )

    chains = ["konzum", "lidl", "spar", "kaufland", "plodine", "tommy"]
    chain_to_id = {chain: idx + 1 for idx, chain in enumerate(chains)}

    stores: list[tuple[str, Store]] = []
    for idx in range(store_count):
        chain = chains[idx % len(chains)]
        store = Store(
            chain_id=chain_to_id[chain],
            code=f"S{idx + 1:03d}",
            type="supermarket",
            address=f"Ulica {idx + 1}",
            city="Zagreb",
            zipcode="10000",
            lat=45.78 + rng.uniform(-0.08, 0.08),
            lon=15.95 + rng.uniform(-0.12, 0.12),
            phone=None,
        )
        stores.append((chain, store))

    store_prices: list[StorePrice] = []
    anchor_store_count = min(max_stores, len(stores))

    for store_idx, (chain, store) in enumerate(stores):
        for item in cart_items:
            if store_idx < anchor_store_count:
                # Anchor stores ensure feasibility with max_stores constraints.
                available = True
                base_price = rng.uniform(1.5, 15.0)
                regular = base_price + 1.0
            else:
                available = rng.random() < 0.72
                if not available:
                    continue
                regular = rng.uniform(1.0, 14.0)

            special_price = None
            if rng.random() < 0.24:
                special_price = max(0.5, regular * rng.uniform(0.75, 0.97))

            store_prices.append(
                StorePrice(
                    chain=chain,
                    ean=str(item["product_id"]),
                    price_date=today,
                    regular_price=_decimal_price(regular),
                    special_price=None if special_price is None else _decimal_price(special_price),
                    unit_price=None,
                    best_price_30=None,
                    anchor_price=None,
                    store=store,
                )
            )

    return cart_items, store_prices, user_lat, user_lon


def _run_for_mode(
    *,
    mode: str,
    cart_items: list[dict[str, object]],
    store_prices: list[StorePrice],
    user_lat: float,
    user_lon: float,
    max_distance_km: float,
    max_stores: int,
    heuristic_limit: int,
) -> BenchmarkRow:
    exact_started = perf_counter()
    exact_result = optimize_cart_exact(
        cart_items=cart_items,
        store_prices=store_prices,
        mode=mode,
        user_lat=user_lat,
        user_lon=user_lon,
        max_distance_km=max_distance_km,
        max_stores=max_stores,
        enum_store_limit=10_000,
    )
    exact_ms = (perf_counter() - exact_started) * 1000

    heuristic_started = perf_counter()
    heuristic_result = optimize_cart_exact(
        cart_items=cart_items,
        store_prices=store_prices,
        mode=mode,
        user_lat=user_lat,
        user_lon=user_lon,
        max_distance_km=max_distance_km,
        max_stores=max_stores,
        enum_store_limit=max(1, heuristic_limit),
    )
    heuristic_ms = (perf_counter() - heuristic_started) * 1000

    exact_cost = float(exact_result["recommendation"]["totalCost"])
    heuristic_cost = float(heuristic_result["recommendation"]["totalCost"])
    gap = 0.0
    if exact_cost > 0:
        gap = ((heuristic_cost - exact_cost) / exact_cost) * 100.0

    exact_stores = int(exact_result["recommendation"]["storesVisited"])
    heuristic_stores = int(heuristic_result["recommendation"]["storesVisited"])
    heuristic_fallback_used = bool(heuristic_result["metadata"].get("heuristicFallback"))

    return BenchmarkRow(
        scenario_id=0,
        mode=mode,
        exact_ms=exact_ms,
        heuristic_ms=heuristic_ms,
        exact_cost=exact_cost,
        heuristic_cost=heuristic_cost,
        cost_gap_pct=gap,
        exact_stores=exact_stores,
        heuristic_stores=heuristic_stores,
        heuristic_fallback_used=heuristic_fallback_used,
    )


def run_benchmark(args: argparse.Namespace) -> dict[str, object]:
    rows: list[BenchmarkRow] = []
    failures: list[dict[str, object]] = []

    for scenario_id in range(1, args.scenarios + 1):
        cart_items, store_prices, user_lat, user_lon = _generate_scenario(
            seed=args.seed,
            scenario_id=scenario_id,
            cart_size=args.cart_size,
            store_count=args.store_count,
            max_stores=args.max_stores,
        )

        for mode in MODES:
            try:
                row = _run_for_mode(
                    mode=mode,
                    cart_items=cart_items,
                    store_prices=store_prices,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    max_distance_km=args.max_distance_km,
                    max_stores=args.max_stores,
                    heuristic_limit=args.heuristic_limit,
                )
            except CartOptimizationError as exc:
                failures.append(
                    {
                        "scenario": scenario_id,
                        "mode": mode,
                        "detail_code": exc.detail_code,
                        "message": exc.message,
                    }
                )
                continue

            row.scenario_id = scenario_id
            rows.append(row)

    mode_summary: dict[str, dict[str, object]] = {}
    for mode in MODES:
        mode_rows = [row for row in rows if row.mode == mode]
        if not mode_rows:
            continue

        exact_ms = [row.exact_ms for row in mode_rows]
        heuristic_ms = [row.heuristic_ms for row in mode_rows]
        gaps = [row.cost_gap_pct for row in mode_rows]
        fallback_rate = (
            sum(1 for row in mode_rows if row.heuristic_fallback_used) / len(mode_rows)
        ) * 100.0

        mode_summary[mode] = {
            "samples": len(mode_rows),
            "exact": {
                "p50_ms": round(_percentile(exact_ms, 0.50), 3),
                "p95_ms": round(_percentile(exact_ms, 0.95), 3),
                "mean_ms": round(mean(exact_ms), 3),
            },
            "heuristic": {
                "p50_ms": round(_percentile(heuristic_ms, 0.50), 3),
                "p95_ms": round(_percentile(heuristic_ms, 0.95), 3),
                "mean_ms": round(mean(heuristic_ms), 3),
                "fallback_rate_pct": round(fallback_rate, 2),
            },
            "quality": {
                "median_cost_gap_pct": round(median(gaps), 4),
                "p95_cost_gap_pct": round(_percentile(gaps, 0.95), 4),
                "max_cost_gap_pct": round(max(gaps), 4),
            },
        }

    return {
        "config": {
            "scenarios": args.scenarios,
            "cart_size": args.cart_size,
            "store_count": args.store_count,
            "max_stores": args.max_stores,
            "max_distance_km": args.max_distance_km,
            "heuristic_limit": args.heuristic_limit,
            "seed": args.seed,
        },
        "summary": mode_summary,
        "failures": failures,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Benchmark quality and latency of cart optimizer exact vs heuristic paths.",
    )
    parser.add_argument("--scenarios", type=int, default=30)
    parser.add_argument("--cart-size", type=int, default=14)
    parser.add_argument("--store-count", type=int, default=28)
    parser.add_argument("--max-stores", type=int, default=5)
    parser.add_argument("--max-distance-km", type=float, default=15.0)
    parser.add_argument("--heuristic-limit", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=str, default="")
    return parser


def _print_report(report: dict[str, object]) -> None:
    print("Cart Optimizer Benchmark")
    print("========================")
    config = report["config"]
    print(
        "scenarios={scenarios} cart={cart_size} stores={store_count} max_stores={max_stores} "
        "max_distance={max_distance_km}km heuristic_limit={heuristic_limit} seed={seed}".format(**config)
    )
    print()

    summary = report["summary"]
    if not summary:
        print("No successful samples.")
    else:
        for mode in MODES:
            if mode not in summary:
                continue
            mode_report = summary[mode]
            print(f"Mode: {mode}")
            print(f"  samples: {mode_report['samples']}")
            print(
                "  exact(ms): p50={p50} p95={p95} mean={mean}".format(
                    p50=mode_report["exact"]["p50_ms"],
                    p95=mode_report["exact"]["p95_ms"],
                    mean=mode_report["exact"]["mean_ms"],
                )
            )
            print(
                "  heuristic(ms): p50={p50} p95={p95} mean={mean} fallback={fallback}%".format(
                    p50=mode_report["heuristic"]["p50_ms"],
                    p95=mode_report["heuristic"]["p95_ms"],
                    mean=mode_report["heuristic"]["mean_ms"],
                    fallback=mode_report["heuristic"]["fallback_rate_pct"],
                )
            )
            print(
                "  cost-gap(%): median={median_gap} p95={p95_gap} max={max_gap}".format(
                    median_gap=mode_report["quality"]["median_cost_gap_pct"],
                    p95_gap=mode_report["quality"]["p95_cost_gap_pct"],
                    max_gap=mode_report["quality"]["max_cost_gap_pct"],
                )
            )
            print()

    failures = report["failures"]
    if failures:
        print(f"Failures: {len(failures)}")
        for failure in failures[:5]:
            print(
                "  scenario={scenario} mode={mode} detail_code={detail_code} message={message}".format(
                    **failure
                )
            )
        if len(failures) > 5:
            print(f"  ... and {len(failures) - 5} more")


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    report = run_benchmark(args)
    _print_report(report)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fp:
            json.dump(report, fp, ensure_ascii=False, indent=2)
        print(f"Saved benchmark report to {args.output}")


if __name__ == "__main__":
    main()
