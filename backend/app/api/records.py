from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import get_db, User, Shift, Transaction
from app.schemas import ShiftOpen, ShiftClose, TransactionCreate, TransactionOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/records", tags=["Shifts and Transactions"])

@router.get("/shift/current")
def get_current_shift(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator" or not user.location_id:
        return {"active": False}
    
    shift = db.query(Shift).filter(
        Shift.location_id == user.location_id,
        Shift.is_closed == False
    ).first()
    
    if not shift:
        return {"active": False}

    cash_sales = db.query(func.sum(Transaction.pay_cash)).filter(
        Transaction.shift_id == shift.id
    ).scalar() or 0

    return {
        "active": True,
        "shift_id": shift.id,
        "opened_at": shift.opened_at,
        "start_cash": float(shift.start_cash),
        "expected_cash": float(shift.start_cash) + float(cash_sales)
    }

@router.post("/shift/open")
def open_shift(data: ShiftOpen, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator" or not user.location_id:
        raise HTTPException(status_code=403, detail="only operator can open shift")
    existing = db.query(Shift).filter(Shift.location_id == user.location_id, Shift.is_closed == False).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"shift #{existing.id} is already open")
    
    shift = Shift(location_id=user.location_id, operator_id=user.id, start_cash=data.start_cash)
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return {"message": "Shift is open", "shift_id": shift.id}

@router.post("/shift/close")
def close_shift(data: ShiftClose, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.location_id == user.location_id, Shift.is_closed == False).first()
    if not shift:
        raise HTTPException(status_code=400, detail="no active shift")
    
    shift.end_cash = data.end_cash
    shift.cash_taken = data.cash_taken
    shift.closed_at = datetime.now()
    shift.is_closed = True
    db.commit()
    return {"message": "shift is closed", "shift_id": shift.id}

@router.post("/transactions", response_model=TransactionOut)
def add_transaction(data: TransactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator" or not user.location_id:
        raise HTTPException(status_code=403, detail="only operator can add transactions")

    shift = db.query(Shift).filter(Shift.location_id == user.location_id, Shift.is_closed == False).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Open shift first!")

    total = data.pay_card + data.pay_qr + data.pay_lifepay + data.pay_cash + data.pay_np

    tx = Transaction(
        shift_id=shift.id,
        location_id=user.location_id,
        operator_id=user.id,
        total_amount=total,
        **data.model_dump()
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.get("/transactions", response_model=list[TransactionOut])
def get_transactions(location_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Transaction)
    if user.role == "operator":
        query = query.filter(
            Transaction.location_id == user.location_id,
            Transaction.created_at >= datetime.combine(date.today(), datetime.min.time())
        )
    else:
        if location_id:
            query = query.filter(Transaction.location_id == location_id)
    return query.order_by(Transaction.id.desc()).all()