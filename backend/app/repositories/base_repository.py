from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic Repository Pattern Implementation using SQLAlchemy 2.0 Async Session.
    Encapsulates database access operations adhering to SOLID principles.
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        """Fetch single model entity by primary key."""
        stmt = select(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self, skip: int = 0, limit: int = 100, **filters
    ) -> List[ModelType]:
        """Fetch multiple entities with optional pagination and exact match filters."""
        stmt = select(self.model)
        for attr, value in filters.items():
            if hasattr(self.model, attr) and value is not None:
                stmt = stmt.where(getattr(self.model, attr) == value)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, obj_in_data: dict) -> ModelType:
        """Instantiate and persist a new ORM record."""
        db_obj = self.model(**obj_in_data)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, id: Any, obj_in_data: dict) -> Optional[ModelType]:
        """Update existing ORM entity by primary key."""
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return None
        for field, value in obj_in_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, id: Any) -> bool:
        """Delete entity record by primary key."""
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return False
        await self.db.delete(db_obj)
        await self.db.flush()
        return True

    async def count(self, **filters) -> int:
        """Return total count of records matching filters."""
        stmt = select(func.count()).select_from(self.model)
        for attr, value in filters.items():
            if hasattr(self.model, attr) and value is not None:
                stmt = stmt.where(getattr(self.model, attr) == value)
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0
