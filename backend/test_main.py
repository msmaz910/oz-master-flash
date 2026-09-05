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

def _first_board_id():
    boards = client.get("/api/boards").json()
    return boards[0]["id"]

def test_list_boards():
    response = client.get("/api/boards")
    assert response.status_code == 200
    boards = response.json()
    assert len(boards) >= 1
    assert "id" in boards[0]
    assert "name" in boards[0]

def test_get_board():
    board_id = _first_board_id()
    response = client.get(f"/api/boards/{board_id}")
    assert response.status_code == 200
    data = response.json()
    assert "board" in data
    assert "name" in data
    # Should contain the default board structure
    import json
    board = json.loads(data["board"])
    assert "columns" in board
    assert "cards" in board
    assert len(board["columns"]) == 5

def test_get_board_not_found():
    response = client.get("/api/boards/999999")
    assert response.status_code == 404

def test_update_board():
    board_id = _first_board_id()

    # First get current board
    response = client.get(f"/api/boards/{board_id}")
    current_data = response.json()

    # Modify it (add a card)
    import json
    board = json.loads(current_data["board"])
    board["cards"]["test-card"] = {"id": "test-card", "title": "Test", "details": "Test card"}
    board["columns"][0]["cardIds"].append("test-card")

    # Update
    update_response = client.put(f"/api/boards/{board_id}", json={"board": board})
    assert update_response.status_code == 200
    assert update_response.json()["message"] == "Board updated"

    # Verify
    get_response = client.get(f"/api/boards/{board_id}")
    new_data = get_response.json()
    new_board = json.loads(new_data["board"])
    assert "test-card" in new_board["cards"]

def test_create_list_rename_delete_board():
    # Create a second board
    create_response = client.post("/api/boards", json={"name": "Marketing"})
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Marketing"
    new_board_id = created["id"]

    import json
    empty_board = json.loads(created["board"])
    assert empty_board["cards"] == {}
    assert len(empty_board["columns"]) == 5

    # It shows up in the list
    boards = client.get("/api/boards").json()
    assert any(b["id"] == new_board_id for b in boards)

    # Rename it
    rename_response = client.put(f"/api/boards/{new_board_id}", json={"name": "Renamed"})
    assert rename_response.status_code == 200
    assert rename_response.json()["name"] == "Renamed"

    # Delete it
    delete_response = client.delete(f"/api/boards/{new_board_id}")
    assert delete_response.status_code == 200

    boards_after = client.get("/api/boards").json()
    assert not any(b["id"] == new_board_id for b in boards_after)

def test_cannot_delete_only_board():
    boards = client.get("/api/boards").json()
    assert len(boards) == 1
    response = client.delete(f"/api/boards/{boards[0]['id']}")
    assert response.status_code == 400
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

    # Invalid - same card appears in multiple columns
    current_multi = {
        "columns": [
            {"id": "col-1", "title": "Col 1", "cardIds": []},
            {"id": "col-2", "title": "Col 2", "cardIds": []},
        ],
        "cards": {"card-1": {"id": "card-1", "title": "Test", "details": "Test"}},
    }
    invalid_update = {
        "columns": [
            {"id": "col-1", "title": "Col 1", "cardIds": ["card-1"]},
            {"id": "col-2", "title": "Col 2", "cardIds": ["card-1"]},
        ],
        "cards": {"card-1": {"id": "card-1", "title": "Test", "details": "Test"}},
    }
    is_valid, msg = validate_board_update(current_multi, invalid_update)
    assert not is_valid
    assert "multiple columns" in msg

    # Invalid - AI omits a column (silent deletion must be rejected)
    silent_delete_update = {
        "columns": [],  # All columns removed
        "cards": {}
    }
    is_valid, msg = validate_board_update(current, silent_delete_update)
    assert not is_valid
    assert "would remove columns" in msg
