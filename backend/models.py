import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kanban.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    boards = relationship("Board", back_populates="user")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="boards")
    conversations = relationship("Conversation", back_populates="board")

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Create default user if not exists
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "user").first()
        if not user:
            user = User(username="user")
            db.add(user)
            db.commit()
            db.refresh(user)

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
            board = Board(user_id=user.id, data=default_data)
            db.add(board)
            db.commit()
    finally:
        db.close()
