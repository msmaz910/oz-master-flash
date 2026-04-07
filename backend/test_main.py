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

def test_get_board():
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert "board" in data
    # Should contain the default board structure
    import json
    board = json.loads(data["board"])
    assert "columns" in board
    assert "cards" in board
    assert len(board["columns"]) == 5

def test_update_board():
    # First get current board
    response = client.get("/api/board")
    current_data = response.json()

    # Modify it (add a card)
    import json
    board = json.loads(current_data["board"])
    board["cards"]["test-card"] = {"id": "test-card", "title": "Test", "details": "Test card"}
    board["columns"][0]["cardIds"].append("test-card")

    # Update
    update_response = client.put("/api/board", json={"board": board})
    assert update_response.status_code == 200
    assert update_response.json() == {"message": "Board updated"}

    # Verify
    get_response = client.get("/api/board")
    new_data = get_response.json()
    new_board = json.loads(new_data["board"])
    assert "test-card" in new_board["cards"]