import os
import json
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime, timezone

from security import hash_password

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kanban.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False, default="")
    created_at = Column(DateTime, default=utcnow)

    boards = relationship("Board", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, default="My Board")
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="boards")
    conversations = relationship("Conversation", back_populates="board", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    messages = Column(Text, nullable=False)  # JSON array of {role: "user"|"assistant", content: string}
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User")
    board = relationship("Board", back_populates="conversations")

class UserSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

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

def _ensure_column(table: str, column: str, column_ddl: str):
    """Lightweight migration: add a column added after the initial schema, if it's missing."""
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    if column in {col["name"] for col in inspector.get_columns(table)}:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_ddl}"))

def _seed_board_data() -> str:
    """The demo user's starter board: placeholder cards spread across the columns."""
    cards = {
        "card-1": ("Set up project repo", "Initialize repository and configure tooling"),
        "card-2": ("Write project brief", "Define scope, goals, and success criteria"),
        "card-3": ("Design system architecture", "Diagram components and data flow"),
        "card-4": ("Implement login page", "Build auth UI with form validation"),
        "card-5": ("API integration", "Connect frontend to backend endpoints"),
        "card-6": ("Deploy to staging", "Build Docker image and push to staging environment"),
    }
    return json.dumps({
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
            {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
            {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4"]},
            {"id": "col-review", "title": "Review", "cardIds": ["card-5"]},
            {"id": "col-done", "title": "Done", "cardIds": ["card-6"]},
        ],
        "cards": {
            card_id: {"id": card_id, "title": title, "details": details}
            for card_id, (title, details) in cards.items()
        },
    })

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_column("boards", "name", "VARCHAR DEFAULT 'My Board'")
    _ensure_column("users", "password_hash", "VARCHAR DEFAULT ''")

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
            db.add(Board(user_id=user.id, name="My Board", data=_seed_board_data()))
            db.commit()
    finally:
        db.close()
