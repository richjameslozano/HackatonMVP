# Feature: deployment-vercel
# Unit tests for CORS edge cases in Settings.cors_origins_list
# Validates: Requirements 6.1, 6.3
"""
Unit tests covering CORS configuration edge cases for the backend Settings.

The `Settings.cors_origins_list` property parses the comma-separated
`CORS_ORIGINS` string into a list of trimmed, non-empty origins. These tests
cover the edge cases called out by the spec:

- empty `CORS_ORIGINS`
- a single configured origin
- duplicate origins
"""

from app.config import Settings


class TestCorsOriginsEdgeCases:
    """Edge case tests for Settings.cors_origins_list."""

    def test_empty_cors_origins_yields_empty_list(self):
        """An empty CORS_ORIGINS produces no allowed origins.

        Validates: Requirements 6.3 - an absent origin must not be granted
        cross-origin access, so an empty configuration allows nothing.
        """
        s = Settings(cors_origins="")
        assert s.cors_origins_list == []

    def test_whitespace_only_cors_origins_yields_empty_list(self):
        """A CORS_ORIGINS containing only whitespace/commas produces no origins.

        Validates: Requirements 6.3
        """
        s = Settings(cors_origins="  ,  , ")
        assert s.cors_origins_list == []

    def test_single_configured_origin(self):
        """A single configured origin is parsed into a one-element list.

        Validates: Requirements 6.1 - the configured frontend origin is included.
        """
        s = Settings(cors_origins="https://app.example.com")
        assert s.cors_origins_list == ["https://app.example.com"]

    def test_single_configured_origin_is_trimmed(self):
        """Surrounding whitespace around a single origin is stripped.

        Validates: Requirements 6.1
        """
        s = Settings(cors_origins="   https://app.example.com   ")
        assert s.cors_origins_list == ["https://app.example.com"]

    def test_duplicate_origins_keep_origin_allowed(self):
        """Duplicate origins still result in the origin being allowed.

        The parser does not dedupe, but the configured origin must always be
        present so that valid cross-origin requests succeed.

        Validates: Requirements 6.1
        """
        s = Settings(cors_origins="https://app.example.com,https://app.example.com")
        origins = s.cors_origins_list
        assert "https://app.example.com" in origins
        # Every entry is the same configured origin.
        assert set(origins) == {"https://app.example.com"}

    def test_duplicate_among_distinct_origins(self):
        """A duplicate alongside a distinct origin keeps both origins allowed.

        Validates: Requirements 6.1
        """
        s = Settings(
            cors_origins="https://app.example.com,https://admin.example.com,https://app.example.com"
        )
        origins = s.cors_origins_list
        assert set(origins) == {
            "https://app.example.com",
            "https://admin.example.com",
        }

    def test_origin_absent_from_config_not_allowed(self):
        """An origin not present in CORS_ORIGINS is not in the allowed list.

        Validates: Requirements 6.3
        """
        s = Settings(cors_origins="https://app.example.com")
        assert "https://evil.example.com" not in s.cors_origins_list
