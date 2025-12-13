"""
Сервис для сопоставления и нормализации узлов графа знаний
"""
import re
import unicodedata
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher
import logging

logger = logging.getLogger(__name__)


def normalize_label(label: str) -> str:
    """
    Нормализует название узла для сопоставления:
    - Приводит к нижнему регистру
    - Удаляет лишние пробелы
    - Нормализует дефисы и тире
    - Удаляет специальные символы
    - Удаляет множественные дефисы
    """
    if not label:
        return ""
    
    # Нормализация Unicode (например, разные типы дефисов)
    label = unicodedata.normalize('NFKC', label)
    
    # Приводим к нижнему регистру
    label = label.lower().strip()
    
    # Заменяем различные типы дефисов и тире на обычный дефис
    label = re.sub(r'[‐‑‒–—―−]', '-', label)
    
    # Удаляем множественные пробелы
    label = re.sub(r'\s+', ' ', label)
    
    # Удаляем пробелы вокруг дефисов
    label = re.sub(r'\s*-\s*', '-', label)
    
    # Удаляем множественные дефисы
    label = re.sub(r'-+', '-', label)
    
    # Удаляем дефисы в начале и конце
    label = label.strip('-')
    
    return label.strip()


def normalize_for_id(label: str) -> str:
    """
    Нормализует название для генерации стабильного ID
    """
    normalized = normalize_label(label)
    # Удаляем все не-буквенно-цифровые символы кроме дефисов
    normalized = re.sub(r'[^\w\s-]', '', normalized)
    # Заменяем пробелы на дефисы
    normalized = re.sub(r'\s+', '-', normalized)
    return normalized


def calculate_similarity(str1: str, str2: str) -> float:
    """
    Вычисляет схожесть двух строк (0.0 - 1.0)
    """
    norm1 = normalize_label(str1)
    norm2 = normalize_label(str2)
    
    if norm1 == norm2:
        return 1.0
    
    # Используем SequenceMatcher для вычисления схожести
    similarity = SequenceMatcher(None, norm1, norm2).ratio()
    
    # Дополнительная проверка: если одна строка содержит другую
    if norm1 in norm2 or norm2 in norm1:
        similarity = max(similarity, 0.85)
    
    return similarity


def find_matching_node(
    label: str,
    existing_nodes: List[Dict],
    threshold: float = 0.75
) -> Optional[Tuple[str, float]]:
    """
    Находит существующий узел, похожий на заданный label
    
    Returns:
        Tuple[node_id, similarity] или None
    """
    normalized_label = normalize_label(label)
    
    best_match = None
    best_similarity = 0.0
    best_node_label = ""
    
    for node in existing_nodes:
        node_label = node.get("label", "")
        similarity = calculate_similarity(label, node_label)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = (node.get("id"), similarity)
            best_node_label = node_label
    
    if best_match and best_match[1] >= threshold:
        logger.info(f"Found matching node: '{label}' -> '{best_node_label}' (similarity: {best_match[1]:.2f})")
        return best_match
    
    if best_match:
        logger.debug(f"No match found for '{label}'. Best similarity: {best_match[1]:.2f} with '{best_node_label}' (threshold: {threshold})")
    
    return None


def merge_node_data(existing: Dict, new: Dict) -> Dict:
    """
    Объединяет данные существующего и нового узла
    """
    merged = existing.copy()
    
    # Объединяем summary (если новый не пустой, дополняем существующий)
    existing_summary = existing.get("summary", "") or ""
    new_summary = new.get("summary", "") or ""
    if new_summary and new_summary not in existing_summary:
        if existing_summary:
            # Добавляем новый summary только если он содержит новую информацию
            merged["summary"] = f"{existing_summary}\n\n{new_summary}"
        else:
            merged["summary"] = new_summary
    elif not existing_summary and new_summary:
        merged["summary"] = new_summary
    
    # Объединяем knowledge_gaps
    existing_gaps = set(existing.get("knowledge_gaps", []) or [])
    new_gaps = set(new.get("knowledge_gaps", []) or [])
    merged["knowledge_gaps"] = list(existing_gaps | new_gaps)
    
    # Объединяем recommendations
    existing_recs = set(existing.get("recommendations", []) or [])
    new_recs = set(new.get("recommendations", []) or [])
    merged["recommendations"] = list(existing_recs | new_recs)
    
    # Объединяем tags
    existing_tags = set(existing.get("tags", []) or [])
    new_tags = set(new.get("tags", []) or [])
    merged["tags"] = list(existing_tags | new_tags)
    
    # Обновляем has_gap
    merged["has_gap"] = len(merged["knowledge_gaps"]) > 0 or len(merged["recommendations"]) > 0
    
    return merged

