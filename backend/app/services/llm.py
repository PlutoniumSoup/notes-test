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
            prompt = f"""Ты — эксперт по анализу текстов и построению графов знаний. Проанализируй заметку и верни JSON.
Заметка:
{content}

Формат ответа:
{{
  "main_topic": "",
  "main_concepts": [],
  "concept_hierarchy": {{}},
  "concept_descriptions": {{}},
  "tags": [],
  "summary": "",
  "knowledge_gaps": [],
  "reasoning": ""
}}"""

            text = client.generate(prompt, model="grok-code-fast-1")

            # Убираем ```json и т.д.
            for prefix in ("```json", "```"):
                if text.startswith(prefix):
                    text = text[len(prefix):]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            result = json.loads(text)
            result["model_used"] = getattr(client, "__class__", type(client)).__name__
            logger.info("LLM analysis successful via custom endpoint")
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
