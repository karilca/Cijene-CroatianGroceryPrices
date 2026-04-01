"""Text normalization helpers used across backend endpoints.

Keep normalization minimal: trim, collapse whitespace, treat "#" as missing,
and optionally capitalize (matching previous `.capitalize()` usage).
"""
import re


def normalize_product_text(value: str | None, *, capitalize: bool = False) -> str | None:
    """Normalize product/brand text.

    - Trims surrounding whitespace
    - Collapses internal whitespace to a single space
    - Treats empty strings and "#" as missing (returns None)
    - If `capitalize=True` applies Python's `str.capitalize()` to the result

    Returns None when input is None or considered empty.
    """
    if value is None:
        return None

    s = str(value).strip()
    if not s or s == "#":
        return None

    s = re.sub(r"\s+", " ", s)

    # Preserve existing API behavior used in product category responses.
    return s.capitalize() if capitalize else s
