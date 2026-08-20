import io
import csv
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc

from app.database.database import get_db
from app.models.models import StolenVehicleAlert, StolenVehicle, Camera
from app.schemas.schemas import (
    StolenVehicleAlertResponse,
    StolenVehicleAlertResolveRequest,
    StolenVehicleStatsResponse
)
from app.services.stolen_vehicle_service import StolenVehicleService

router = APIRouter(prefix="/stolen-alerts", tags=["Stolen Vehicle Alerts"])


@router.get("", response_model=List[StolenVehicleAlertResponse])
async def list_stolen_alerts(
    search: Optional[str] = Query(None, description="Search by plate number, FIR, owner, camera, or location"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, INVESTIGATING, INTERCEPTED, RESOLVED, FALSE_POSITIVE, or ALL"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    days: Optional[int] = Query(None, description="Filter alerts from the last N days"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    List historical and live stolen vehicle alerts with multi-criteria filtering and pagination.
    """
    stmt = select(StolenVehicleAlert).order_by(StolenVehicleAlert.timestamp.desc())

    if status and status.upper() != "ALL":
        stmt = stmt.where(StolenVehicleAlert.status == status.upper())

    if camera_id and camera_id.upper() != "ALL":
        stmt = stmt.where(StolenVehicleAlert.camera_id == camera_id)

    if days and days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = stmt.where(StolenVehicleAlert.timestamp >= cutoff)

    if search:
        search_norm = StolenVehicleService.normalize_plate(search)
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                StolenVehicleAlert.vehicle_number.ilike(search_term),
                StolenVehicleAlert.vehicle_number.ilike(f"%{search_norm}%"),
                StolenVehicleAlert.fir_number.ilike(search_term),
                StolenVehicleAlert.owner_name.ilike(search_term),
                StolenVehicleAlert.camera_name.ilike(search_term),
                StolenVehicleAlert.camera_location.ilike(search_term),
                StolenVehicleAlert.ocr_text.ilike(search_term)
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return alerts


@router.get("/live", response_model=List[StolenVehicleAlertResponse])
async def get_live_active_alerts(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get immediate recent active alerts for real-time dashboard banner and sound alarms.
    """
    stmt = (
        select(StolenVehicleAlert)
        .where(StolenVehicleAlert.status.in_(["ACTIVE", "INVESTIGATING"]))
        .order_by(StolenVehicleAlert.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/stats", response_model=StolenVehicleStatsResponse)
async def get_stolen_vehicle_stats(db: AsyncSession = Depends(get_db)):
    """
    Summary analytics and KPI metrics for Stolen Vehicle Alert System:
    Total registered, active alerts, alerts today, recovered count, breakdown by status & camera.
    """
    # 1. Total stolen vehicles
    total_stolen_stmt = select(func.count(StolenVehicle.id))
    total_stolen = (await db.execute(total_stolen_stmt)).scalar() or 0

    # 2. Recovered vehicles
    recovered_stmt = select(func.count(StolenVehicle.id)).where(StolenVehicle.status == "RECOVERED")
    recovered_count = (await db.execute(recovered_stmt)).scalar() or 0

    # 3. Active alerts
    active_alerts_stmt = select(func.count(StolenVehicleAlert.id)).where(StolenVehicleAlert.status == "ACTIVE")
    active_alerts_count = (await db.execute(active_alerts_stmt)).scalar() or 0

    # 4. Alerts today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_today_stmt = select(func.count(StolenVehicleAlert.id)).where(StolenVehicleAlert.timestamp >= today_start)
    alerts_today_count = (await db.execute(alerts_today_stmt)).scalar() or 0

    # 5. Total alerts all time
    total_alerts_stmt = select(func.count(StolenVehicleAlert.id))
    total_alerts_all_time = (await db.execute(total_alerts_stmt)).scalar() or 0

    # 6. Status Breakdown
    status_counts_stmt = select(StolenVehicleAlert.status, func.count(StolenVehicleAlert.id)).group_by(StolenVehicleAlert.status)
    status_rows = (await db.execute(status_counts_stmt)).all()
    status_breakdown = {row[0]: row[1] for row in status_rows}

    # 7. Priority Breakdown from Stolen Vehicles
    priority_counts_stmt = select(StolenVehicle.priority, func.count(StolenVehicle.id)).group_by(StolenVehicle.priority)
    priority_rows = (await db.execute(priority_counts_stmt)).all()
    priority_breakdown = {row[0]: row[1] for row in priority_rows}

    # 8. Critical alerts count
    critical_stmt = (
        select(func.count(StolenVehicleAlert.id))
        .join(StolenVehicle, StolenVehicleAlert.stolen_vehicle_id == StolenVehicle.id, isouter=True)
        .where(or_(StolenVehicle.priority == "CRITICAL", StolenVehicleAlert.status == "ACTIVE"))
    )
    critical_alerts_count = (await db.execute(critical_stmt)).scalar() or 0

    # 9. Camera Breakdown
    camera_counts_stmt = (
        select(StolenVehicleAlert.camera_name, StolenVehicleAlert.camera_location, func.count(StolenVehicleAlert.id))
        .group_by(StolenVehicleAlert.camera_name, StolenVehicleAlert.camera_location)
        .order_by(desc(func.count(StolenVehicleAlert.id)))
        .limit(6)
    )
    camera_rows = (await db.execute(camera_counts_stmt)).all()
    camera_breakdown = [
        {"camera_name": row[0] or "Highway ANPR", "location": row[1] or "City Highway", "count": row[2]}
        for row in camera_rows
    ]

    # 10. Daily trend for last 7 days
    daily_trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day_date = now - timedelta(days=i)
        day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        day_stmt = select(func.count(StolenVehicleAlert.id)).where(
            and_(StolenVehicleAlert.timestamp >= day_start, StolenVehicleAlert.timestamp <= day_end)
        )
        day_count = (await db.execute(day_stmt)).scalar() or 0
        daily_trend.append({
            "date": day_start.strftime("%b %d"),
            "count": day_count
        })

    return {
        "total_stolen_vehicles": total_stolen,
        "active_alerts": active_alerts_count,
        "alerts_today": alerts_today_count,
        "recovered_vehicles": recovered_count,
        "total_alerts_all_time": total_alerts_all_time,
        "critical_alerts_count": critical_alerts_count,
        "status_breakdown": status_breakdown,
        "priority_breakdown": priority_breakdown,
        "camera_breakdown": camera_breakdown,
        "daily_trend": daily_trend
    }


@router.post("/resolve", response_model=StolenVehicleAlertResponse)
async def resolve_stolen_alert(
    payload: StolenVehicleAlertResolveRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resolve, update investigation status, or flag an alert as Intercepted/False Positive.
    """
    stmt = select(StolenVehicleAlert).where(StolenVehicleAlert.id == payload.alert_id)
    alert = (await db.execute(stmt)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Stolen vehicle alert record not found.")

    alert.status = payload.status.upper()
    alert.resolved_by = payload.resolved_by
    if payload.remarks:
        existing = alert.remarks or ""
        alert.remarks = f"{existing}\n[{alert.status} by {payload.resolved_by} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}: {payload.remarks}]".strip()
    alert.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.get("/export/csv")
async def export_stolen_alerts_csv(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Export stolen vehicle alert log as a downloadable CSV spreadsheet.
    """
    stmt = select(StolenVehicleAlert).order_by(StolenVehicleAlert.timestamp.desc())
    if status and status.upper() != "ALL":
        stmt = stmt.where(StolenVehicleAlert.status == status.upper())

    result = await db.execute(stmt)
    alerts = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Alert ID", "Timestamp (UTC)", "Vehicle License Plate", "Owner Name",
        "FIR Number", "Camera Name", "Location", "Latitude", "Longitude",
        "OCR Read Text", "Confidence", "Alert Status", "Resolved By", "Remarks"
    ])

    for a in alerts:
        writer.writerow([
            a.id,
            a.timestamp.strftime("%Y-%m-%d %H:%M:%S") if a.timestamp else "",
            a.vehicle_number,
            a.owner_name or "N/A",
            a.fir_number or "N/A",
            a.camera_name or "CAM-01",
            a.camera_location or "Highway Junction",
            f"{a.latitude:.6f}",
            f"{a.longitude:.6f}",
            a.ocr_text,
            f"{a.confidence:.2f}",
            a.status,
            a.resolved_by or "",
            a.remarks or ""
        ])

    output.seek(0)
    filename = f"stolen_vehicle_alerts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/simulate")
async def simulate_stolen_detection(
    plate_number: str = Query("HR26DQ5519", description="License plate to test"),
    camera_name: str = Query("Live ANPR Camera 01", description="Camera source name"),
    location: str = Query("NH-48 Cyber City Gateway", description="Location"),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer / Demo endpoint to simulate real-time stolen vehicle ANPR detection.
    Triggers instant WebSocket broadcast and audio alarm!
    """
    # Temporarily reset cooldown for simulation testing
    norm = StolenVehicleService.normalize_plate(plate_number)
    for k in list(StolenVehicleService._cooldown_tracker.keys()):
        if norm in k:
            StolenVehicleService._cooldown_tracker.pop(k, None)

    alert = await StolenVehicleService.process_plate_detection(
        plate_str=plate_number,
        camera_id="CAM-SIM-01",
        camera_name=camera_name,
        camera_location=location,
        latitude=28.4595,
        longitude=77.0266,
        vehicle_snapshot_url="/processed/violations/sample_vehicle.jpg",
        plate_crop_url="/processed/violations/sample_plate.jpg",
        ocr_confidence=0.98,
        frame_number=188,
        db_session=db
    )

    if not alert:
        return {
            "status": "not_stolen",
            "message": f"Plate '{plate_number}' is not in the active Stolen Vehicle Registry. Register it first to test alerts."
        }

    return {
        "status": "alert_dispatched",
        "alert": alert,
        "message": "Stolen Vehicle Alert successfully triggered and broadcasted over WebSocket."
    }
