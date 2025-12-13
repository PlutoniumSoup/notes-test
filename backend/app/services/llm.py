import json
import os
import requests
from google import genai
from typing import Dict, List, Optional
import logging
from ..core.config import get_settings
from .nlp import extract_keywords

logger = logging.getLogger(__name__)


def get_llm_client():
    """
    Универсальный клиент для LLM (Google / Timeweb / OpenAI / Custom).
    Возвращает объект с методом `.generate(prompt: str, model: str) -> str`.
    """
    settings = get_settings()

    # Настройки: поддержка кастомных эндпоинтов
    endpoint = getattr(settings, "custom_llm_endpoint", None)
    api_key = getattr(settings, "custom_llm_api_key", None)
    provider = getattr(settings, "llm_provider", "google")  # google | timeweb | openai | custom
    logger.info(f"=============== Используется {api_key}")
    logger.info(f"=============== Используется {endpoint}")

    if provider == "google":
        api_key = settings.google_genai_api_key or settings.gemini_api_key
        if not api_key:
            logger.warning("GOOGLE_GENAI_API_KEY or GEMINI_API_KEY not set")
            return None
        os.environ['GEMINI_API_KEY'] = api_key
        client = genai.Client(api_key=api_key)
        return GoogleLLMWrapper(client)

    elif provider in {"timeweb", "custom"} and endpoint and api_key:
        return HTTPBasedLLMWrapper(endpoint, api_key)

    else:
        logger.warning("No valid LLM configuration found")
        return None


class GoogleLLMWrapper:
    def __init__(self, client):
        self.client = client

    def generate(self, prompt: str, model: str = "gemini-2.5-flash") -> str:
        response = self.client.models.generate_content(model=model, contents=prompt)
        return response.text.strip()


class HTTPBasedLLMWrapper:
    """
    Универсальный HTTP LLM клиент для кастомных API вроде Timeweb Grok.
    Пример API: POST https://agent.timeweb.cloud/api/v1/cloud-ai/agents/<id>/v1
    """
    def __init__(self, endpoint: str, api_key: str):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key

    def generate(self, prompt: str, model: str = "grok-code-fast-1") -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }

        response = requests.post(self.endpoint, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()

        # Унификация ответа
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            or data.get("output", "")
            or data.get("response", "")
        )

        return text.strip()


def analyze_note_with_llm(content: str) -> Optional[Dict]:
    if not content or len(content.strip()) < 10:
        return None

    try:
        client = get_llm_client()
        if client:
            prompt = f"""You are a knowledge graph extraction expert. Extract ONLY the concepts and relationships EXPLICITLY mentioned in the text.

CRITICAL RULES:
1. Always respond in the SAME LANGUAGE as the input text (Russian → Russian, English → English)
2. Extract ONLY concepts that are DIRECTLY MENTIONED in the text
3. Create relationships ONLY between concepts that have EXPLICIT connections in the text
4. DO NOT create a central summary node
5. DO NOT describe the note itself
6. Build a chain/hierarchy of concepts as described in the text

Input text:
{content}

Return JSON with this EXACT structure:
{{
  "concepts": [
    {{
      "id": "concept_1",
      "label": "Concept Name",
      "description": "Brief 1-sentence description of this concept from the text",
      "knowledge_gaps": ["What is missing or unclear about this concept"],
      "recommendations": ["What should be studied next related to this concept"]
    }}
  ],
  "relationships": [
    {{
      "source": "concept_1",
      "target": "concept_2",
      "type": "consists_of|part_of|related_to|property_of",
      "description": "How they are connected"
    }}
  ],
  "tags": ["tag1", "tag2"],
  "main_topic": "One sentence about what the note discusses"
}}

IMPORTANT: 
- Identify the MAIN concept (the most central one) - it should have the most connections
- Other concepts should be linked hierarchically (level 1, level 2, etc.)
- knowledge_gaps: List what information is missing or unclear about each concept
- recommendations: Suggest what topics should be studied to fill the gaps

EXAMPLES of correct extraction:

Input: "Человек состоит из органов, органы из тканей, ткани из клеток"
Output:
{{
  "concepts": [
    {{"id": "concept_human", "label": "Человек", "description": "Биологический организм"}},
    {{"id": "concept_organs", "label": "Органы", "description": "Части тела человека"}},
    {{"id": "concept_tissues", "label": "Ткани", "description": "Структурные компоненты органов"}},
    {{"id": "concept_cells", "label": "Клетки", "description": "Основные единицы тканей"}}
  ],
  "relationships": [
    {{"source": "concept_human", "target": "concept_organs", "type": "consists_of", "description": "состоит из"}},
    {{"source": "concept_organs", "target": "concept_tissues", "type": "consists_of", "description": "состоят из"}},
    {{"source": "concept_tissues", "target": "concept_cells", "type": "consists_of", "description": "состоят из"}}
  ],
  "tags": ["биология", "анатомия"],
  "main_topic": "Иерархическая структура организма"
}}

Now extract from the actual input text above."""

            text = client.generate(prompt, model="grok-code-fast-1")

            # Убираем ```json и т.д.
            for prefix in ("```json", "```"):
                if text.startswith(prefix):
                    text = text[len(prefix):]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            result = json.loads(text)
            
            # Правильное имя модели
            settings = get_settings()
            provider = getattr(settings, "llm_provider", "google")
            if provider == "google":
                result["model_used"] = "Google Gemini"
            elif provider == "timeweb":
                result["model_used"] = "Timeweb Grok"
            elif provider == "custom":
                result["model_used"] = "Custom LLM"
            else:
                result["model_used"] = "Unknown"
                
            logger.info("LLM analysis successful")
            return result

    except Exception as e:
        logger.warning(f"LLM analysis failed: {e}, fallback to NLP")
        logger.exception(e)

    # fallback
    return _fallback_nlp_analysis(content)


def _fallback_nlp_analysis(content: str) -> Dict:
    keywords = extract_keywords(content, max_keywords=10)
    stop_words = {'для', 'в', 'на', 'но', 'что', 'это', 'и', 'проблема', 'использование', 'большинство', 'нужен', 'нужно', 'нужны', 'использования', 'проведения'}
    keywords = [k for k in keywords if k.lower() not in stop_words and len(k) > 3]
    summary = content[:100] + "..." if len(content) > 100 else content
    return {
        "main_topic": summary[:50],
        "main_concepts": keywords[:5],
        "concept_hierarchy": {},
        "concept_descriptions": {k: f"Концепция: {k}" for k in keywords},
        "keywords": keywords,
        "tags": ["общее"],
        "summary": summary,
        "knowledge_gaps": [],
        "model_used": "nlp-fallback",
        "reasoning": "LLM недоступен, использован простой NLP анализ"
    }
