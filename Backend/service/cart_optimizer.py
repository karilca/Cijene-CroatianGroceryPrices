from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from itertools import combinations
from math import atan2, cos, radians, sin, sqrt
from time import perf_counter

from service.db.models import StorePrice

EPSILON = 1e-9
MODE_GREEDY = "greedy"
MODE_BALANCED = "balanced"
MODE_CONSERVATIVE = "conservative"
VALID_MODES = (MODE_GREEDY, MODE_BALANCED, MODE_CONSERVATIVE)
HEURISTIC_PRIMARY_TOP_N = 12
HEURISTIC_SECONDARY_TOP_N = 18
HEURISTIC_SWAP_POOL_TOP_N = 24
MODE_DOMINANT_DIMENSION_INDEX = {
    MODE_GREEDY: 0,
    MODE_BALANCED: 0,
    MODE_CONSERVATIVE: 2,
}


class CartOptimizationError(Exception):
    def __init__(self, detail_code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.detail_code = detail_code
        self.message = message
        self.status_code = status_code


@dataclass(slots=True)
class CartItem:
    product_id: str
    quantity: int
    product_name: str | None = None


@dataclass(slots=True)
class StoreMeta:
    store_id: str
    chain: str
    store_code: str
    address: str | None
    city: str | None
    lat: float | None
    lon: float | None
    distance_km: float
    distance_estimated: bool = False


@dataclass(slots=True)
class CandidateSolution:
    assignment: dict[str, str]
    unit_prices: dict[str, float]
    total_cost: float
    avg_distance_km: float
    store_count: int
    visited_store_ids: tuple[str, ...]
    norm_cost: float = 0.0
    norm_distance: float = 0.0
    norm_store_count: float = 0.0
    scores: dict[str, float] = field(default_factory=dict)


def optimize_cart_exact(
    *,
    cart_items: list[dict[str, object]],
    store_prices: list[StorePrice],
    mode: str,
    user_lat: float | None,
    user_lon: float | None,
    max_distance_km: float,
    max_stores: int,
    enum_store_limit: int,
    mode_weight_deltas: dict[str, float] | None = None,
) -> dict[str, object]:
    started_at = perf_counter()

    if mode not in VALID_MODES:
        raise CartOptimizationError(
            detail_code="INVALID_OPTIMIZATION_MODE",
            message="Mode mora biti greedy, balanced ili conservative.",
            status_code=422,
        )

    normalized_cart_items = _normalize_cart_items(cart_items)
    if not normalized_cart_items:
        raise CartOptimizationError(
            detail_code="CART_EMPTY",
            message="Košarica je prazna.",
            status_code=400,
        )

    has_user_location = user_lat is not None and user_lon is not None

    stores_by_id, price_matrix = _build_price_matrix(
        store_prices=store_prices,
        user_lat=user_lat,
        user_lon=user_lon,
        max_distance_km=max_distance_km,
        has_user_location=has_user_location,
    )

    available_items: list[CartItem] = []
    unavailable_items: list[CartItem] = []
    for item in normalized_cart_items:
        product_prices = price_matrix.get(item.product_id, {})
        if product_prices:
            available_items.append(item)
        else:
            unavailable_items.append(item)

    if not available_items:
        raise CartOptimizationError(
            detail_code="NO_PRODUCTS_AVAILABLE_NEARBY",
            message="Nijedan proizvod iz košarice nije dostupan u odabranom radijusu.",
            status_code=404,
        )

    available_product_ids = [item.product_id for item in available_items]
    candidate_store_ids = sorted(
        {
            store_id
            for product_id in available_product_ids
            for store_id in price_matrix[product_id].keys()
        }
    )

    if has_user_location:
        candidate_store_ids = [
            store_id
            for store_id in candidate_store_ids
            if stores_by_id[store_id].distance_km <= max_distance_km + EPSILON
        ]

    if not candidate_store_ids:
        raise CartOptimizationError(
            detail_code="NO_STORES_AFTER_FILTERING",
            message="Nema trgovina koje pokrivaju proizvode iz košarice.",
            status_code=404,
        )

    stores_considered = len(candidate_store_ids)
    candidate_store_ids = _prune_dominated_stores(
        store_ids=candidate_store_ids,
        product_ids=available_product_ids,
        price_matrix=price_matrix,
        stores_by_id=stores_by_id,
    )
    stores_after_pruning = len(candidate_store_ids)

    algorithm_used = "exact_subset_enumeration"
    candidates: list[CandidateSolution]
    used_heuristic_fallback = False

    if stores_after_pruning <= enum_store_limit:
        candidates = _enumerate_candidates(
            cart_items=available_items,
            store_ids=candidate_store_ids,
            stores_by_id=stores_by_id,
            price_matrix=price_matrix,
            max_stores=max_stores,
        )
    else:
        candidates = _heuristic_optimize(
            cart_items=available_items,
            store_ids=candidate_store_ids,
            stores_by_id=stores_by_id,
            price_matrix=price_matrix,
            max_stores=max_stores,
            mode=mode,
            has_user_location=has_user_location,
            mode_weight_deltas=mode_weight_deltas,
        )
        algorithm_used = "heuristic_ranked_subset_search"
        used_heuristic_fallback = True

    if not candidates:
        raise CartOptimizationError(
            detail_code="NO_FEASIBLE_ASSIGNMENT",
            message="Nije pronađeno izvedivo rješenje za košaricu.",
            status_code=404,
        )

    _score_candidates(
        candidates,
        has_user_location=has_user_location,
        mode_weight_deltas=mode_weight_deltas,
    )

    selected = _pick_best_candidate(candidates, mode)
    alternatives: dict[str, dict[str, object]] = {}
    for alternative_mode in VALID_MODES:
        if alternative_mode == mode:
            continue
        alternatives[alternative_mode] = _build_solution_summary(
            candidate=_pick_best_candidate(candidates, alternative_mode),
            mode=alternative_mode,
            cart_items=available_items,
            unavailable_items=unavailable_items,
            stores_by_id=stores_by_id,
            include_assignments=False,
        )

    warnings: list[str] = []
    if unavailable_items:
        warnings.append("PARTIAL_FULFILLMENT")
    if not has_user_location:
        warnings.append("DISTANCE_OPTIMIZATION_UNAVAILABLE")
    if used_heuristic_fallback:
        warnings.append("HEURISTIC_FALLBACK_USED")

    duration_ms = int(round((perf_counter() - started_at) * 1000))

    result: dict[str, object] = {
        "recommendation": _build_solution_summary(
            candidate=selected,
            mode=mode,
            cart_items=available_items,
            unavailable_items=unavailable_items,
            stores_by_id=stores_by_id,
            include_assignments=True,
        ),
        "alternatives": alternatives,
        "warnings": warnings,
        "metadata": {
            "algorithmUsed": algorithm_used,
            "computationTimeMs": duration_ms,
            "storesConsidered": stores_considered,
            "storesAfterPruning": stores_after_pruning,
            "candidatesEvaluated": len(candidates),
            "maxEnumerationStores": enum_store_limit,
            "hasUserLocation": has_user_location,
            "partialFulfillment": bool(unavailable_items),
            "heuristicFallback": used_heuristic_fallback,
            "modeWeightDelta": round(float((mode_weight_deltas or {}).get(mode, 0.0)), 4),
            "modeWeights": _weights_payload(
                has_user_location=has_user_location,
                mode_weight_deltas=mode_weight_deltas,
            ),
        },
    }
    return result


def _normalize_cart_items(cart_items: list[dict[str, object]]) -> list[CartItem]:
    normalized: list[CartItem] = []
    for raw_item in cart_items:
        product_id = str(raw_item.get("product_id") or "").strip()
        if not product_id:
            continue

        quantity_value = raw_item.get("quantity")
        quantity = int(quantity_value) if isinstance(quantity_value, (int, float, str)) else 1
        quantity = max(1, quantity)

        raw_name = raw_item.get("name") or raw_item.get("product_name")
        product_name = str(raw_name).strip() if raw_name else None
        product_name = product_name or None

        normalized.append(
            CartItem(
                product_id=product_id,
                quantity=quantity,
                product_name=product_name,
            )
        )
    return normalized


def _build_price_matrix(
    *,
    store_prices: list[StorePrice],
    user_lat: float | None,
    user_lon: float | None,
    max_distance_km: float,
    has_user_location: bool,
) -> tuple[dict[str, StoreMeta], dict[str, dict[str, float]]]:
    stores_by_id: dict[str, StoreMeta] = {}
    price_matrix: dict[str, dict[str, float]] = {}

    for store_price in store_prices:
        effective_price = _effective_price(store_price.regular_price, store_price.special_price)
        if effective_price is None:
            continue

        store_id = _build_store_id(store_price)
        store = store_price.store
        distance_estimated = False

        if has_user_location:
            if store.lat is not None and store.lon is not None and user_lat is not None and user_lon is not None:
                distance_km = _haversine_km(user_lat, user_lon, store.lat, store.lon)
            else:
                distance_km = max_distance_km
                distance_estimated = True
        else:
            distance_km = 0.0

        if store_id not in stores_by_id:
            stores_by_id[store_id] = StoreMeta(
                store_id=store_id,
                chain=store_price.chain,
                store_code=store.code,
                address=store.address,
                city=store.city,
                lat=store.lat,
                lon=store.lon,
                distance_km=distance_km,
                distance_estimated=distance_estimated,
            )

        product_prices = price_matrix.setdefault(store_price.ean, {})
        existing = product_prices.get(store_id)
        if existing is None or effective_price < existing:
            product_prices[store_id] = effective_price

    return stores_by_id, price_matrix


def _effective_price(regular_price: Decimal | None, special_price: Decimal | None) -> float | None:
    valid_prices: list[Decimal] = []
    if regular_price is not None:
        valid_prices.append(regular_price)
    if special_price is not None:
        valid_prices.append(special_price)
    if not valid_prices:
        return None
    return float(min(valid_prices))


def _build_store_id(store_price: StorePrice) -> str:
    return f"{store_price.chain}:{store_price.store.code}"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius_km * c


def _prune_dominated_stores(
    *,
    store_ids: list[str],
    product_ids: list[str],
    price_matrix: dict[str, dict[str, float]],
    stores_by_id: dict[str, StoreMeta],
) -> list[str]:
    dominated: set[str] = set()

    for store_a in store_ids:
        if store_a in dominated:
            continue

        products_for_a = [
            product_id for product_id in product_ids if store_a in price_matrix.get(product_id, {})
        ]
        if not products_for_a:
            dominated.add(store_a)
            continue

        for store_b in store_ids:
            if store_a == store_b or store_b in dominated:
                continue

            distance_a = stores_by_id[store_a].distance_km
            distance_b = stores_by_id[store_b].distance_km
            if distance_b > distance_a + EPSILON:
                continue

            dominated_for_all_products = True
            for product_id in products_for_a:
                price_a = price_matrix[product_id].get(store_a)
                price_b = price_matrix[product_id].get(store_b)
                if price_a is None or price_b is None or price_b > price_a + EPSILON:
                    dominated_for_all_products = False
                    break

            if dominated_for_all_products:
                dominated.add(store_a)
                break

    return [store_id for store_id in store_ids if store_id not in dominated]


def _enumerate_candidates(
    *,
    cart_items: list[CartItem],
    store_ids: list[str],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
    max_stores: int,
) -> list[CandidateSolution]:
    deduplicated: dict[tuple[tuple[str, str], ...], CandidateSolution] = {}
    max_subset_size = min(max_stores, len(store_ids))

    for subset_size in range(1, max_subset_size + 1):
        for subset in combinations(store_ids, subset_size):
            assignment: dict[str, str] = {}
            unit_prices: dict[str, float] = {}
            visited_stores: set[str] = set()
            total_cost = 0.0
            feasible = True

            for cart_item in cart_items:
                product_prices = price_matrix.get(cart_item.product_id, {})
                best_store_id: str | None = None
                best_unit_price = float("inf")

                for store_id in subset:
                    current_price = product_prices.get(store_id)
                    if current_price is None:
                        continue

                    if current_price < best_unit_price - EPSILON:
                        best_unit_price = current_price
                        best_store_id = store_id
                    elif abs(current_price - best_unit_price) <= EPSILON and best_store_id is not None:
                        if _store_name_key(stores_by_id[store_id]) < _store_name_key(stores_by_id[best_store_id]):
                            best_store_id = store_id

                if best_store_id is None:
                    feasible = False
                    break

                assignment[cart_item.product_id] = best_store_id
                unit_prices[cart_item.product_id] = best_unit_price
                visited_stores.add(best_store_id)
                total_cost += best_unit_price * cart_item.quantity

            if not feasible:
                continue

            visited_store_ids = tuple(sorted(visited_stores))
            average_distance = sum(stores_by_id[store_id].distance_km for store_id in visited_store_ids) / len(
                visited_store_ids
            )

            signature = tuple((product_id, assignment[product_id]) for product_id in sorted(assignment))
            candidate = CandidateSolution(
                assignment=assignment,
                unit_prices=unit_prices,
                total_cost=total_cost,
                avg_distance_km=average_distance,
                store_count=len(visited_store_ids),
                visited_store_ids=visited_store_ids,
            )

            existing = deduplicated.get(signature)
            if existing is None or candidate.total_cost < existing.total_cost - EPSILON:
                deduplicated[signature] = candidate

    return list(deduplicated.values())


def _heuristic_optimize(
    *,
    cart_items: list[CartItem],
    store_ids: list[str],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
    max_stores: int,
    mode: str,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None,
) -> list[CandidateSolution]:
    ranked_store_ids = _rank_store_candidates(
        store_ids=store_ids,
        cart_items=cart_items,
        stores_by_id=stores_by_id,
        price_matrix=price_matrix,
    )

    candidates: list[CandidateSolution] = []

    primary_top_n = min(HEURISTIC_PRIMARY_TOP_N, len(ranked_store_ids))
    if primary_top_n > 0:
        candidates.extend(
            _enumerate_candidates(
                cart_items=cart_items,
                store_ids=ranked_store_ids[:primary_top_n],
                stores_by_id=stores_by_id,
                price_matrix=price_matrix,
                max_stores=max_stores,
            )
        )

    if not candidates:
        secondary_top_n = min(HEURISTIC_SECONDARY_TOP_N, len(ranked_store_ids))
        if secondary_top_n > primary_top_n:
            candidates.extend(
                _enumerate_candidates(
                    cart_items=cart_items,
                    store_ids=ranked_store_ids[:secondary_top_n],
                    stores_by_id=stores_by_id,
                    price_matrix=price_matrix,
                    max_stores=max_stores,
                )
            )

    greedy_candidate = _build_greedy_candidate(
        cart_items=cart_items,
        store_ids=store_ids,
        stores_by_id=stores_by_id,
        price_matrix=price_matrix,
        max_stores=max_stores,
    )
    if greedy_candidate is not None:
        candidates.append(greedy_candidate)

        improved_candidate = _improve_candidate_by_swaps(
            candidate=greedy_candidate,
            cart_items=cart_items,
            ranked_store_ids=ranked_store_ids[: min(HEURISTIC_SWAP_POOL_TOP_N, len(ranked_store_ids))],
            stores_by_id=stores_by_id,
            price_matrix=price_matrix,
            max_stores=max_stores,
            mode=mode,
            has_user_location=has_user_location,
            mode_weight_deltas=mode_weight_deltas,
        )
        if improved_candidate is not None:
            candidates.append(improved_candidate)

    return _deduplicate_candidates(candidates)


def _rank_store_candidates(
    *,
    store_ids: list[str],
    cart_items: list[CartItem],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
) -> list[str]:
    cheapest_by_product = {
        item.product_id: min(price_matrix[item.product_id].values())
        for item in cart_items
        if item.product_id in price_matrix and price_matrix[item.product_id]
    }

    ranking: list[tuple[tuple[float, float, float, tuple[str, str]], str]] = []
    for store_id in store_ids:
        covered = 0
        weighted_delta = 0.0
        for item in cart_items:
            product_price = price_matrix.get(item.product_id, {}).get(store_id)
            if product_price is None:
                continue
            covered += 1
            cheapest = cheapest_by_product.get(item.product_id, product_price)
            weighted_delta += (product_price - cheapest) * item.quantity

        sort_key = (
            -float(covered),
            weighted_delta,
            stores_by_id[store_id].distance_km,
            _store_name_key(stores_by_id[store_id]),
        )
        ranking.append((sort_key, store_id))

    ranking.sort(key=lambda row: row[0])
    return [store_id for _, store_id in ranking]


def _build_greedy_candidate(
    *,
    cart_items: list[CartItem],
    store_ids: list[str],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
    max_stores: int,
) -> CandidateSolution | None:
    selected: set[str] = set()

    while len(selected) < max_stores:
        best_store_id: str | None = None
        best_key: tuple[int, float, float, tuple[str, str]] | None = None

        for store_id in store_ids:
            if store_id in selected:
                continue

            newly_covered = 0
            savings = 0.0
            for item in cart_items:
                current_price = _best_price_for_selected(
                    product_id=item.product_id,
                    selected_store_ids=selected,
                    price_matrix=price_matrix,
                )
                candidate_price = price_matrix.get(item.product_id, {}).get(store_id)

                if candidate_price is None:
                    continue

                if current_price is None:
                    newly_covered += 1
                    savings += candidate_price * item.quantity
                elif candidate_price < current_price - EPSILON:
                    savings += (current_price - candidate_price) * item.quantity

            if newly_covered == 0 and savings <= EPSILON:
                continue

            candidate_key = (
                newly_covered,
                savings,
                -stores_by_id[store_id].distance_km,
                _store_name_key(stores_by_id[store_id]),
            )
            if best_key is None or candidate_key > best_key:
                best_key = candidate_key
                best_store_id = store_id

        if best_store_id is None:
            break

        selected.add(best_store_id)

        if _subset_covers_all_products(
            store_subset=selected,
            cart_items=cart_items,
            price_matrix=price_matrix,
        ):
            break

    if not _subset_covers_all_products(
        store_subset=selected,
        cart_items=cart_items,
        price_matrix=price_matrix,
    ):
        return None

    return _candidate_from_store_subset(
        store_subset=selected,
        cart_items=cart_items,
        stores_by_id=stores_by_id,
        price_matrix=price_matrix,
    )


def _improve_candidate_by_swaps(
    *,
    candidate: CandidateSolution,
    cart_items: list[CartItem],
    ranked_store_ids: list[str],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
    max_stores: int,
    mode: str,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None,
) -> CandidateSolution | None:
    current = candidate
    current_score = _heuristic_objective_score(
        candidate=current,
        mode=mode,
        max_stores=max_stores,
        has_user_location=has_user_location,
        mode_weight_deltas=mode_weight_deltas,
    )

    iterations = 0
    while iterations < 3:
        iterations += 1
        improved = False
        current_store_ids = set(current.visited_store_ids)

        for out_store_id in sorted(current_store_ids):
            remaining = set(current_store_ids)
            remaining.remove(out_store_id)

            for in_store_id in ranked_store_ids:
                if in_store_id in remaining:
                    continue

                candidate_subset = set(remaining)
                candidate_subset.add(in_store_id)

                replacement = _candidate_from_store_subset(
                    store_subset=candidate_subset,
                    cart_items=cart_items,
                    stores_by_id=stores_by_id,
                    price_matrix=price_matrix,
                )
                if replacement is None:
                    continue

                replacement_score = _heuristic_objective_score(
                    candidate=replacement,
                    mode=mode,
                    max_stores=max_stores,
                    has_user_location=has_user_location,
                    mode_weight_deltas=mode_weight_deltas,
                )

                if replacement_score < current_score - EPSILON:
                    current = replacement
                    current_score = replacement_score
                    improved = True
                    break

            if improved:
                break

        if not improved:
            break

    return current


def _candidate_from_store_subset(
    *,
    store_subset: set[str],
    cart_items: list[CartItem],
    stores_by_id: dict[str, StoreMeta],
    price_matrix: dict[str, dict[str, float]],
) -> CandidateSolution | None:
    assignment: dict[str, str] = {}
    unit_prices: dict[str, float] = {}
    visited_store_ids: set[str] = set()
    total_cost = 0.0

    for item in cart_items:
        best_store_id: str | None = None
        best_price = float("inf")

        for store_id in store_subset:
            candidate_price = price_matrix.get(item.product_id, {}).get(store_id)
            if candidate_price is None:
                continue

            if candidate_price < best_price - EPSILON:
                best_price = candidate_price
                best_store_id = store_id
            elif abs(candidate_price - best_price) <= EPSILON and best_store_id is not None:
                if _store_name_key(stores_by_id[store_id]) < _store_name_key(stores_by_id[best_store_id]):
                    best_store_id = store_id

        if best_store_id is None:
            return None

        assignment[item.product_id] = best_store_id
        unit_prices[item.product_id] = best_price
        visited_store_ids.add(best_store_id)
        total_cost += best_price * item.quantity

    visited_tuple = tuple(sorted(visited_store_ids))
    avg_distance = sum(stores_by_id[store_id].distance_km for store_id in visited_tuple) / len(visited_tuple)

    return CandidateSolution(
        assignment=assignment,
        unit_prices=unit_prices,
        total_cost=total_cost,
        avg_distance_km=avg_distance,
        store_count=len(visited_tuple),
        visited_store_ids=visited_tuple,
    )


def _subset_covers_all_products(
    *,
    store_subset: set[str],
    cart_items: list[CartItem],
    price_matrix: dict[str, dict[str, float]],
) -> bool:
    for item in cart_items:
        if not any(store_id in price_matrix.get(item.product_id, {}) for store_id in store_subset):
            return False
    return True


def _best_price_for_selected(
    *,
    product_id: str,
    selected_store_ids: set[str],
    price_matrix: dict[str, dict[str, float]],
) -> float | None:
    if not selected_store_ids:
        return None

    prices = [
        price_matrix.get(product_id, {}).get(store_id)
        for store_id in selected_store_ids
    ]
    valid_prices = [price for price in prices if price is not None]
    if not valid_prices:
        return None
    return min(valid_prices)


def _heuristic_objective_score(
    *,
    candidate: CandidateSolution,
    mode: str,
    max_stores: int,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None,
) -> float:
    wc, wd, wk = _weights_for_mode(
        mode,
        has_user_location=has_user_location,
        mode_weight_deltas=mode_weight_deltas,
    )

    stores_norm = candidate.store_count / max(1, max_stores)
    distance_norm = 0.0 if not has_user_location else candidate.avg_distance_km / 10.0
    cost_norm = candidate.total_cost / 100.0

    return wc * cost_norm + wd * distance_norm + wk * stores_norm


def _deduplicate_candidates(candidates: list[CandidateSolution]) -> list[CandidateSolution]:
    dedup: dict[tuple[tuple[str, str], ...], CandidateSolution] = {}
    for candidate in candidates:
        signature = tuple((product_id, candidate.assignment[product_id]) for product_id in sorted(candidate.assignment))
        existing = dedup.get(signature)
        if existing is None or candidate.total_cost < existing.total_cost - EPSILON:
            dedup[signature] = candidate
    return list(dedup.values())


def _score_candidates(
    candidates: list[CandidateSolution],
    *,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None,
) -> None:
    costs = [candidate.total_cost for candidate in candidates]
    distances = [candidate.avg_distance_km for candidate in candidates]
    store_counts = [candidate.store_count for candidate in candidates]

    min_cost = min(costs)
    max_cost = max(costs)
    min_distance = min(distances)
    max_distance = max(distances)
    min_store_count = min(store_counts)
    max_store_count = max(store_counts)

    for candidate in candidates:
        candidate.norm_cost = _safe_normalize(candidate.total_cost, min_cost, max_cost)
        candidate.norm_distance = _safe_normalize(candidate.avg_distance_km, min_distance, max_distance)
        candidate.norm_store_count = _safe_normalize(candidate.store_count, min_store_count, max_store_count)

        for mode in VALID_MODES:
            weight_cost, weight_distance, weight_store_count = _weights_for_mode(
                mode,
                has_user_location=has_user_location,
                mode_weight_deltas=mode_weight_deltas,
            )
            candidate.scores[mode] = (
                weight_cost * candidate.norm_cost
                + weight_distance * candidate.norm_distance
                + weight_store_count * candidate.norm_store_count
            )


def _safe_normalize(value: float, minimum: float, maximum: float) -> float:
    if abs(maximum - minimum) <= EPSILON:
        return 0.0
    return (value - minimum) / (maximum - minimum)


def _weights_for_mode(
    mode: str,
    *,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None = None,
) -> tuple[float, float, float]:
    if has_user_location:
        weights = {
            MODE_GREEDY: (0.70, 0.15, 0.15),
            MODE_BALANCED: (0.40, 0.30, 0.30),
            MODE_CONSERVATIVE: (0.15, 0.40, 0.45),
        }
    else:
        weights = {
            MODE_GREEDY: (0.82, 0.00, 0.18),
            MODE_BALANCED: (0.57, 0.00, 0.43),
            MODE_CONSERVATIVE: (0.25, 0.00, 0.75),
        }

    base = weights[mode]
    delta = float((mode_weight_deltas or {}).get(mode, 0.0))
    if abs(delta) <= EPSILON:
        return base

    return _apply_mode_weight_delta(mode=mode, base=base, delta=delta)


def _apply_mode_weight_delta(*, mode: str, base: tuple[float, float, float], delta: float) -> tuple[float, float, float]:
    dominant_index = MODE_DOMINANT_DIMENSION_INDEX[mode]
    values = list(base)
    dominant_value = values[dominant_index]

    if delta < 0:
        applied_delta = min(abs(delta), dominant_value)
        values[dominant_index] = dominant_value - applied_delta
        share = applied_delta / 2.0
        for idx in range(3):
            if idx == dominant_index:
                continue
            values[idx] += share
        return _normalize_weight_tuple(tuple(values))

    available = sum(values[idx] for idx in range(3) if idx != dominant_index)
    applied_delta = min(delta, available)

    remaining = applied_delta
    donors = [idx for idx in range(3) if idx != dominant_index]
    while remaining > EPSILON and donors:
        share = remaining / len(donors)
        next_donors: list[int] = []
        for idx in donors:
            take = min(values[idx], share)
            values[idx] -= take
            remaining -= take
            if values[idx] > EPSILON:
                next_donors.append(idx)
        donors = next_donors

    values[dominant_index] = dominant_value + (applied_delta - max(0.0, remaining))
    return _normalize_weight_tuple(tuple(values))


def _normalize_weight_tuple(values: tuple[float, float, float]) -> tuple[float, float, float]:
    total = sum(values)
    if total <= EPSILON:
        return (1.0, 0.0, 0.0)
    return (
        values[0] / total,
        values[1] / total,
        values[2] / total,
    )


def _weights_payload(
    *,
    has_user_location: bool,
    mode_weight_deltas: dict[str, float] | None,
) -> dict[str, dict[str, float]]:
    payload: dict[str, dict[str, float]] = {}
    for mode in VALID_MODES:
        wc, wd, wk = _weights_for_mode(
            mode,
            has_user_location=has_user_location,
            mode_weight_deltas=mode_weight_deltas,
        )
        payload[mode] = {
            "cost": round(wc, 4),
            "distance": round(wd, 4),
            "storeCount": round(wk, 4),
        }
    return payload


def _pick_best_candidate(candidates: list[CandidateSolution], mode: str) -> CandidateSolution:
    best = candidates[0]
    for candidate in candidates[1:]:
        best_score = best.scores[mode]
        candidate_score = candidate.scores[mode]

        if candidate_score < best_score - EPSILON:
            best = candidate
            continue

        if abs(candidate_score - best_score) > EPSILON:
            continue

        candidate_key = (
            candidate.store_count,
            candidate.avg_distance_km,
            candidate.total_cost,
            candidate.visited_store_ids,
        )
        best_key = (
            best.store_count,
            best.avg_distance_km,
            best.total_cost,
            best.visited_store_ids,
        )
        if candidate_key < best_key:
            best = candidate

    return best


def _build_solution_summary(
    *,
    candidate: CandidateSolution,
    mode: str,
    cart_items: list[CartItem],
    unavailable_items: list[CartItem],
    stores_by_id: dict[str, StoreMeta],
    include_assignments: bool,
) -> dict[str, object]:
    assignments: list[dict[str, object]] = []
    store_subtotals: dict[str, float] = {store_id: 0.0 for store_id in candidate.visited_store_ids}
    store_item_counts: dict[str, int] = {store_id: 0 for store_id in candidate.visited_store_ids}

    for cart_item in cart_items:
        store_id = candidate.assignment[cart_item.product_id]
        unit_price = candidate.unit_prices[cart_item.product_id]
        line_total = unit_price * cart_item.quantity
        store_subtotals[store_id] += line_total
        store_item_counts[store_id] += 1

        if not include_assignments:
            continue

        store = stores_by_id[store_id]
        assignments.append(
            {
                "productId": cart_item.product_id,
                "productName": cart_item.product_name,
                "quantity": cart_item.quantity,
                "unitPrice": _round_currency(unit_price),
                "lineTotal": _round_currency(line_total),
                "store": {
                    "id": store.store_id,
                    "name": _store_display_name(store),
                    "chain": store.chain,
                    "storeCode": store.store_code,
                    "address": store.address,
                    "city": store.city,
                    "distanceKm": round(store.distance_km, 2),
                    "distanceEstimated": store.distance_estimated,
                },
            }
        )

    stores_payload: list[dict[str, object]] = []
    for store_id in candidate.visited_store_ids:
        store = stores_by_id[store_id]
        stores_payload.append(
            {
                "id": store.store_id,
                "name": _store_display_name(store),
                "chain": store.chain,
                "storeCode": store.store_code,
                "address": store.address,
                "city": store.city,
                "lat": store.lat,
                "lon": store.lon,
                "distanceKm": round(store.distance_km, 2),
                "distanceEstimated": store.distance_estimated,
                "subtotal": _round_currency(store_subtotals[store_id]),
                "itemCount": store_item_counts[store_id],
            }
        )

    stores_payload.sort(key=lambda store: (store["distanceKm"], str(store["name"])))

    unavailable_payload = [
        {
            "productId": item.product_id,
            "productName": item.product_name,
            "quantity": item.quantity,
            "reason": "NOT_STOCKED_NEARBY",
        }
        for item in unavailable_items
    ]

    summary: dict[str, object] = {
        "mode": mode,
        "totalCost": _round_currency(candidate.total_cost),
        "currency": "EUR",
        "storesVisited": candidate.store_count,
        "averageDistanceKm": round(candidate.avg_distance_km, 2),
        "score": round(candidate.scores[mode], 6),
        "storeNames": [_store_display_name(stores_by_id[store_id]) for store_id in candidate.visited_store_ids],
        "stores": stores_payload,
        "unavailableProducts": unavailable_payload,
    }

    if include_assignments:
        summary["assignments"] = assignments

    return summary


def _round_currency(value: float) -> float:
    return round(value + EPSILON, 2)


def _store_display_name(store: StoreMeta) -> str:
    return f"{store.chain.upper()} {store.store_code}"


def _store_name_key(store: StoreMeta) -> tuple[str, str]:
    return (store.chain.lower(), store.store_code.lower())
