import os
import openai
import json
from typing import Optional

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.client = None
        if self.api_key:
            self.client = openai.AsyncOpenAI(
                api_key=self.api_key,
                base_url="https://openrouter.ai/api/v1"
            )

    async def test_connection(self, prompt: str = "What is 2+2?") -> str:
        """Test the AI connection with a simple prompt."""
        if not self.client:
            raise Exception("OPENROUTER_API_KEY is not configured")
        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-oss-120b:free",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.1
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")

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
        if not self.client:
            raise Exception("OPENROUTER_API_KEY is not configured")
        try:
            system_prompt = """You are a helpful kanban board assistant. When the user asks you to modify the board,
respond with a JSON object containing:
- "response": Your natural language response to the user
- "kanbanUpdate": Only include this if the user wants to modify the board. Include the complete updated board structure with all columns and cards.

The board structure is:
{
  "columns": [{"id": string, "title": string, "cardIds": [string]}],
  "cards": {cardId: {"id": string, "title": string, "details": string}}
}

Always respond with valid JSON. Only modify the board if the user explicitly asks for changes."""

            board_context = f"Current board state:\n{json.dumps(board_state)}"

            messages = [
                {"role": "system", "content": f"{system_prompt}\n\n{board_context}"}
            ]

            for msg in conversation_history:
                messages.append(msg)

            messages.append({"role": "user", "content": user_question})

            response = await self.client.chat.completions.create(
                model="openai/gpt-oss-120b:free",
                messages=messages,
                max_tokens=2000,
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content.strip()

            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"response": content}

        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")

# Global instance
ai_service = AIService()
