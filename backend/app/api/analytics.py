#master acc bi
from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import get_db, User, Transaction, Location
from app.api.auth import require_master

router = APIRouter(prefix = "/api/analytics", tags=["Master BI"])

@router.get("/dashboard")
def get_dashboard(
    start_date: date = date.today(),
    end_date: date = date.today(),
    location_id: int | None = None,
    master: User = Depends(require_master),
    db: Session = Depends(get_db)
):
    dt_start = datetime.combine(start_date, datetime.min.time())
    dt_end = datetime.combine(end_date, datetime.max.time())
    
    query = db.query(
        func.sum(Transaction.total_amount).label("gross_revenue"),
        func.count(Transaction.id).label("details"),
        func.sum(Transaction.players_count).label("players"),
        func.sum(Transaction.rev_aw).label("aw"),
        func.sum(Transaction.rev_lounge).label("lounge"),
        func.sum(Transaction.rev_single).label("single"),
        func.sum(Transaction.rev_ps5).label("ps5"),
        func.sum(Transaction.rev_autosim).label("autosim"),
        func.sum(Transaction.pay_card).label("card"),
        func.sum(Transaction.pay_qr).label("qr"),
        func.sum(Transaction.pay_cash).label("cash"),
        func.sum(Transaction.pay_lifepay).label("lifepay"),
        func.sum(Transaction.pay_np).label("np")
    ).filter(
        Transaction.created_at >= dt_start,
        Transaction.created_at <= dt_end,
    )
    
    if location_id:
        query = query.filter(Transaction.location_id == location_id)
        
    res = query.first()
    
    gross_revenue = float(res.gross_revenue or 0)
    refunds = float(res.refunds or 0)
    net_revenue = gross_revenue - refunds
    deals = int(res.deals or 0)
    players = int(res.players or 0)
    
    return{
        "period": {"from": start_date, "to": end_date},
        "kpi": {
            "gross_revenue": gross_revenue,
            "refunds": refunds,
            "net_revenue": net_revenue,
            "deals_count": deals,
            "players_count": players,
            "avg_check_deal": round(net_revenue / deals, 2) if deals else 0,
            "avg_check_guest": round(net_revenue / players, 2) if players else 0
        },
        "services": {
            "aw": float(res.aw or 0),
            "lounge": float(res.lounge or 0),
            "single": float(res.single or 0),
            "ps5": float(res.ps5 or 0),
            "autosim": float(res.autosim or 0),
        },
        "payments": {
            "card": float(res.card or 0),
            "qr": float(res.qr or 0),
            "cash": float(res.cash or 0),
            "lifepay": float(res.lifepay or 0),
            "np": float(res.np or 0),
        }
    }