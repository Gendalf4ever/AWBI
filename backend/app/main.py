from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import Base, engine, SessionLocal, Location, User
from app.core.security import get_password_hash
from app.api import auth, records, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try: 
        if db.query(Location).count() == 0:
            locs = [
                Location(name= "Пик", code= "pik"),
                Location(name= "Прометей", code= "prometey"),
                Location(name= "Малина Молл", code= "malina-moll")
            ]
            db.add_all(locs)
            db.commit()
            
            users = [
                User(username="master", full_name="Руководитель", password_hash=get_password_hash("1234"), role="master", location_id=None),
                User(username="pik", full_name="Оператор Пик", password_hash=get_password_hash("1234"), role="operator", location_id=locs[0].id),
                User(username="prometey", full_name="Оператор Прометей", password_hash=get_password_hash("1234"), role="operator", location_id=locs[1].id),
                User(username="malina-moll", full_name="Оператор Малина Молл", password_hash=get_password_hash("1234"), role="operator", location_id=locs[2].id),
            ]
            db.add_all(users)
            db.commit()
    finally:
        db.close()
    
    yield
    

app = FastAPI(title= "VR Club BI System", lifespan= lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(records.router)
app.include_router(analytics.router)