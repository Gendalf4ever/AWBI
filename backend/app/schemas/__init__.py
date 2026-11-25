from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    location_name: str | None = None

class ShiftOpen(BaseModel):
    location_id: int
    start_cash: float = Field(default=0, ge=0)

class ShiftClose(BaseModel):
    end_cash: float = Field(ge=0)
    cash_taken: float = Field(default=0, ge=0)

class TransactionCreate(BaseModel):
    tariff: str
    players_count: int = Field(default=1, ge=1)
    crm_deal_id: str | None = None
    comment: str | None = None

    pay_card: float = 0
    pay_qr: float = 0
    pay_lifepay: float = 0
    pay_cash: float = 0
    pay_np: float = 0
    is_refund: float = 0

    rev_aw: float = 0
    rev_lounge: float = 0
    rev_single: float = 0
    rev_ps5: float = 0
    rev_autosim: float = 0

class TransactionOut(TransactionCreate):
    id: int
    location_id: int
    total_amount: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)