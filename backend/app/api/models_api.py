from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.models import AIModel
from app.schemas.schemas import AIModelCreate, AIModelResponse

router = APIRouter(prefix="/models", tags=["AI Model Management"])


@router.get("/telemetry")
async def get_models_telemetry():
    """
    GET /api/v1/models/telemetry
    Returns real-time inference latency (ms), throughput (FPS), active status,
    and performance metrics for the three active YOLO models.
    """
    from app.services.camera_manager import detector_instance
    telemetry_data = detector_instance.get_models_telemetry()
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_active_models": len(telemetry_data),
        "models": telemetry_data
    }


@router.get("", response_model=List[AIModelResponse])
async def list_ai_models(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/models
    Fetch registered YOLOv11 model weights and version status.
    """
    result = await db.execute(select(AIModel).order_by(AIModel.created_at.desc()))
    models = result.scalars().all()
    
    # Return default weights if DB is empty
    if not models:
        default_model = AIModel(
            id="m-yolov11x",
            model_name="YOLOv11 Extra Large (Unified)",
            version="v11.4.2",
            model_type="YOLOv11",
            classes_json={"0": "pothole", "1": "crack", "2": "car", "3": "truck", "4": "bus"},
            accuracy=0.968,
            map_score=0.924,
            status="active",
            is_active=True,
            file_path="backend/weights/yolov11x-road-unified.pt",
            created_at=datetime.now(timezone.utc)
        )
        db.add(default_model)
        await db.commit()
        await db.refresh(default_model)
        return [default_model]

    return models


@router.post("", response_model=AIModelResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_model(
    payload: AIModelCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/models
    Register new AI model metadata.
    """
    new_model = AIModel(
        model_name=payload.model_name,
        version=payload.version,
        model_type=payload.model_type,
        classes_json=payload.classes_json or {"0": "pothole", "1": "crack", "2": "car"},
        accuracy=payload.accuracy,
        map_score=payload.map_score,
        status=payload.status,
        is_active=payload.is_active,
        file_path=payload.file_path,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)
    return new_model


@router.patch("/{model_id}/activate", response_model=AIModelResponse)
async def activate_ai_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """
    PATCH /api/v1/models/{id}/activate
    Set active weights for inference pipeline. Deactivates other models.
    """
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    target_model = result.scalar_one_or_none()
    if not target_model:
        raise HTTPException(status_code=404, detail="AI Model not found.")

    # Deactivate all models
    await db.execute(update(AIModel).values(is_active=False))

    target_model.is_active = True
    target_model.status = "active"
    await db.commit()
    await db.refresh(target_model)
    return target_model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """
    DELETE /api/v1/models/{id}
    Remove model weights entry. Cannot delete currently active model.
    """
    result = await db.execute(select(AIModel).where(AIModel.id == model_id))
    target_model = result.scalar_one_or_none()
    if not target_model:
        raise HTTPException(status_code=404, detail="AI Model not found.")

    if target_model.is_active:
        raise HTTPException(status_code=400, detail="Cannot delete active inference model. Activate another model first.")

    await db.delete(target_model)
    await db.commit()
    return None
