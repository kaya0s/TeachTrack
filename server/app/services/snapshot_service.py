import hashlib
import io
import time
import logging
from typing import Optional

import httpx
import cv2
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class SnapshotService:
    """Service for capturing and uploading detection snapshots to Cloudinary"""
    
    def __init__(self):
        self.cloud_name = settings.CLOUDINARY_CLOUD_NAME
        self.api_key = settings.CLOUDINARY_API_KEY
        self.api_secret = settings.CLOUDINARY_API_SECRET
        self._is_configured = bool(self.cloud_name and self.api_key and self.api_secret)
        
        if not self._is_configured:
            logger.warning("Cloudinary is not configured. Snapshot upload will be disabled.")
    
    def is_configured(self) -> bool:
        """Check if Cloudinary is properly configured"""
        return self._is_configured
    
    def capture_frame_as_bytes(self, frame: np.ndarray, quality: int = 85) -> Optional[bytes]:
        """
        Convert OpenCV frame to bytes for upload
        
        Args:
            frame: OpenCV image array (BGR format)
            quality: JPEG compression quality (0-100)
            
        Returns:
            Image bytes or None if encoding fails
        """
        try:
            # Resize frame to reduce upload size and processing time
            # Max dimensions for faster uploads
            max_dimension = 1280
            height, width = frame.shape[:2]
            
            if max(height, width) > max_dimension:
                # Calculate new dimensions maintaining aspect ratio
                if height > width:
                    new_height = max_dimension
                    new_width = int(width * (max_dimension / height))
                else:
                    new_width = max_dimension
                    new_height = int(height * (max_dimension / width))
                
                frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            # Encode frame to JPEG bytes with optimized settings
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            result, encoded_img = cv2.imencode('.jpg', frame, encode_param)
            
            if not result:
                logger.error("Failed to encode frame to JPEG")
                return None
                
            return encoded_img.tobytes()
        except Exception as e:
            logger.error(f"Error capturing frame as bytes: {e}")
            return None
    
    async def upload_snapshot(
        self, 
        frame: np.ndarray, 
        session_id: int, 
        alert_type: str = "phone",
        timestamp: Optional[int] = None
    ) -> Optional[str]:
        """
        Upload a detection snapshot to Cloudinary
        
        Args:
            frame: OpenCV image array (BGR format)
            session_id: Session ID for folder organization
            alert_type: Type of alert (phone, sleeping, etc.)
            timestamp: Optional timestamp for unique filename
            
        Returns:
            Secure URL of uploaded image or None if upload fails
        """
        if not self._is_configured:
            logger.warning("Cannot upload snapshot: Cloudinary not configured")
            return None
            
        # Convert frame to bytes
        image_bytes = self.capture_frame_as_bytes(frame)
        if not image_bytes:
            logger.error("Cannot upload snapshot: Failed to capture frame")
            return None
        
        # Generate unique filename
        if timestamp is None:
            timestamp = int(time.time())
            
        folder = f"teachtrack/detections/session_{session_id}"
        public_id = f"{alert_type}_{session_id}_{timestamp}"
        
        # Generate signature
        signature_payload = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{self.api_secret}"
        signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()
        
        # Upload to Cloudinary
        upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/image/upload"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    upload_url,
                    data={
                        "api_key": self.api_key,
                        "timestamp": timestamp,
                        "folder": folder,
                        "public_id": public_id,
                        "signature": signature,
                    },
                    files={
                        "file": (f"{public_id}.jpg", image_bytes, "image/jpeg")
                    },
                )
                
                if response.status_code >= 400:
                    logger.error(f"Cloudinary upload failed: {response.status_code} - {response.text}")
                    return None
                    
                payload = response.json()
                secure_url = payload.get("secure_url")
                
                if not secure_url:
                    logger.error("Cloudinary response missing secure_url")
                    return None
                    
                logger.info(f"Snapshot uploaded successfully: {secure_url}")
                return secure_url
                
        except Exception as e:
            logger.error(f"Error uploading snapshot to Cloudinary: {e}")
            return None
    
    async def upload_snapshot_with_detections(
        self, 
        frame: np.ndarray, 
        detections: list[dict],
        session_id: int,
        alert_type: str = "phone",
        timestamp: Optional[int] = None
    ) -> Optional[str]:
        """
        Upload a snapshot with detection annotations drawn on it
        
        Args:
            frame: OpenCV image array (BGR format)
            detections: List of detection dictionaries with bounding boxes
            session_id: Session ID for folder organization
            alert_type: Type of alert
            timestamp: Optional timestamp
            
        Returns:
            Secure URL of uploaded image or None if upload fails
        """
        if not detections:
            # If no detections, upload original frame
            return await self.upload_snapshot(frame, session_id, alert_type, timestamp)
        
        try:
            # Create a copy to draw annotations
            annotated_frame = frame.copy()
            
            # Draw detection boxes and labels
            for detection in detections:
                bbox = detection.get('bbox', [])  # [x1, y1, x2, y2]
                label = detection.get('label', 'Unknown')
                confidence = detection.get('confidence', 0.0)
                
                if len(bbox) == 4:
                    x1, y1, x2, y2 = map(int, bbox)
                    
                    # Draw rectangle
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    
                    # Draw label
                    label_text = f"{label}: {confidence:.2f}"
                    label_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    
                    # Label background
                    cv2.rectangle(
                        annotated_frame, 
                        (x1, y1 - label_size[1] - 10), 
                        (x1 + label_size[0], y1), 
                        (0, 0, 255), 
                        -1
                    )
                    
                    # Label text
                    cv2.putText(
                        annotated_frame, 
                        label_text, 
                        (x1, y1 - 5), 
                        cv2.FONT_HERSHEY_SIMPLEX, 
                        0.5, 
                        (255, 255, 255), 
                        2
                    )
            
            # Add timestamp watermark
            if timestamp is None:
                timestamp = int(time.time())
            time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp))
            cv2.putText(
                annotated_frame,
                f"TeachTrack Detection - {time_str}",
                (10, annotated_frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )
            
            return await self.upload_snapshot(annotated_frame, session_id, alert_type, timestamp)
            
        except Exception as e:
            logger.error(f"Error creating annotated snapshot: {e}")
            # Fallback to original frame
            return await self.upload_snapshot(frame, session_id, alert_type, timestamp)


# Global instance
snapshot_service = SnapshotService()
