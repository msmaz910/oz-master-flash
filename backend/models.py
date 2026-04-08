from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./kanban.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    boards = relationship("Board", back_populates="user")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="boards")
    conversations = relationship("Conversation", back_populates="board")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    messages = Column(Text, nullable=False)  # JSON array of {role: "user"|"assistant", content: string}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

            # Create default board
            default_data = '''{
  "columns": [
    {"id": "col-backlog", "title": "Backlog", "cardIds": []},
    {"id": "col-discovery", "title": "Discovery", "cardIds": []},
    {"id": "col-progress", "title": "In Progress", "cardIds": []},
    {"id": "col-review", "title": "Review", "cardIds": []},
    {"id": "col-done", "title": "Done", "cardIds": []}
  ],
  "cards": {}
}'''
            board = Board(user_id=user.id, data=default_data)
            db.add(board)
            db.commit()
    finally:
        db.close()