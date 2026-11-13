from datetime import datetime, date
from sqlalchemy import create_engine, Column, Integer, String, Numeric, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
class Location(Base):
    __tablename__= "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(100), nullable= False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) #operator or master
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    
    location = relationship("Location")
    
class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    shift_date = Column(Date, default=date.today, nullable = False)
    opened_at = Column(DateTime, default=datetime.now)
    closed_at = Column(DateTime, nullable=True)
    start_cash = Column(Numeric(10,2), default = 0)
    end_cash = Column(Numeric(10,2), nullable=True)
    cash_taken = Column(Numeric(10, 2), default=0)
    is_closed = Column(Boolean, default=False)
    
    location = relationship("Location")
    operator = relationship("User")

class Transaction(Base):
    __tablename__ = "transactions"    
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable = False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    created_at = Column(DateTime, default=datetime.now)
    
    #session params
    tariff = Column(String(50), nullable = False)
    players_count = Column(Integer, default = 1)
    crm_deal_id = Column(String(100), nullable = True)
    comment = Column(Text, nullable=True)
    
    #paychecks
    pay_card = Column(Numeric(10,2), default = 0)
    pay_qr = Column(Numeric(10,2), default = 0)
    pay_lifepay = Column(Numeric(10, 2), default = 0)
    pay_cash = Column(Numeric(10, 2), default = 0)
    pay_np = Column(Numeric(10,2), default = 0)
    total_amount = Column(Numeric(10,2), nullable=False)
    is_refund = Column(Numeric(10,2), default=0) # 

    # revenue   
    rev_aw = Column(Numeric(10, 2), default = 0)
    rev_lounge = Column(Numeric(10, 2), default=0)
    rev_single =  Column(Numeric(10, 2), default=0)
    rev_ps5 = Column(Numeric(10, 2), default = 0)
    rev_autosim = Column(Numeric(10, 2), default=0)
    
    