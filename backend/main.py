from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
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

from models import get_db, init_db, User, Board, Conversation
from ai_service import ai_service

# Pydantic schemas
class BoardColumn(BaseModel):
    id: str
    title: str
    cardIds: list[str]

class BoardCard(BaseModel):
    id: str
    title: str
    details: str

class BoardData(BaseModel):
    columns: list[BoardColumn]
    cards: dict[str, BoardCard]

class BoardUpdateRequest(BaseModel):
    board: Any

class AIStructuredResponse(BaseModel):
    response: str
    kanbanUpdate: Optional[BoardData] = None

class ChatRequest(BaseModel):
    question: str

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

@app.get("/api/board")
async def get_board(db: Session = Depends(get_db)):
    # For MVP, return board for default user "user"
    user = db.query(User).filter(User.username == "user").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    board = db.query(Board).filter(Board.user_id == user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    return {"board": board.data}

@app.put("/api/board")
async def update_board(board_data: BoardUpdateRequest, db: Session = Depends(get_db)):
    # For MVP, update board for default user "user"
    user = db.query(User).filter(User.username == "user").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    board = db.query(Board).filter(Board.user_id == user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    board_content = board_data.board
    if isinstance(board_content, dict):
        board.data = json.dumps(board_content)
    else:
        board.data = board_content
    db.commit()
    return {"message": "Board updated"}

def validate_board_update(current_board: dict, updated_board: dict) -> tuple[bool, str]:
    """Validate that kanban update has all valid column IDs and structure.

    Returns: (is_valid, error_message)
    """
    try:
        # Check structure
        if "columns" not in updated_board or "cards" not in updated_board:
            return False, "Board must have 'columns' and 'cards' properties"

        # Get current column IDs
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
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with AI about the kanban board."""
    try:
        # Get user and board
        user = db.query(User).filter(User.username == "user").first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        board = db.query(Board).filter(Board.user_id == user.id).first()
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")

        # Parse current board state
        board_state = json.loads(board.data)

        # Get or create conversation
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

        # Parse conversation history and cap at 20 messages
        history = json.loads(conversation.messages)
        if len(history) > 20:
            history = history[-20:]

        # Call AI service
        ai_response = await ai_service.chat_with_kanban(
            request.question,
            board_state,
            history
        )

        # Process kanban update if present
        if "kanbanUpdate" in ai_response and ai_response["kanbanUpdate"]:
            is_valid, error_msg = validate_board_update(board_state, ai_response["kanbanUpdate"])
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid board update: {error_msg}")

            # Apply the update
            board.data = json.dumps(ai_response["kanbanUpdate"])
            db.commit()

        # Update conversation history (cap stored history at 20 messages)
        history.append({"role": "user", "content": request.question})
        history.append({"role": "assistant", "content": ai_response.get("response", "")})
        if len(history) > 20:
            history = history[-20:]
        conversation.messages = json.dumps(history)
        db.commit()

        return {
            "response": ai_response.get("response", ""),
            "boardUpdated": "kanbanUpdate" in ai_response and ai_response["kanbanUpdate"] is not None
        }
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
