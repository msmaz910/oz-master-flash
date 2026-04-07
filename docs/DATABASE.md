# Database Schema Design

## Overview
The application uses SQLite as the database for simplicity and local deployment. The schema supports multiple users with one Kanban board per user, stored as JSON for flexibility.

## Tables

### users
Stores user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| username | TEXT | UNIQUE NOT NULL | User's login username |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |

### boards
Stores Kanban boards as JSON data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique board identifier |
| user_id | INTEGER | NOT NULL, FOREIGN KEY REFERENCES users(id) | Owner of the board |
| data | TEXT | NOT NULL | JSON representation of board data |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Board creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

## JSON Schema for Board Data
The `data` column stores a JSON object with this structure:

```json
{
  "columns": [
    {
      "id": "string",
      "title": "string",
      "cardIds": ["string", ...]
    }
  ],
  "cards": {
    "cardId": {
      "id": "string",
      "title": "string",
      "details": "string"
    }
  }
}
```

## Rationale
- **SQLite**: Chosen for simplicity, no server required, ACID compliance, suitable for local deployment
- **JSON storage**: Allows flexible board structure without complex relational schema for cards/columns
- **Single board per user**: MVP requirement, enforced by unique user_id in boards table
- **Timestamps**: Track creation and modification for potential future features

## Initial Data Migration
Create the default user and empty board:

```sql
INSERT INTO users (username) VALUES ('user');

INSERT INTO boards (user_id, data) VALUES (
  1,
  '{"columns": [
    {"id": "col-backlog", "title": "Backlog", "cardIds": []},
    {"id": "col-discovery", "title": "Discovery", "cardIds": []},
    {"id": "col-progress", "title": "In Progress", "cardIds": []},
    {"id": "col-review", "title": "Review", "cardIds": []},
    {"id": "col-done", "title": "Done", "cardIds": []}
  ], "cards": {}}'
);
```

## Future Considerations
- Add board name/title field
- Support multiple boards per user
- Add board sharing/collaboration features
- Implement board versioning/history