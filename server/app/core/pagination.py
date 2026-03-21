from __future__ import annotations

from app.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE


def clamp_skip(skip: int | None) -> int:
    if skip is None:
        return 0
    return max(0, int(skip))


def clamp_limit(
    limit: int | None,
    *,
    default: int = DEFAULT_PAGE_SIZE,
    max_limit: int = MAX_PAGE_SIZE,
) -> int:
    if limit is None:
        limit = default
    return max(1, min(int(limit), int(max_limit)))


def clamp_pagination(
    skip: int | None,
    limit: int | None,
    *,
    default_limit: int = DEFAULT_PAGE_SIZE,
    max_limit: int = MAX_PAGE_SIZE,
) -> tuple[int, int]:
    return clamp_skip(skip), clamp_limit(limit, default=default_limit, max_limit=max_limit)

