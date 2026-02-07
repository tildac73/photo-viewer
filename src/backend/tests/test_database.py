"""
Tests for the database configuration module.
"""

import pytest
from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import DeclarativeMeta


class TestDatabaseConfiguration:
    """Tests for database.py configuration."""

    def test_base_is_declarative(self):
        """Test that Base is a valid SQLAlchemy declarative base."""
        from ..database import Base

        assert isinstance(Base, DeclarativeMeta)

    def test_session_local_creates_session(self, in_memory_db):
        """Test that SessionLocal creates valid database sessions."""
        session = in_memory_db()

        assert isinstance(session, Session)
        session.close()

    def test_engine_exists(self):
        """Test that the engine is created."""
        from ..database import engine

        assert engine is not None
        assert hasattr(engine, 'connect')

    def test_base_can_create_tables(self, in_memory_db):
        """Test that Base.metadata can be used to create tables."""
        from ..database import Base
        from .. import models  # Ensure models are loaded

        # The in_memory_db fixture already creates tables, so just verify
        # that the Photos table exists in metadata
        assert 'photos' in Base.metadata.tables

    def test_session_can_execute_query(self, in_memory_db):
        """Test that sessions can execute basic queries."""
        from .. import models

        session = in_memory_db()

        # Execute a simple query
        result = session.query(models.Photos).all()
        assert isinstance(result, list)

        session.close()

    def test_session_rollback_on_error(self, in_memory_db):
        """Test that session rollback works correctly."""
        from .. import models
        from datetime import datetime

        session = in_memory_db()

        # Add a photo
        photo = models.Photos(
            file_path="rollback-test.jpg",
            upload_time=datetime.now()
        )
        session.add(photo)
        session.flush()

        # Rollback
        session.rollback()

        # Verify the photo was not persisted
        result = session.query(models.Photos).filter_by(file_path="rollback-test.jpg").first()
        assert result is None

        session.close()
