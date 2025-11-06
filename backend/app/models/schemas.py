from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


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
    title: str
    content: str
    tags: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


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
