from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
import os
import json
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from models import get_db, init_db, empty_board_data, User, Board, Conversation, UserSession
from security import hash_password, verify_password, generate_token
from ai_service import ai_service

# Conversation history sent to (and stored for) the AI, newest last.
MAX_HISTORY_MESSAGES = 20

# Pydantic schemas
class BoardUpdateRequest(BaseModel):
    board: Optional[Any] = None
    name: Optional[str] = None

class BoardCreateRequest(BaseModel):
    name: Optional[str] = None

class ChatRequest(BaseModel):
    question: str
    boardId: int

class CredentialsRequest(BaseModel):
    username: str
    password: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

# API routes first
@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI backend!"}

@app.post("/api/ai/test")
async def test_ai(prompt: str = "What is 2+2?"):
    """Test AI connectivity with a simple prompt."""
    try:
        response = await ai_service.test_connection(prompt)
        return {"response": response, "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the token from an `Authorization: Bearer <token>` header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()

def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
) -> User:
    token = bearer_token(authorization)
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session.user

def get_owned_board(db: Session, user: User, board_id: int) -> Board:
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@app.post("/api/auth/register", status_code=201)
async def register(request: CredentialsRequest, db: Session = Depends(get_db)):
    username = request.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already taken")

    user = User(username=username, password_hash=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    board = Board(user_id=user.id, name="My Board", data=empty_board_data())
    db.add(board)

    token = generate_token()
    db.add(UserSession(token=token, user_id=user.id))
    db.commit()

    return {"token": token, "username": user.username}

@app.post("/api/auth/login")
async def login(request: CredentialsRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username.strip()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = generate_token()
    db.add(UserSession(token=token, user_id=user.id))
    db.commit()
    return {"token": token, "username": user.username}

@app.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    token = bearer_token(authorization)
    if token is not None:
        db.query(UserSession).filter(UserSession.token == token).delete()
        db.commit()
    return {"message": "Logged out"}

@app.get("/api/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"username": user.username}

@app.get("/api/boards")
async def list_boards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    boards = db.query(Board).filter(Board.user_id == user.id).order_by(Board.created_at).all()
    return [{"id": board.id, "name": board.name} for board in boards]

@app.post("/api/boards", status_code=201)
async def create_board(
    request: BoardCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = (request.name or "").strip() or "Untitled Board"
    board = Board(user_id=user.id, name=name, data=empty_board_data())
    db.add(board)
    db.commit()
    db.refresh(board)
    return {"id": board.id, "name": board.name, "board": board.data}

@app.get("/api/boards/{board_id}")
async def get_board(
    board_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    board = get_owned_board(db, user, board_id)
    return {"id": board.id, "name": board.name, "board": board.data}

@app.put("/api/boards/{board_id}")
async def update_board(
    board_id: int,
    request: BoardUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = get_owned_board(db, user, board_id)

    if request.board is not None:
        # The endpoint accepts either a JSON string or an already-decoded object.
        board.data = json.dumps(request.board) if isinstance(request.board, dict) else request.board

    if request.name is not None:
        stripped_name = request.name.strip()
        if not stripped_name:
            raise HTTPException(status_code=400, detail="Board name cannot be empty")
        board.name = stripped_name

    db.commit()
    return {"id": board.id, "name": board.name, "message": "Board updated"}

@app.delete("/api/boards/{board_id}")
async def delete_board(
    board_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    board = get_owned_board(db, user, board_id)

    remaining_boards = db.query(Board).filter(Board.user_id == user.id).count()
    if remaining_boards <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete your only board")

    db.delete(board)
    db.commit()
    return {"message": "Board deleted"}

def validate_board_update(current_board: dict, updated_board: dict) -> tuple[bool, str]:
    """Validate that kanban update has all valid column IDs and structure.

    Returns: (is_valid, error_message)
    """
    try:
        if "columns" not in updated_board or "cards" not in updated_board:
            return False, "Board must have 'columns' and 'cards' properties"

        current_col_ids = {col["id"] for col in current_board["columns"]}

        # Check no unknown column IDs (AI can't invent new columns)
        for col in updated_board["columns"]:
            if col["id"] not in current_col_ids:
                return False, f"Invalid column ID: {col['id']}"

        # Check no columns are silently deleted
        updated_col_ids = {col["id"] for col in updated_board["columns"]}
        missing_cols = current_col_ids - updated_col_ids
        if missing_cols:
            return False, f"Board update would remove columns: {missing_cols}"

        # Check all card references in cardIds exist in cards
        all_card_ids = set(updated_board["cards"].keys())
        seen_card_ids = set()
        for col in updated_board["columns"]:
            for card_id in col.get("cardIds", []):
                if card_id not in all_card_ids:
                    return False, f"Card ID {card_id} referenced in column but not in cards"
                if card_id in seen_card_ids:
                    return False, f"Card ID {card_id} appears in multiple columns"
                seen_card_ids.add(card_id)

        return True, ""
    except Exception as e:
        return False, f"Validation error: {str(e)}"

@app.post("/api/ai/chat")
async def chat_with_ai(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chat with AI about the kanban board."""
    try:
        board = get_owned_board(db, user, request.boardId)
        board_state = json.loads(board.data)

        conversation = db.query(Conversation).filter(
            Conversation.user_id == user.id,
            Conversation.board_id == board.id
        ).first()

        if not conversation:
            conversation = Conversation(
                user_id=user.id,
                board_id=board.id,
                messages=json.dumps([])
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        history = json.loads(conversation.messages)[-MAX_HISTORY_MESSAGES:]

        ai_response = await ai_service.chat_with_kanban(
            request.question,
            board_state,
            history
        )
        answer = ai_response.get("response", "")
        kanban_update = ai_response.get("kanbanUpdate")

        if kanban_update:
            is_valid, error_msg = validate_board_update(board_state, kanban_update)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid board update: {error_msg}")
            board.data = json.dumps(kanban_update)
            db.commit()

        history.append({"role": "user", "content": request.question})
        history.append({"role": "assistant", "content": answer})
        conversation.messages = json.dumps(history[-MAX_HISTORY_MESSAGES:])
        db.commit()

        return {"response": answer, "boardUpdated": kanban_update is not None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
else:
    @app.get("/")
    async def root():
        return HTMLResponse(content="""<!DOCTYPE html>
<html><body><h1>Hello World</h1></body></html>""")
