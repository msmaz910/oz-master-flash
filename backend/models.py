import os
import json
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime, timezone

from security import hash_password

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kanban.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    boards = relationship("Board", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, default="My Board")
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="boards")
    conversations = relationship("Conversation", back_populates="board", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    messages = Column(Text, nullable=False)  # JSON array of {role: "user"|"assistant", content: string}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    board = relationship("Board", back_populates="conversations")

class UserSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sessions")

def empty_board_data() -> str:
    return json.dumps({
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": []},
            {"id": "col-discovery", "title": "Discovery", "cardIds": []},
            {"id": "col-progress", "title": "In Progress", "cardIds": []},
            {"id": "col-review", "title": "Review", "cardIds": []},
            {"id": "col-done", "title": "Done", "cardIds": []},
        ],
        "cards": {}
    })

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_board_name_column():
    """Lightweight migration: add boards.name if it doesn't exist yet (pre-multi-board DBs)."""
    inspector = inspect(engine)
    if "boards" not in inspector.get_table_names():
        return
    existing_columns = {col["name"] for col in inspector.get_columns("boards")}
    if "name" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE boards ADD COLUMN name VARCHAR DEFAULT 'My Board'"))

def _ensure_user_password_column():
    """Lightweight migration: add users.password_hash if it doesn't exist yet (pre-auth DBs)."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    if "password_hash" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR DEFAULT ''"))

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_board_name_column()
    _ensure_user_password_column()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "user").first()
        if not user:
            user = User(username="user", password_hash=hash_password("password"))
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.password_hash:
            # Backfill the documented demo credentials for pre-auth databases.
            user.password_hash = hash_password("password")
            db.commit()

        existing_board = db.query(Board).filter(Board.user_id == user.id).first()
        if not existing_board:
            # Create default board with placeholder cards for testing
            default_data = '''{
  "columns": [
    {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
    {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
    {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4"]},
    {"id": "col-review", "title": "Review", "cardIds": ["card-5"]},
    {"id": "col-done", "title": "Done", "cardIds": ["card-6"]}
  ],
  "cards": {
    "card-1": {"id": "card-1", "title": "Set up project repo", "details": "Initialize repository and configure tooling"},
    "card-2": {"id": "card-2", "title": "Write project brief", "details": "Define scope, goals, and success criteria"},
    "card-3": {"id": "card-3", "title": "Design system architecture", "details": "Diagram components and data flow"},
    "card-4": {"id": "card-4", "title": "Implement login page", "details": "Build auth UI with form validation"},
    "card-5": {"id": "card-5", "title": "API integration", "details": "Connect frontend to backend endpoints"},
    "card-6": {"id": "card-6", "title": "Deploy to staging", "details": "Build Docker image and push to staging environment"}
  }
}'''
            board = Board(user_id=user.id, name="My Board", data=default_data)
            db.add(board)
            db.commit()
    finally:
        db.close()
