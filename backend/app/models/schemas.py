from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid


# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str


class UserUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(light|dark)$")
    llm_model: Optional[str] = Field(None, pattern="^(google|timeweb|custom)$")


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    theme: str
    llm_model: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None


# Note schemas
class NoteCreate(BaseModel):
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class NoteOut(BaseModel):
    id: int
    user_id: uuid.UUID
    title: str
    content: str
    tags: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Graph schemas
class GraphNode(BaseModel):
    id: str
    label: str
    summary: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    has_gap: bool = False
    level: Optional[int] = None  # 0 - центральный узел, 1 - первый уровень, 2 - второй уровень


class GraphLink(BaseModel):
    source: str
    target: str
    relation: str


class GraphData(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]
