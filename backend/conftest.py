import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="session", autouse=True)
def setup_test_app():
    from models import Base, User, Board, get_db
    from main import app

    # Create all tables in the in-memory database
    Base.metadata.create_all(bind=test_engine)

    # Seed default user and board
    db = TestSessionLocal()
    try:
        user = User(username="user")
        db.add(user)
        db.commit()
        db.refresh(user)
        default_data = json.dumps({
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": []},
                {"id": "col-discovery", "title": "Discovery", "cardIds": []},
                {"id": "col-progress", "title": "In Progress", "cardIds": []},
                {"id": "col-review", "title": "Review", "cardIds": []},
                {"id": "col-done", "title": "Done", "cardIds": []},
            ],
            "cards": {}
        })
        board = Board(user_id=user.id, data=default_data)
        db.add(board)
        db.commit()
    finally:
        db.close()

    # Override FastAPI dependency to use in-memory DB
    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
