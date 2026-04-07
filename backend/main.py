from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

app = FastAPI()

# API routes first
@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI backend!"}

# Mount static files at root if directory exists
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
else:
    @app.get("/")
    async def root():
        return HTMLResponse(content="""<!DOCTYPE html>
<html><body><h1>Hello World</h1></body></html>""")