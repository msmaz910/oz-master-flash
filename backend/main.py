from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os
from models import get_db, init_db, User, Board

app = FastAPI()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# API routes first
@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI backend!"}

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

    board.data = board_data["board"]
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