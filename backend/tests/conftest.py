import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_rate_limit_cache():
    # Rate-limit counters live in the cache; without this, login tests would leak into each other.
    cache.clear()
