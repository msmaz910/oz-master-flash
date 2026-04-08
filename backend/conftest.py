import pytest
from models import init_db

@pytest.fixture(scope="session", autouse=True)
def init_database():
    """Initialize database for tests."""
    init_db()
    yield
