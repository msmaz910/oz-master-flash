import json
import os

import anthropic

MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = """You are a helpful kanban board assistant. When the user asks you to modify the board,
respond with a JSON object containing:
- "response": Your natural language response to the user
- "kanbanUpdate": Only include this if the user wants to modify the board. Include the complete updated board structure with all columns and cards.

The board structure is:
{
  "columns": [{"id": string, "title": string, "cardIds": [string]}],
  "cards": {cardId: {"id": string, "title": string, "details": string}}
}

Respond with ONLY the JSON object - no other text, no markdown code fences."""


class AIService:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None

    def _require_client(self) -> anthropic.AsyncAnthropic:
        if not self.client:
            raise Exception("ANTHROPIC_API_KEY is not configured")
        return self.client

    @staticmethod
    def _extract_text(response) -> str:
        for block in response.content:
            if block.type == "text":
                return block.text.strip()
        raise Exception("The model returned no text content. Please try again.")

    @staticmethod
    def _wrap_api_error(e: Exception) -> Exception:
        if isinstance(e, anthropic.AuthenticationError):
            return Exception("AI service error: invalid Anthropic API key")
        if isinstance(e, anthropic.RateLimitError):
            return Exception("AI service error: rate limited by Anthropic, please try again shortly")
        if isinstance(e, anthropic.APIStatusError):
            return Exception(f"AI service error: {e.message}")
        if isinstance(e, anthropic.APIConnectionError):
            return Exception("AI service error: could not reach Anthropic API")
        return Exception(f"AI service error: {str(e)}")

    async def test_connection(self, prompt: str = "What is 2+2?") -> str:
        """Test the AI connection with a simple prompt."""
        client = self._require_client()
        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}],
            )
            return self._extract_text(response)
        except Exception as e:
            raise self._wrap_api_error(e)

    async def chat_with_kanban(
        self,
        user_question: str,
        board_state: dict,
        conversation_history: list[dict]
    ) -> dict:
        """Chat with AI about the kanban board and get structured response.

        Args:
            user_question: The user's question/request
            board_state: Current board state (columns + cards)
            conversation_history: List of {role: "user"|"assistant", content: string}

        Returns:
            {
                "response": str,
                "kanbanUpdate": dict or None
            }
        """
        client = self._require_client()
        board_context = f"Current board state:\n{json.dumps(board_state)}"
        messages = [*conversation_history, {"role": "user", "content": user_question}]

        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=2000,
                system=f"{SYSTEM_PROMPT}\n\n{board_context}",
                messages=messages,
            )
            content = self._extract_text(response)
        except Exception as e:
            raise self._wrap_api_error(e)

        # A model that ignored the JSON instruction still gives a usable chat reply.
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"response": content}


# Global instance
ai_service = AIService()
