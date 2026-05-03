from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.models import Base
from app.config import settings
import os

_db_path = settings.coach_database_url.split("///")[-1]
DATA_DIR = os.path.dirname(_db_path) or "."
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = settings.coach_database_url

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
