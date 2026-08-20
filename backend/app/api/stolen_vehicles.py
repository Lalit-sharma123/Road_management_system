import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, delete

from app.database.database import get_db
from app.models.models import StolenVehicle, StolenVehicleSettings
from app.schemas.schemas import (
    StolenVehicleCreate,
    StolenVehicleUpdate,
    StolenVehicleResponse,
    StolenVehicleSettingsSchema
)
from app.services.stolen_vehicle_service import StolenVehicleService

router = APIRouter(prefix="/stolen-vehicles", tags=["Stolen Vehicle Registry"])


@router.get("", response_model=List[StolenVehicleResponse])
async def list_stolen_vehicles(
    search: Optional[str] = Query(None, description="Search by plate number, FIR, owner, or police station"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, RECOVERED, or ALL"),
    priority: Optional[str] = Query(None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL"),
    vehicle_type: Optional[str] = Query(None, description="Filter by vehicle type: CAR, MOTORCYCLE, etc."),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    List all registered stolen vehicles with search, status filtering, and pagination.
    """
    stmt = select(StolenVehicle).order_by(StolenVehicle.created_at.desc())

    if status and status.upper() != "ALL":
        stmt = stmt.where(StolenVehicle.status == status.upper())

    if priority and priority.upper() != "ALL":
        stmt = stmt.where(StolenVehicle.priority == priority.upper())

    if vehicle_type and vehicle_type.upper() != "ALL":
        stmt = stmt.where(StolenVehicle.vehicle_type == vehicle_type.upper())

    if search:
        search_norm = StolenVehicleService.normalize_plate(search)
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                StolenVehicle.vehicle_number.ilike(search_term),
                StolenVehicle.vehicle_number.ilike(f"%{search_norm}%"),
                StolenVehicle.fir_number.ilike(search_term),
                StolenVehicle.owner_name.ilike(search_term),
                StolenVehicle.police_station.ilike(search_term),
                StolenVehicle.reason.ilike(search_term)
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    vehicles = result.scalars().all()
    return vehicles


@router.post("", response_model=StolenVehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_stolen_vehicle(
    payload: StolenVehicleCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new stolen or wanted vehicle into the registry and sync real-time in-memory cache.
    """
    normalized_plate = StolenVehicleService.normalize_plate(payload.vehicle_number)
    if not normalized_plate:
        raise HTTPException(status_code=400, detail="A valid vehicle license plate number is required.")

    # Check for existing active registration with the same normalized plate
    existing_stmt = select(StolenVehicle).where(
        func.upper(StolenVehicle.vehicle_number) == normalized_plate
    )
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle number '{normalized_plate}' is already registered (FIR: {existing.fir_number})."
        )

    new_vehicle = StolenVehicle(
        id=str(uuid.uuid4()),
        vehicle_number=normalized_plate,
        owner_name=payload.owner_name,
        vehicle_type=payload.vehicle_type.upper(),
        fir_number=payload.fir_number.strip(),
        police_station=payload.police_station.strip(),
        date_reported=payload.date_reported or datetime.now(timezone.utc),
        reason=payload.reason.strip(),
        priority=payload.priority.upper(),
        status=payload.status.upper(),
        notes=payload.notes
    )

    db.add(new_vehicle)
    await db.commit()
    await db.refresh(new_vehicle)

    # Sync fast in-memory O(1) cache
    await StolenVehicleService.reload_cache(db)

    return new_vehicle


@router.get("/{vehicle_id}", response_model=StolenVehicleResponse)
async def get_stolen_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    """Get single stolen vehicle record by ID."""
    stmt = select(StolenVehicle).where(StolenVehicle.id == vehicle_id)
    vehicle = (await db.execute(stmt)).scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Stolen vehicle record not found.")
    return vehicle


@router.put("/{vehicle_id}", response_model=StolenVehicleResponse)
async def update_stolen_vehicle(
    vehicle_id: str,
    payload: StolenVehicleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update details of a registered stolen vehicle.
    """
    stmt = select(StolenVehicle).where(StolenVehicle.id == vehicle_id)
    vehicle = (await db.execute(stmt)).scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Stolen vehicle record not found.")

    if payload.vehicle_number is not None:
        norm = StolenVehicleService.normalize_plate(payload.vehicle_number)
        if norm:
            vehicle.vehicle_number = norm
    if payload.owner_name is not None:
        vehicle.owner_name = payload.owner_name
    if payload.vehicle_type is not None:
        vehicle.vehicle_type = payload.vehicle_type.upper()
    if payload.fir_number is not None:
        vehicle.fir_number = payload.fir_number.strip()
    if payload.police_station is not None:
        vehicle.police_station = payload.police_station.strip()
    if payload.date_reported is not None:
        vehicle.date_reported = payload.date_reported
    if payload.reason is not None:
        vehicle.reason = payload.reason
    if payload.priority is not None:
        vehicle.priority = payload.priority.upper()
    if payload.status is not None:
        vehicle.status = payload.status.upper()
    if payload.notes is not None:
        vehicle.notes = payload.notes

    vehicle.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(vehicle)

    # Sync fast in-memory O(1) cache
    await StolenVehicleService.reload_cache(db)

    return vehicle


@router.delete("/{vehicle_id}")
async def delete_stolen_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    """Delete stolen vehicle entry from registry."""
    stmt = select(StolenVehicle).where(StolenVehicle.id == vehicle_id)
    vehicle = (await db.execute(stmt)).scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Stolen vehicle record not found.")

    await db.delete(vehicle)
    await db.commit()

    # Sync fast in-memory O(1) cache
    await StolenVehicleService.reload_cache(db)

    return {"status": "success", "message": f"Vehicle {vehicle.vehicle_number} removed from registry."}


@router.post("/{vehicle_id}/recover", response_model=StolenVehicleResponse)
async def mark_vehicle_recovered(
    vehicle_id: str,
    notes: Optional[str] = Query(None, description="Optional recovery notes"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a stolen vehicle as RECOVERED.
    Automatically deactivates real-time ANPR alert triggers for this plate.
    """
    stmt = select(StolenVehicle).where(StolenVehicle.id == vehicle_id)
    vehicle = (await db.execute(stmt)).scalars().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Stolen vehicle record not found.")

    vehicle.status = "RECOVERED"
    if notes:
        existing_notes = vehicle.notes or ""
        vehicle.notes = f"{existing_notes}\n[Recovered on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}: {notes}]".strip()
    vehicle.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(vehicle)

    # Sync fast in-memory O(1) cache (removes vehicle from active surveillance matching)
    await StolenVehicleService.reload_cache(db)

    return vehicle


# ==========================================
# Stolen Vehicle System Settings Endpoints
# ==========================================

@router.get("/config/settings", response_model=StolenVehicleSettingsSchema)
async def get_stolen_vehicle_settings(db: AsyncSession = Depends(get_db)):
    """Get Stolen Vehicle Alert System configuration settings."""
    stmt = select(StolenVehicleSettings)
    settings_rec = (await db.execute(stmt)).scalars().first()
    if not settings_rec:
        settings_rec = StolenVehicleSettings(
            id=str(uuid.uuid4()),
            enabled=True,
            alert_cooldown_seconds=300,
            duplicate_interval_seconds=300,
            dashboard_notification=True,
            browser_notification=True,
            sound_alert=True,
            sms_enabled=False,
            whatsapp_enabled=False,
            email_enabled=False
        )
        db.add(settings_rec)
        await db.commit()
        await db.refresh(settings_rec)
    return settings_rec


@router.put("/config/settings", response_model=StolenVehicleSettingsSchema)
async def update_stolen_vehicle_settings(
    payload: StolenVehicleSettingsSchema,
    db: AsyncSession = Depends(get_db)
):
    """Update Stolen Vehicle Alert System configuration settings."""
    stmt = select(StolenVehicleSettings)
    settings_rec = (await db.execute(stmt)).scalars().first()
    if not settings_rec:
        settings_rec = StolenVehicleSettings(id=str(uuid.uuid4()))
        db.add(settings_rec)

    settings_rec.enabled = payload.enabled
    settings_rec.alert_cooldown_seconds = payload.alert_cooldown_seconds
    settings_rec.duplicate_interval_seconds = payload.duplicate_interval_seconds
    settings_rec.dashboard_notification = payload.dashboard_notification
    settings_rec.browser_notification = payload.browser_notification
    settings_rec.sound_alert = payload.sound_alert
    settings_rec.sms_enabled = payload.sms_enabled
    settings_rec.whatsapp_enabled = payload.whatsapp_enabled
    settings_rec.email_enabled = payload.email_enabled
    settings_rec.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(settings_rec)

    # Sync cache
    await StolenVehicleService.reload_cache(db)

    return settings_rec
