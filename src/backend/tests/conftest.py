import os
# Set environment to use SQLite for testing BEFORE importing any modules
os.environ['DATABASE_MODE'] = 'test'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from datetime import datetime


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment variables."""
    os.environ['DATABASE_MODE'] = 'test'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database for testing."""
    from ..database import Base

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal


@pytest.fixture
def db_session(in_memory_db):
    """Get a database session for testing."""
    session = in_memory_db()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def mock_s3():
    """Mock boto3 S3 client."""
    from .. import main as main_module

    mock = Mock()
    mock.generate_presigned_url.return_value = "https://mock-s3-url.com/photo.jpg"
    original_s3 = main_module.s3
    main_module.s3 = mock
    yield mock
    main_module.s3 = original_s3


@pytest.fixture
def sample_photo(db_session):
    """Create a sample photo in the database."""
    from .. import models

    photo = models.Photos(
        file_path="test-photo-123.jpg",
        upload_time=datetime(2024, 1, 15, 10, 30, 0),
        tags="summer,beach,vacation",
        alt_text="A beautiful beach photo"
    )
    db_session.add(photo)
    db_session.commit()
    db_session.refresh(photo)
    return photo


@pytest.fixture
def multiple_photos(db_session):
    """Create multiple sample photos in the database."""
    from .. import models

    photos = []
    for i in range(5):
        photo = models.Photos(
            file_path=f"test-photo-{i}.jpg",
            upload_time=datetime(2024, 1, 15 + i, 10, 30, 0),
            tags=f"tag{i},common",
            alt_text=f"Test photo {i}"
        )
        db_session.add(photo)
        photos.append(photo)
    db_session.commit()
    for photo in photos:
        db_session.refresh(photo)
    return photos


@pytest.fixture
def test_client(in_memory_db, mock_s3):
    """Create a test client with mocked dependencies."""
    from ..main import app, get_db

    def override_get_db():
        session = in_memory_db()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_client_with_photos(in_memory_db, mock_s3):
    """Create a test client with pre-populated photos."""
    from ..main import app, get_db
    from .. import models

    def override_get_db():
        session = in_memory_db()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Add sample photos
    session = in_memory_db()
    for i in range(3):
        photo = models.Photos(
            file_path=f"photo-{i}.jpg",
            upload_time=datetime(2024, 1, 15 + i, 10, 30, 0),
            tags=f"tag{i},common",
            alt_text=f"Photo {i}"
        )
        session.add(photo)
    session.commit()
    session.close()

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
