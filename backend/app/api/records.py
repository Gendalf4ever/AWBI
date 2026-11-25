from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import get_db, User, Shift, Transaction, Location
from app.schemas import ShiftOpen, ShiftClose, TransactionCreate, TransactionOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/records", tags=["Shifts and Transactions"])


@router.get("/locations")
def get_locations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Location).all()


@router.get("/shift/current")
def get_current_shift(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator":
        return {"active": False}

    shift = db.query(Shift).filter(
        Shift.operator_id == user.id,
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
        "location_id": shift.location_id,
        "location_name": shift.location.name,
        "operator_name": user.full_name,
        "opened_at": shift.opened_at,
        "start_cash": float(shift.start_cash),
        "expected_cash": float(shift.start_cash) + float(cash_sales)
    }


@router.post("/shift/open")
def open_shift(data: ShiftOpen, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator":
        raise HTTPException(status_code=403, detail="Только оператор может открыть смену")

    location = db.query(Location).filter(Location.id == data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Указанная точка не найдена")

    my_shift = db.query(Shift).filter(
        Shift.operator_id == user.id,
        Shift.is_closed == False
    ).first()
    if my_shift:
        raise HTTPException(
            status_code=400,
            detail=f"У вас уже открыта смена #{my_shift.id} на точке {my_shift.location.name}"
        )

    loc_shift = db.query(Shift).filter(
        Shift.location_id == data.location_id,
        Shift.is_closed == False
    ).first()
    if loc_shift:
        raise HTTPException(
            status_code=400,
            detail=f"На точке {location.name} не закрыта смена #{loc_shift.id} (оператор: {loc_shift.operator.full_name})"
        )
    
    shift = Shift(
        location_id=data.location_id,
        operator_id=user.id,
        start_cash=data.start_cash
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return {
        "message": f"Смена на точке {location.name} открыта",
        "shift_id": shift.id,
        "location_name": location.name
    }


@router.post("/shift/close")
def close_shift(data: ShiftClose, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator":
        raise HTTPException(status_code=403, detail="Только оператор может закрыть смену")

    shift = db.query(Shift).filter(
        Shift.operator_id == user.id,
        Shift.is_closed == False
    ).first()
    if not shift:
        raise HTTPException(status_code=400, detail="У вас нет активной открытой смены")
    
    shift.end_cash = data.end_cash
    shift.cash_taken = data.cash_taken
    shift.closed_at = datetime.now()
    shift.is_closed = True
    db.commit()
    return {"message": "Смена закрыта", "shift_id": shift.id}


@router.post("/transactions", response_model=TransactionOut)
def add_transaction(data: TransactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "operator":
        raise HTTPException(status_code=403, detail="Только оператор может добавлять записи")

    shift = db.query(Shift).filter(
        Shift.operator_id == user.id,
        Shift.is_closed == False
    ).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Сначала откройте смену!")

    total = data.pay_card + data.pay_qr + data.pay_lifepay + data.pay_cash + data.pay_np

    tx = Transaction(
        shift_id=shift.id,
        location_id=shift.location_id,
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
        shift = db.query(Shift).filter(
            Shift.operator_id == user.id,
            Shift.is_closed == False
        ).first()
        if not shift:
            return []
        query = query.filter(Transaction.shift_id == shift.id)
    else:
        if location_id:
            query = query.filter(Transaction.location_id == location_id)
    return query.order_by(Transaction.id.desc()).all()