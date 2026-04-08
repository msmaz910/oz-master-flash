import os
import openai
from typing import Optional

class AIService:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")

        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )

    async def test_connection(self, prompt: str = "What is 2+2?") -> str:
        """Test the AI connection with a simple prompt."""
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

# Global instance
ai_service = AIService()