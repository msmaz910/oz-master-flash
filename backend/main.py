from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from models import get_db, init_db, User, Board
from ai_service import ai_service

app = FastAPI()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

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
async def update_board(board_data: dict, db: Session = Depends(get_db)):
    # For MVP, update board for default user "user"
    user = db.query(User).filter(User.username == "user").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    board = db.query(Board).filter(Board.user_id == user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    # Ensure board data is always stored as JSON string
    board_content = board_data["board"]
    if isinstance(board_content, dict):
        import json
        board.data = json.dumps(board_content)
    else:
        board.data = board_content
    db.commit()
    return {"message": "Board updated"}

# Mount static files at root if directory exists
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
else:
    @app.get("/")
    async def root():
        return HTMLResponse(content="""<!DOCTYPE html>
<html><body><h1>Hello World</h1></body></html>""")