"""
Защита от prompt injection атак
"""
import re
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

# Паттерны для обнаружения prompt injection атак
INJECTION_PATTERNS = [
    # Игнорирование инструкций
    r'(?i)(забудь|ignore|disregard|forget).*?(инструкц|instruction|rule|правил)',
    r'(?i)(игнорируй|ignore).*?(всё|all|everything|предыдущ|previous)',
    
    # Ролевые атаки
    r'(?i)(представь|pretend|imagine|act|play).*?(что|that|as|like)',
    r'(?i)(ты|you).*?(кто|who|что|what).*?(который|who|that).*?(игнорир|ignore)',
    r'(?i)(ты|you).*?(должен|must|should|need).*?(игнорир|ignore|забыть|forget)',
    
    # Переопределение системы
    r'(?i)(новый|new).*?(система|system|prompt|инструкц|instruction)',
    r'(?i)(измени|change|modify).*?(роль|role|поведение|behavior)',
    
    # Прямые команды
    r'(?i)(выполни|execute|run|do).*?(команда|command|код|code)',
    r'(?i)(покажи|show|reveal|display).*?(промпт|prompt|инструкц|instruction|систем|system)',
    
    # Обход безопасности
    r'(?i)(обойди|bypass|circumvent|обход).*?(безопасн|security|защит|protection)',
    r'(?i)(не|don\'t|do not).*?(проверяй|check|валидир|validate)',
    
    # Контекстные атаки
    r'(?i)(в контексте|in context|в рамках|within).*?(prompt injection|инъекц)',
    r'(?i)(это.*?пример|this.*?example).*?(prompt injection|инъекц)',
]

# Слова-триггеры для дополнительной проверки
SUSPICIOUS_WORDS = [
    'забудь', 'ignore', 'disregard', 'forget',
    'представь', 'pretend', 'imagine', 'act',
    'новый промпт', 'new prompt', 'system prompt',
    'игнорируй правила', 'ignore rules',
    'выполни команду', 'execute command',
    'обойди защиту', 'bypass security',
]

# Безопасные контексты (где эти слова допустимы)
SAFE_CONTEXTS = [
    r'(?i)(изуч|learn|изучен|study).*?(prompt injection|инъекц)',
    r'(?i)(защит|protect|security).*?(от|from|against).*?(prompt injection|инъекц)',
    r'(?i)(пример|example).*?(prompt injection|инъекц).*?(атак|attack)',
]


def detect_injection_attempt(text: str) -> Tuple[bool, List[str]]:
    """
    Обнаруживает попытки prompt injection
    
    Returns:
        Tuple[is_injection, detected_patterns]
    """
    if not text or len(text.strip()) < 10:
        return False, []
    
    detected_patterns = []
    text_lower = text.lower()
    
    # Проверяем безопасные контексты
    is_safe_context = any(re.search(pattern, text) for pattern in SAFE_CONTEXTS)
    
    # Проверяем паттерны инъекций
    for pattern in INJECTION_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Если это безопасный контекст, пропускаем
            if is_safe_context:
                continue
            
            detected_patterns.append(match.group(0))
            logger.warning(f"Potential injection pattern detected: {match.group(0)}")
    
    # Дополнительная проверка на подозрительные слова в начале текста
    first_sentence = text[:200].lower()
    for word in SUSPICIOUS_WORDS:
        if word in first_sentence and not is_safe_context:
            # Проверяем, не является ли это частью нормального текста
            word_pattern = rf'\b{re.escape(word)}\b'
            if re.search(word_pattern, first_sentence):
                # Проверяем контекст вокруг слова
                context_start = max(0, first_sentence.find(word) - 50)
                context_end = min(len(first_sentence), first_sentence.find(word) + len(word) + 50)
                context = first_sentence[context_start:context_end]
                
                # Если это не безопасный контекст, считаем подозрительным
                if not any(re.search(safe_pattern, context) for safe_pattern in SAFE_CONTEXTS):
                    detected_patterns.append(f"suspicious_word: {word}")
                    logger.warning(f"Suspicious word detected: {word}")
    
    is_injection = len(detected_patterns) > 0
    return is_injection, detected_patterns


def sanitize_content(text: str) -> str:
    """
    Очищает контент от потенциально опасных инструкций
    """
    if not text:
        return text
    
    is_injection, patterns = detect_injection_attempt(text)
    
    if is_injection:
        logger.warning(f"Prompt injection detected. Patterns: {patterns}")
        # Удаляем обнаруженные паттерны
        sanitized = text
        for pattern in INJECTION_PATTERNS:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # Удаляем подозрительные слова в начале
        lines = sanitized.split('\n')
        cleaned_lines = []
        for line in lines[:5]:  # Проверяем первые 5 строк
            line_lower = line.lower()
            is_suspicious = any(
                word in line_lower and 
                not any(re.search(safe_pattern, line) for safe_pattern in SAFE_CONTEXTS)
                for word in SUSPICIOUS_WORDS
            )
            if not is_suspicious:
                cleaned_lines.append(line)
        cleaned_lines.extend(lines[5:])
        
        sanitized = '\n'.join(cleaned_lines)
        
        # Удаляем множественные пробелы и пустые строки
        sanitized = re.sub(r'\n\s*\n\s*\n', '\n\n', sanitized)
        sanitized = re.sub(r' {2,}', ' ', sanitized)
        
        logger.info(f"Content sanitized. Original length: {len(text)}, Sanitized length: {len(sanitized)}")
        return sanitized.strip()
    
    return text

