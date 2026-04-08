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
def test_validate_board_update():
    """Test board update validation."""
    from main import validate_board_update
    
    current = {
        "columns": [{"id": "col-1", "title": "Col", "cardIds": []}],
        "cards": {}
    }
    
    # Valid update - same structure
    valid_update = {
        "columns": [{"id": "col-1", "title": "Col", "cardIds": ["card-1"]}],
        "cards": {"card-1": {"id": "card-1", "title": "Test", "details": "Test"}}
    }
    is_valid, msg = validate_board_update(current, valid_update)
    assert is_valid, msg
    
    # Invalid - unknown column ID
    invalid_update = {
        "columns": [{"id": "col-unknown", "title": "Col", "cardIds": []}],
        "cards": {}
    }
    is_valid, msg = validate_board_update(current, invalid_update)
    assert not is_valid
    assert "Invalid column ID" in msg
    
    # Invalid - card referenced but not in cards
    invalid_update = {
        "columns": [{"id": "col-1", "title": "Col", "cardIds": ["card-missing"]}],
        "cards": {}
    }
    is_valid, msg = validate_board_update(current, invalid_update)
    assert not is_valid
    assert "not in cards" in msg
