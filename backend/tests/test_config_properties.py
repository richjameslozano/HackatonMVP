# Feature: api-request-caching, Property 2: Configuration validation bounds
# **Validates: Requirements 1.3, 7.3**
"""
Property-based tests for Settings configuration validation.

Tests that cache_ttl_seconds and batch_flush_interval_seconds accept values
in [1, 86400] and reject values outside that range with ValueError.
"""

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st
from pydantic import ValidationError

from app.config import Settings


# Strategy for valid time values: integers in [1, 86400]
valid_time_values = st.integers(min_value=1, max_value=86400)

# Strategy for invalid time values: integers outside [1, 86400]
invalid_time_values = st.one_of(
    st.integers(max_value=0),
    st.integers(min_value=86401),
)


class TestConfigurationValidationBounds:
    """Property 2: Configuration validation bounds.

    For any integer value for cache TTL or flush interval, the system SHALL
    accept values in [1, 86400] and reject values outside that range with a
    configuration error.
    """

    @given(ttl=valid_time_values)
    @settings(max_examples=100)
    def test_valid_cache_ttl_seconds_accepted(self, ttl: int) -> None:
        """Valid cache_ttl_seconds values in [1, 86400] are accepted."""
        s = Settings(cache_ttl_seconds=ttl)
        assert s.cache_ttl_seconds == ttl

    @given(interval=valid_time_values)
    @settings(max_examples=100)
    def test_valid_batch_flush_interval_seconds_accepted(self, interval: int) -> None:
        """Valid batch_flush_interval_seconds values in [1, 86400] are accepted."""
        s = Settings(batch_flush_interval_seconds=interval)
        assert s.batch_flush_interval_seconds == interval

    @given(ttl=invalid_time_values)
    @settings(max_examples=100)
    def test_invalid_cache_ttl_seconds_rejected(self, ttl: int) -> None:
        """cache_ttl_seconds values outside [1, 86400] raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(cache_ttl_seconds=ttl)
        assert "Value must be between 1 and 86400 seconds" in str(exc_info.value)

    @given(interval=invalid_time_values)
    @settings(max_examples=100)
    def test_invalid_batch_flush_interval_seconds_rejected(self, interval: int) -> None:
        """batch_flush_interval_seconds values outside [1, 86400] raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(batch_flush_interval_seconds=interval)
        assert "Value must be between 1 and 86400 seconds" in str(exc_info.value)
