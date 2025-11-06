import json
import os
from google import genai
from typing import Dict, List, Optional
import logging
from ..core.config import get_settings
from .nlp import extract_keywords

logger = logging.getLogger(__name__)


def get_genai_client():
    """Инициализация клиента Google GenAI"""
    settings = get_settings()
    # Проверяем оба варианта имени переменной
    api_key = settings.google_genai_api_key or settings.gemini_api_key
    if not api_key or api_key == "":
        logger.warning("GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is not set")
        return None
    try:
        # Устанавливаем переменную окружения для нового API
        os.environ['GEMINI_API_KEY'] = api_key
        # Создаем клиент - он автоматически использует GEMINI_API_KEY из окружения
        client = genai.Client(api_key=api_key)
        logger.info(f"GenAI client initialized successfully with API key: {api_key[:10]}...")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize GenAI client: {e}")
        logger.exception(e)
        return None


def analyze_note_with_llm(content: str) -> Optional[Dict]:
    """
    Анализирует заметку с помощью LLM и извлекает:
    - Ключевые понятия/темы
    - Теги
    - Пробелы в знаниях
    
    Если LLM недоступен, использует простой NLP анализ
    
    Возвращает Dict с полями:
    - keywords: список ключевых слов
    - tags: список тегов
    - summary: резюме
    - knowledge_gaps: пробелы в знаниях
    - model_used: какая модель использовалась
    - reasoning: рассуждения модели (если доступны)
    """
    if not content or len(content.strip()) < 10:
        return None

    # Пробуем использовать LLM
    try:
        client = get_genai_client()
        if client:
            prompt = f"""Ты - эксперт по анализу текстов и построению графов знаний. Проанализируй следующую заметку и создай иерархическую структуру знаний.

ВАЖНО:
- Извлекай ТОЛЬКО существительные и ключевые термины, которые представляют реальные концепции, предметы, вещества, процессы
- НЕ включай служебные слова (для, в, на, но, что, это, и т.д.)
- НЕ включай общие слова (проблема, использование, большинство, нужен и т.д.)
- Фокусируйся на конкретных сущностях: вещества, методы, объекты, процессы

Заметка:
{content}

Верни ответ в формате JSON со следующими полями:
- "main_topic": главная тема заметки (одна фраза, например "анестезия лабораторных мышей")
- "main_concepts": список основных концепций первого уровня (3-5 ключевых понятий, которые напрямую связаны с главной темой)
- "concept_hierarchy": объект, где ключ - это концепция из main_concepts, а значение - список связанных концепций второго уровня (например, {{"кетамин": ["NMDA-антагонист", "бронхоспазм", "диссоциативное вещество"]}})
- "concept_descriptions": объект с описаниями каждой концепции ({{"кетамин": "NMDA-антагонист, применяемый для наркоза в медицине и ветеринарии", ...}})
- "tags": список тегов для категоризации (ОБЯЗАТЕЛЬНО минимум 3-5 тегов, например: ["медицина", "ветеринария", "фармакология", "лабораторные животные"])
- "summary": краткое резюме (1-2 предложения)
- "knowledge_gaps": список тем, которые упоминаются, но недостаточно раскрыты (если есть)
- "reasoning": краткое объяснение твоего анализа (1-2 предложения)

Пример для заметки о кетамине:
{{
  "main_topic": "анестезия лабораторных мышей",
  "main_concepts": ["кетамин", "ксилазин", "анестезия"],
  "concept_hierarchy": {{
    "кетамин": ["NMDA-антагонист", "бронхоспазм", "диссоциативное вещество"],
    "анестезия": ["наркоз", "обезболивание"]
  }},
  "concept_descriptions": {{
    "кетамин": "NMDA-антагонист, применяемый для наркоза в медицине и ветеринарии",
    "анестезия": "метод обезболивания при медицинских процедурах"
  }},
  "tags": ["медицина", "ветеринария", "фармакология", "лабораторные животные"]
}}

Ответ должен быть только валидным JSON, без дополнительного текста."""

            # Используем новый API
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            text = response.text.strip()

            # Убираем markdown code blocks если есть
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            result = json.loads(text)
            result["model_used"] = "gemini-2.5-flash"
            logger.info("LLM analysis successful")
            return result
    except Exception as e:
        logger.warning(f"LLM analysis failed: {e}, falling back to NLP")
        logger.exception(e)  # Логируем полный traceback для отладки

    # Fallback на простой NLP анализ
    try:
        keywords = extract_keywords(content, max_keywords=10)
        # Фильтруем служебные слова
        stop_words = {'для', 'в', 'на', 'но', 'что', 'это', 'и', 'проблема', 'использование', 'большинство', 'нужен', 'нужно', 'нужны', 'использования', 'проведения'}
        keywords = [k for k in keywords if k.lower() not in stop_words and len(k) > 3]
        
        # Простая категоризация на основе ключевых слов
        tags = []
        content_lower = content.lower()
        if any(k in content_lower for k in ['анестезия', 'кетамин', 'ксилазин', 'лекарство', 'препарат', 'медицин']):
            tags.append('медицина')
        if any(k in content_lower for k in ['мышь', 'мыши', 'животное', 'лаборатория', 'лабораторн']):
            tags.append('лабораторные_животные')
        if any(k in content_lower for k in ['химия', 'вещество', 'соединение', 'химическ']):
            tags.append('химия')
        if any(k in content_lower for k in ['биология', 'биологическ']):
            tags.append('биология')
        if any(k in content_lower for k in ['регулирование', 'регулируются', 'страны', 'закон']):
            tags.append('регулирование')
        
        summary = content[:100] + "..." if len(content) > 100 else content
        
        # Создаем простую иерархию для fallback
        main_topic = summary[:50] if summary else "Заметка"
        main_concepts = keywords[:5] if keywords else []
        concept_hierarchy = {}
        concept_descriptions = {k: f"Концепция: {k}" for k in keywords}
        
        return {
            "main_topic": main_topic,
            "main_concepts": main_concepts,
            "concept_hierarchy": concept_hierarchy,
            "concept_descriptions": concept_descriptions,
            "keywords": keywords,
            "tags": tags if tags else ["общее"],
            "summary": summary,
            "knowledge_gaps": [],
            "model_used": "nlp-fallback",
            "reasoning": "Использован простой NLP анализ (LLM недоступен)"
        }
    except Exception as e:
        logger.error(f"Fallback NLP analysis failed: {e}")
        return None


def extract_keywords_with_llm(content: str) -> List[str]:
    """Извлекает ключевые слова из заметки с помощью LLM"""
    analysis = analyze_note_with_llm(content)
    if analysis and "keywords" in analysis:
        return analysis["keywords"]
    return []


def detect_knowledge_gaps(content: str) -> List[str]:
    """Определяет пробелы в знаниях на основе анализа заметки"""
    analysis = analyze_note_with_llm(content)
    if analysis and "knowledge_gaps" in analysis:
        return analysis["knowledge_gaps"]
    return []
