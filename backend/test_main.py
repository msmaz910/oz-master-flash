from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    # When static exists, should have Kanban Studio; else Hello World
    assert "Hello World" in response.text or "Kanban Studio" in response.text
    assert "<!DOCTYPE html>" in response.text

def test_api_hello():
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI backend!"}