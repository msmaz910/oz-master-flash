import os
import openai
import json
from typing import Optional

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.client = None
        if self.api_key:
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://openrouter.ai/api/v1"
            )

    async def test_connection(self, prompt: str = "What is 2+2?") -> str:
        """Test the AI connection with a simple prompt."""
        if not self.client:
            raise Exception("OPENROUTER_API_KEY is not configured")
        try:
            response = self.client.chat.completions.create(
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
            # Build the system prompt
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

            # Build message history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history
            for msg in conversation_history:
                messages.append(msg)
            
            # Add current board state context
            board_context = f"\nCurrent board state:\n{json.dumps(board_state, indent=2)}"
            
            # Add the user's question
            messages.append({
                "role": "user",
                "content": user_question + board_context
            })

            # Call the AI
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b:free",
                messages=messages,
                max_tokens=2000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse the structured response
            try:
                # Try to extract JSON from the response
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    parsed = json.loads(json_str)
                else:
                    # If no JSON found, treat entire response as text
                    parsed = {"response": content}
                
                return parsed
            except json.JSONDecodeError:
                # If parsing fails, return the content as plain response
                return {"response": content}
                
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")

# Global instance
ai_service = AIService()