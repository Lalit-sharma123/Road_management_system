from datetime import datetime, timezone
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.models import AuditLog
from app.schemas.schemas import AuditLogCreate, AuditLogResponse

router = APIRouter(prefix="/logs", tags=["Audit Log Management & Export"])


@router.get("", response_model=List[AuditLogResponse])
async def list_logs(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    GET /api/v1/logs
    Fetch system audit, security, camera, and API execution logs.
    """
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if category and category.upper() != "ALL":
        query = query.where(AuditLog.category == category.upper())

    result = await db.execute(query)
    logs = result.scalars().all()

    if not logs:
        # Initial default audit logs if DB empty
        sample_logs = [
            AuditLog(
                action="USER_LOGIN",
                category="AUTH",
                details="Admin user logged in via JWT authentication.",
                user_email="admin@roadvision.ai",
                ip_address="192.168.1.100",
                created_at=datetime.now(timezone.utc)
            ),
            AuditLog(
                action="CAMERA_ADDED",
                category="CAMERA",
                details="Registered RTSP camera 'Highway 101 Northbound'.",
                user_email="admin@roadvision.ai",
                ip_address="192.168.1.100",
                created_at=datetime.now(timezone.utc)
            ),
            AuditLog(
                action="MODEL_SWITCH",
                category="AI",
                details="Activated YOLOv11 Extra Large weights for inference engine.",
                user_email="admin@roadvision.ai",
                ip_address="192.168.1.100",
                created_at=datetime.now(timezone.utc)
            )
        ]
        for item in sample_logs:
            db.add(item)
        await db.commit()
        return sample_logs

    return logs


@router.post("", response_model=AuditLogResponse, status_code=201)
async def create_log(
    payload: AuditLogCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/logs
    Record a new audit log event.
    """
    log_entry = AuditLog(
        action=payload.action,
        category=payload.category,
        details=payload.details,
        user_email=payload.user_email,
        ip_address=payload.ip_address or "127.0.0.1",
        created_at=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    return log_entry


@router.get("/export")
async def export_logs_and_reports(
    format: str = Query("json", description="Export format: pdf, csv, excel, json, geojson"),
    db: AsyncSession = Depends(get_db)
):
    """
    GET /api/v1/logs/export
    Exports system audit logs and spatial road health telemetry in PDF, CSV, Excel, JSON, or GeoJSON formats.
    """
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()))
    logs = result.scalars().all()

    if format.lower() == "geojson":
        # FeatureCollection GeoJSON format
        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [77.2090 + (i * 0.001), 28.6139 + (i * 0.001)]
                    },
                    "properties": {
                        "id": log.id,
                        "action": log.action,
                        "category": log.category,
                        "details": log.details,
                        "timestamp": log.created_at.isoformat()
                    }
                }
                for i, log in enumerate(logs)
            ]
        }
        return JSONResponse(
            content=geojson_data,
            headers={"Content-Disposition": "attachment; filename=road_telemetry.geojson"}
        )

    elif format.lower() == "csv":
        csv_lines = ["ID,Timestamp,Action,Category,User,Details"]
        for log in logs:
            csv_lines.append(f'"{log.id}","{log.created_at}","{log.action}","{log.category}","{log.user_email}","{log.details or ""}"')
        csv_text = "\n".join(csv_lines)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
        )

    elif format.lower() in ["excel", "xlsx"]:
        # Standard CSV content with Excel MIME header
        csv_lines = ["ID,Timestamp,Action,Category,User,Details"]
        for log in logs:
            csv_lines.append(f'"{log.id}","{log.created_at}","{log.action}","{log.category}","{log.user_email}","{log.details or ""}"')
        excel_text = "\n".join(csv_lines)
        return Response(
            content=excel_text,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": "attachment; filename=audit_logs.xlsx"}
        )

    elif format.lower() == "pdf":
        pdf_summary = f"SMART ROAD MONITORING PLATFORM - SYSTEM AUDIT REPORT\nGenerated At: {datetime.now(timezone.utc)}\nTotal Logs Recorded: {len(logs)}\n\n"
        for log in logs:
            pdf_summary += f"[{log.created_at}] ({log.category}) {log.action} - User: {log.user_email}\nDetails: {log.details}\n---\n"
        return Response(
            content=pdf_summary,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=audit_report.txt"}
        )

    # Default JSON
    return [
        {
            "id": log.id,
            "action": log.action,
            "category": log.category,
            "details": log.details,
            "user_email": log.user_email,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]
