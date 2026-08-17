import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.models import User, Video, Detection, Report, UserRole
from app.schemas.schemas import ReportGenerateRequest, ReportResponse
from app.auth.jwt import get_current_user, require_role
from app.services.report_service import ReportGenerationService
from app.services.severity_service import SeverityAnalysisService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    req: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate inspection report in PDF, Excel (.xlsx), or CSV format.
    """
    if not req.video_ids:
        raise HTTPException(status_code=400, detail="Please select at least one video ID")

    # Fetch videos
    stmt = select(Video).where(Video.id.in_(req.video_ids))
    videos = (await db.execute(stmt)).scalars().all()
    if not videos:
        raise HTTPException(status_code=404, detail="Selected videos not found")

    # Fetch detections
    det_stmt = select(Detection).where(Detection.video_id.in_(req.video_ids))
    detections_orm = (await db.execute(det_stmt)).scalars().all()

    detections_data = [
        {
            "id": d.id,
            "video_id": d.video_id,
            "frame_number": 1,
            "category": d.category.value,
            "confidence": d.confidence,
            "severity": d.severity.value,
            "severity_score": d.severity_score,
            "x_min": d.x_min,
            "y_min": d.y_min,
            "x_max": d.x_max,
            "y_max": d.y_max,
            "area_pixels": d.area_pixels
        }
        for d in detections_orm
    ]

    summary = SeverityAnalysisService.calculate_road_health_index(
        detections_data, video_duration_seconds=sum(v.duration_seconds for v in videos)
    )

    fmt = req.format.lower()
    filename = f"road_damage_report_{videos[0].id[:8]}.{fmt}"

    if fmt == "csv":
        path = ReportGenerationService.generate_csv_report(detections_data, filename)
    elif fmt in ["xlsx", "excel"]:
        path = ReportGenerationService.generate_excel_report(summary, detections_data, filename)
    elif fmt == "pdf":
        path = ReportGenerationService.generate_pdf_report("Road Inspection Audit", summary, detections_data, filename)
    else:
        raise HTTPException(status_code=400, detail="Unsupported report format")

    db_report = Report(
        title=f"Road Damage Audit ({fmt.upper()})",
        report_type=fmt.upper(),
        file_path=path,
        created_by=current_user.id
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)

    return db_report


@router.get("/download/{report_id}")
async def download_report_file(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download a generated report file."""
    stmt = select(Report).where(Report.id == report_id)
    report = (await db.execute(stmt)).scalar_one_or_none()

    if not report or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")

    return FileResponse(
        path=report.file_path,
        filename=os.path.basename(report.file_path),
        media_type="application/octet-stream"
    )
