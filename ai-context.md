# AI Agent Context: KnowYourPath

This document provides context for AI assistants working on the KnowYourPath project.

---

## Quick Overview

**KnowYourPath** is a note-taking app with AI-powered knowledge graph visualization.
- **Backend**: FastAPI + PostgreSQL + Neo4j + Elasticsearch
- **Frontend**: React + TypeScript + Vite
- **Deployment**: Docker Compose

---

## Project Structure

```
notes-test/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Configuration
│   │   ├── db/           # Database clients
│   │   ├── models/       # Pydantic schemas
│   │   └── services/     # Business logic (LLM, NLP, etc.)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── ui/           # Reusable UI components
│   │   ├── shared/       # Utilities (API client, etc.)
│   │   ├── contexts/     # React contexts (Auth, Theme, etc.)
│   │   ├── index.css     # Global styles
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env                  # Environment variables
└── README.md
```

---

## Key Technologies

### Backend
- **FastAPI**: Modern async Python web framework
- **SQLAlchemy**: ORM for PostgreSQL
- **py2neo / neo4j driver**: Neo4j client
- **elasticsearch-py**: Elasticsearch client
- **python-jose**: JWT handling
- **passlib**: Password hashing

### Frontend
- **React 18**: Component library
- **TypeScript**: Type safety
- **Vite**: Fast build tool
- **react-force-graph-2d**: Graph visualization
- **Axios**: HTTP client

---

## Key Files

### Backend
- `backend/app/main.py`: FastAPI app entry point
- `backend/app/core/config.py`: Configuration settings
- `backend/app/db/postgres.py`: PostgreSQL connection
- `backend/app/db/neo4j.py`: Neo4j connection
- `backend/app/db/elastic.py`: Elasticsearch connection
- `backend/app/services/llm.py`: LLM integration
- `backend/app/api/*.py`: API route handlers

### Frontend
- `frontend/src/main.tsx`: React entry point
- `frontend/src/pages/App.tsx`: Main application
- `frontend/src/index.css`: Global styles with design tokens
- `frontend/src/shared/api.ts`: API client functions

### Configuration
- `.env`: Environment variables (API keys, DB credentials)
- `docker-compose.yml`: Service orchestration
- `frontend/package.json`: Frontend dependencies
- `backend/requirements.txt`: Backend dependencies

---

## Common Tasks

### Starting the Application
```bash
docker compose up -d --build
```

### Backend Development (without Docker)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

### Frontend Development (without Docker)
```bash
cd frontend
npm install
npm run dev
```

### Running Migrations
Currently manual SQL/Cypher scripts. Alembic integration planned.

### Testing
No automated tests yet. Manual testing via Swagger UI (`/docs`) and frontend.

---

## Coding Conventions

### Backend (Python)
- **Style**: PEP 8
- **Type hints**: Required for function signatures
- **Async**: Use `async`/`await` for all route handlers
- **Error handling**: Raise `HTTPException` with proper status codes
- **Logging**: Use Python's `logging` module

Example:
```python
@router.post("/notes", response_model=NoteResponse)
async def create_note(
    note: NoteCreate,
    current_user: User = Depends(get_current_user)
) -> NoteResponse:
    # Implementation
    pass
```

### Frontend (TypeScript + React)
- **Style**: Functional components, hooks
- **Type safety**: Explicit types for all props and state
- **File naming**: PascalCase for components, camelCase for utilities
- **Imports**: Absolute imports preferred

Example:
```typescript
interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  // Implementation
};
```

### CSS
- **Methodology**: CSS custom properties for theming
- **Naming**: BEM-like for component-specific styles
- **Responsive**: Mobile-first approach
- **Animations**: Use CSS transitions/animations, not JS when possible

---

## Design System Reference

See `design-system.md` for:
- Color palette (light/dark themes)
- Typography scale
- Spacing system
- Component patterns
- Animation guidelines
- **Glassmorphism effects**: Current UX redesign focus

Key principles:
- Use CSS variables for all colors/spacing
- Support theme switching at runtime
- **Dark theme by default** for premium feel
- Smooth transitions (250ms default)
- Accessible contrast ratios
- **Glassmorphism**: backdrop-filter blur effects for cards/panels

---

## API Patterns

### Authentication
All protected routes require JWT token:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Error Handling
Backend returns consistent error format:
```json
{
  "detail": "Error message"
}
```

Frontend displays errors via `alert()` (to be replaced with toast notifications).

### Data Fetching
Use `async`/`await` with try/catch:
```typescript
try {
  const data = await apiCall();
  // Handle success
} catch (error: any) {
  console.error(error);
  alert(error.response?.data?.detail || error.message);
}
```

---

## Database Access Patterns

### PostgreSQL (Structured Data)
- Users, Notes
- Use SQLAlchemy ORM
- Filter by `user_id` for data isolation

### Neo4j (Graph Data)
- Knowledge nodes, relationships
- Use Cypher queries
- Always filter by user_id property

### Elasticsearch (Search)
- Note and node indices
- Full-text search with relevance scoring

---

## LLM Integration

Configurable via environment variables:
- `LLM_PROVIDER`: "timeweb" | "google" | "custom"
- `GOOGLE_GENAI_API_KEY`: For Gemini
- `CUSTOM_LLM_API_KEY` + `CUSTOM_LLM_ENDPOINT`: For custom

LLM used for:
- Concept extraction
- Topic identification
- Knowledge gap detection
- Node/link suggestions

---

## State Management

### Frontend
- **Auth**: React Context (`AuthContext`)
- **Theme**: React Context (`ThemeContext`)
- **Preferences**: React Context (`PreferencesContext`)
- **Local state**: `useState` for component-specific data

No Redux/MobX currently. Keep it simple.

---

## Known Issues & Limitations

1. **No automated tests**: All testing is manual
2. **Limited error handling**: Mostly using `alert()` (toast notifications planned)
3. **No version history**: Planned for future (UC-02)
4. **No collaborative editing**: Future feature (UC-15)
5. **No collections/folders yet**: Planned (UC-12)
6. **Auto-save in progress**: Currently implementing debounced auto-save

---

## Development Workflow

1. **Feature Development**:
   - Create branch (if using Git)
   - Backend: Add route in `backend/app/api/`
   - Frontend: Update UI in `frontend/src/`
   - Test manually via browser + `/docs`
   - Commit changes

2. **Adding Dependencies**:
   - Backend: Add to `requirements.txt`, rebuild container
   - Frontend: `npm install <package>`, rebuild container

3. **Database Changes**:
   - PostgreSQL: Manual SQL scripts for now
   - Neo4j: Manual Cypher via Neo4j Browser
   - Elasticsearch: Indices created automatically on first use

---

## Debugging Tips

- **Backend logs**: `docker compose logs -f backend`
- **Frontend logs**: Browser console + Network tab
- **API testing**: Swagger UI at `http://localhost:8000/docs`
- **Graph inspection**: Neo4j Browser at `http://localhost:7474`
- **Search debugging**: Kibana (if added) or direct Elasticsearch queries

---

## Future Roadmap

Short-term:
- ✅ User authentication (JWT + protected routes)
- ✅ Theme switching (light/dark with CSS variables)
- ✅ Model selection (Gemini, Timeweb, Custom)
- 🔄 **Glassmorphism UX redesign** (in progress)
- 🔄 **Auto-save notes** (in progress)
- Profile editing
- Better error handling (toast notifications planned)

Medium-term:
- Automated tests
- Version history
- Import/export
- Collections/folders

Long-term:
- Collaboration features
- Mobile app
- Advanced NLP
- Recommendations engine

---

## Notes for AI Assistants

- Always filter queries by `user_id` for data isolation
- Use existing design tokens from `index.css`
- Follow TypeScript strictly (no `any` unless necessary)
- Keep components small and focused
- Add proper error handling
- Consider mobile responsiveness
- Maintain consistency with existing patterns
- Ask for clarification if requirements are unclear
