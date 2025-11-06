 ## KnowYourPath — Интерактивная система заметок с графовой визуализацией

 Стек: FastAPI, Postgres, Neo4j, Elasticsearch, React/TypeScript, Docker Compose.

 ### Быстрый старт

 1) Скопируйте `env.example` в `.env` (или используйте значения по умолчанию из кода).

 2) Запуск в Docker:

 ```bash
 docker compose up -d --build
 ```

 - API: `http://localhost:8000/docs`
 - Frontend (dev): `http://localhost:5173`
 - Neo4j Browser: `http://localhost:7474` (neo4j/neo4jpassword)
 - Elasticsearch: `http://localhost:9200`

 ### Основные возможности (MVP)

 - Создание/редактирование заметок (`POST /notes`, `PATCH /notes/{id}`), хранение в Postgres, индекс в Elasticsearch.
 - Поиск по узлам и заметкам (`/search/nodes`, `/search/notes`).
 - Узлы и связи графа в Neo4j (`/graph/nodes`, `/graph/links`, `/graph/neighbors/{id}`).
 - Простейший интерфейс: редактор заметок, поле графа, панель деталей узла.

 ### Локальная разработка (без Docker)

 - Backend:
   ```bash
   python -m venv .venv && . .venv/bin/activate  # Windows: .venv\\Scripts\\activate
   pip install -r backend/requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
   ```
 - Frontend:
   ```bash
   cd frontend
   npm i
   npm run dev
   ```

 Требуются работающие Postgres, Neo4j и Elasticsearch (см. `backend/app/core/config.py`).

 ### Структура

 - `backend/app` — FastAPI, SQLAlchemy модели, клиенты Neo4j/ES, роуты API
 - `frontend` — Vite + React/TS, страницы и UI-компоненты
 - `docker-compose.yml` — сервисы для быстрого запуска

 ### Перспективы (MVP+)

 - Подсветка ключевых слов, улучшенный NLP, аннотации связей, экспорт/импорт.
 - Рекомендации «что изучить дальше», интеграции (Wikipedia и т.д.).


