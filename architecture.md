# KnowYourPath: Project Architecture

## Overview

**KnowYourPath** is an intelligent note-taking system with knowledge graph visualization. It helps users create, organize, and discover connections between their notes using AI-powered analysis and graph database technology.

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.13+)
- **Database**: PostgreSQL (structured data: notes, users)
- **Graph Database**: Neo4j (knowledge graph: nodes, relationships)
- **Search Engine**: Elasticsearch (full-text search)
- **Authentication**: JWT tokens
- **AI/LLM**: Configurable (Google Gemini, Timeweb, Custom)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Graph Visualization**: react-force-graph-2d

### Infrastructure
- **Container**: Docker + Docker Compose
- **Development**: Hot reload for both frontend and backend

---

## System Components

### 1. User Service
- User registration and authentication
- Profile management
- User preferences (theme, LLM model)
- Session management with JWT

### 2. Note Service
- Create, read, update, delete notes
- Version history (planned)
- Tag management
- User-specific notes isolation

### 3. Knowledge Graph Service
- Node creation and management
- Relationship extraction
- Graph traversal and queries
- Knowledge gap detection

### 4. Analysis Service
- LLM-powered note analysis
- Concept extraction
- Topic identification
- Automatic node/link suggestions

### 5. Search Service
- Full-text search across notes
- Node search by name/tags
- Similarity search (planned)

---

## Data Models

### User (PostgreSQL)
```python
- id: UUID
- email: string (unique)
- username: string (unique)
- hashed_password: string
- theme: enum (light, dark)
- llm_model: string
- created_at: datetime
- updated_at: datetime
```

### Note (PostgreSQL)
```python
- id: UUID
- user_id: UUID (foreign key)
- title: string
- content: text
- tags: array[string]
- created_at: datetime
- updated_at: datetime
```

### Node (Neo4j)
```cypher
(:KnowledgeNode {
  id: string,
  user_id: string,
  label: string,
  summary: string,
  level: int,
  has_gap: boolean,
  tags: [string],
  created_at: datetime
})
```

### Relationship (Neo4j)
```cypher
[:RELATES_TO {
  relation: string,
  strength: float
}]
```

---

## Data Flow

### Note Creation & Analysis
1. User writes note in editor
2. User clicks "Analyze"
3. Frontend sends note content to `/api/analyze`
4. Backend calls LLM service (Gemini/Timeweb/Custom)
5. LLM returns structured analysis (nodes, links, concepts)
6. Frontend displays analysis results
7. User clicks "Save"
8. Note saved to PostgreSQL
9. Nodes/links saved to Neo4j
10. Note indexed in Elasticsearch

### Graph Visualization
1. Frontend requests graph data from `/api/graph/nodes` and `/api/graph/links`
2. Backend queries Neo4j for user-specific graph
3. Frontend renders using react-force-graph-2d
4. User clicks node → detailed view shown

### Search
1. User types in search box
2. Frontend debounces input, sends to `/api/search/notes` or `/api/search/nodes`
3. Backend queries Elasticsearch
4. Results ranked and returned
5. Frontend displays results with highlights

---

## Authentication Flow

### Registration
1. User submits email, username, password
2. Backend validates input
3. Password hashed with bcrypt
4. User record created in PostgreSQL
5. JWT token issued
6. Frontend stores token in localStorage/sessionStorage

### Login
1. User submits credentials
2. Backend validates against database
3. JWT token issued on success
4. Frontend stores token

### Protected Routes
- Frontend includes JWT in `Authorization: Bearer <token>` header
- Backend validates token on each request
- User ID extracted from token for data isolation

---

## Frontend Architecture

### Pages
- **AuthPage**: Login/Register forms
- **MainApp**: Note editor + Graph + Node details (3-column layout)
- **SettingsPage**: User profile, theme, model selection

### Context Providers
- **AuthContext**: Current user, login/logout functions
- **ThemeContext**: Current theme, toggle function
- **PreferencesContext**: LLM model preference

### Components
- **Editor**: Note editing with auto-save
- **GraphView**: Interactive knowledge graph
- **NodeDetails**: Selected node information
- **ThemeSwitcher**: Light/Dark toggle
- **ModelSelector**: Dropdown for LLM model selection

---

## Backend Architecture

### API Routes
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/users/profile` - Update profile
- `/api/notes` - CRUD operations
- `/api/analyze` - LLM analysis
- `/api/graph/nodes` - Get nodes
- `/api/graph/links` - Get relationships
- `/api/search/notes` - Search notes
- `/api/search/nodes` - Search nodes

### Services
- **LLMService**: Abstraction over different LLM providers
- **NLPService**: Text processing utilities
- **KnowledgeService**: Node extraction logic
- **HierarchyService**: Graph organization

---

## Security Considerations

- Passwords hashed with bcrypt
- JWT tokens with expiration
- CORS configured for frontend origin
- Environment variables for secrets
- User data isolation (all queries filtered by user_id)
- Rate limiting (planned)

---

## Deployment

### Development
```bash
docker compose up -d --build
```

### Production (planned)
- Backend: FastAPI with Gunicorn/Uvicorn workers
- Frontend: Static build served by Nginx
- PostgreSQL: Managed service (AWS RDS, etc.)
- Neo4j: Cloud or self-hosted with backup
- Elasticsearch: Managed service
- Reverse proxy with SSL (Nginx/Caddy)

---

## Future Enhancements

1. **Collaboration**: Shared graphs, permissions
2. **Import/Export**: Notion, Obsidian, Markdown
3. **Advanced NLP**: Keyword extraction, entity recognition
4. **Recommendations**: "What to learn next"
5. **Mobile App**: React Native or PWA
6. **Version History**: Note change tracking
7. **Collections**: Thematic folders/workspaces
8. **Real-time Sync**: WebSocket for live updates
