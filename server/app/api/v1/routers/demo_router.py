from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.demo_detector_service import (
    start_demo_video_detector,
    get_demo_video_info,
    cleanup_demo_resources
)
from app.services.detector_service import (
    stop_webcam_detector,
    heartbeat_webcam_detector,
    get_webcam_detector_status
)

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/detector/start/{session_id}")
async def start_demo_detector(session_id: int, db: Session = Depends(get_db)):
    """Start demo video detector for a session"""
    try:
        # Use the same process_log_fn as the main detector
        from app.services.engagement_service import process_behavior_log
        result = start_demo_video_detector(session_id, process_behavior_log)
        return {"status": result, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detector/stop/{session_id}")
async def stop_demo_detector(session_id: int):
    """Stop demo detector (uses main detector stop function)"""
    result = stop_webcam_detector(session_id)
    return {"status": result, "session_id": session_id}


@router.post("/detector/heartbeat/{session_id}")
async def heartbeat_demo_detector(session_id: int):
    """Send heartbeat to demo detector"""
    result = heartbeat_webcam_detector(session_id)
    return {"status": result, "session_id": session_id}


@router.get("/detector/status/{session_id}")
async def get_demo_detector_status(session_id: int):
    """Get demo detector status"""
    result = get_webcam_detector_status(session_id)
    return {**result, "session_id": session_id}


@router.get("/video/info")
async def get_demo_video_info_endpoint():
    """Get information about the demo video"""
    return get_demo_video_info()


@router.post("/video/reset")
async def reset_demo_video():
    """Reset demo video to beginning"""
    from app.services.demo_detector_service import _reset_demo_video
    _reset_demo_video()
    return {"status": "reset"}


@router.post("/cleanup")
async def cleanup_demo():
    """Clean up demo resources"""
    cleanup_demo_resources()
    return {"status": "cleaned"}
