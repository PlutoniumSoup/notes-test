from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.postgres import get_db_session
from ..db.models import Note, User
from ..db.elastic import get_es
from ..models.schemas import NoteCreate, NoteOut, NoteUpdate
from ..services.llm import analyze_note_with_llm
from ..core.security import get_current_user


router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("/", response_model=NoteOut)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    note = Note(
        title=payload.title,
        content=payload.content,
        tags=payload.tags,
        user_id=current_user.id
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    es = get_es()
    es.index(index="notes", id=note.id, document={
        "id": note.id,
        "user_id": str(note.user_id),
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
    })

    # Анализ заметки с помощью LLM
    try:
        analysis = analyze_note_with_llm(note.content)
        if analysis:
            # Обновляем теги на основе анализа
            if analysis.get("tags"):
                note.tags = list(set(note.tags + analysis["tags"]))
            db.commit()
            db.refresh(note)
    except Exception as e:
        print(f"LLM analysis error: {e}")

    return note


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.tags is not None:
        note.tags = payload.tags
    db.commit()
    db.refresh(note)

    es = get_es()
    es.index(index="notes", id=note.id, document={
        "id": note.id,
        "user_id": str(note.user_id),
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
    })

    # Повторный анализ при обновлении
    if payload.content is not None:
        try:
            analysis = analyze_note_with_llm(note.content)
            if analysis and analysis.get("tags"):
                note.tags = list(set(note.tags + analysis["tags"]))
                db.commit()
                db.refresh(note)
        except Exception as e:
            print(f"LLM analysis error: {e}")

    return note
