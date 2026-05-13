"""
Repository layer for data access.
"""
from app.repositories.base import BaseRepository
from app.repositories.merchant_repository import MerchantRepository

__all__ = ["BaseRepository", "MerchantRepository"]
