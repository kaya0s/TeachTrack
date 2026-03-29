from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import cv2
import requests
from ultralytics import YOLO

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "weights" / "Track_1.0.pt"
DEFAULT_API_BASE = "http://127.0.0.1:8000/api/v1"


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def normalize_api_url(raw_url: str | None) -> str:
    value = (raw_url or "").strip()
    if not value:
        return DEFAULT_API_BASE
    if value.startswith("http://") or value.startswith("https://"):
        return value.rstrip("/")
    if value.startswith("/"):
        return f"http://127.0.0.1:8000{value}".rstrip("/")
    return f"http://{value}".rstrip("/")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run real-time classroom behavior detection and send logs to API."
    )
    parser.add_argument(
        "--session-id", type=int, default=1, help="Active class session ID (default: 1)"
    )
    parser.add_argument(
        "--model",
        type=str,
        default=str(DEFAULT_MODEL_PATH),
        help="Path to YOLO model weights",
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default=os.getenv("DETECTOR_API_URL")
        or os.getenv("API_BASE_URL")
        or os.getenv("API_V1_STR")
        or DEFAULT_API_BASE,
        help="API base URL, e.g. http://127.0.0.1:8000/api/v1",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.5,
        help="Detection confidence threshold (default: 0.5)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=3.0,
        help="Seconds between API log sends (default: 3)",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=_env_int("DETECTION_IMGSZ", 640),
        help="YOLO inference image size (default: DETECTION_IMGSZ env or 640)",
    )
    parser.add_argument(
        "--camera", type=int, default=0, help="Webcam index for OpenCV (default: 0)"
    )
    parser.add_argument(
        "--no-window", action="store_true", help="Disable OpenCV preview window"
    )
    return parser.parse_args()


def run_detection(
    session_id: int,
    model_path: str,
    api_url: str,
    confidence_threshold: float,
    interval_seconds: float,
    inference_imgsz: int,
    camera_index: int,
    show_window: bool,
) -> None:
    print("CAPSTONE CLASSROOM BEHAVIOR DETECTOR v1.0")
    print("---------------------------------------------")

    model_file = Path(model_path).expanduser().resolve()
    if not model_file.exists():
        print(f"ERROR: Model file not found: {model_file}")
        return

    print(f"Session ID: {session_id}")
    print(f"Model: {model_file}")
    print(f"API: {api_url}")
    print(f"Camera: {camera_index}")
    print(f"Confidence threshold: {confidence_threshold}")
    print(f"Send interval: {interval_seconds}s")
    print(f"Inference image size: {inference_imgsz}")

    try:
        model = YOLO(str(model_file))
    except Exception as exc:
        print(f"ERROR: Failed to load model: {exc}")
        return

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"ERROR: Could not open webcam index {camera_index}")
        return

    print("Starting detection loop. Press 'q' in preview window to stop.")
    last_send_time = 0.0
    endpoint = f"{api_url}/sessions/{session_id}/log"

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("ERROR: Failed to read frame from webcam")
                break

            results = model(frame, imgsz=inference_imgsz, verbose=False)

            if show_window:
                annotated = results[0].plot()
                cv2.imshow("Classroom Behavior Detection", annotated)

            current_time = time.time()
            if current_time - last_send_time >= interval_seconds:
                counts = {
                    "on_task": 0,
                    "sleeping": 0,
                    "using_phone": 0,
                    "off_task": 0,
                    "not_visible": 0,
                }

                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    if conf < confidence_threshold:
                        continue

                    class_name = str(model.names[cls_id]).strip()
                    if class_name in counts:
                        counts[class_name] += 1

                try:
                    response = requests.post(endpoint, json=counts, timeout=8)
                    if response.status_code == 200:
                        print(f"OK sent: {counts}")
                    elif response.status_code == 404:
                        print(f"ERROR session {session_id} not found/inactive")
                    else:
                        print(f"ERROR {response.status_code}: {response.text}")
                except requests.RequestException as exc:
                    print(f"ERROR request failed: {exc}")

                last_send_time = current_time

            if show_window and (cv2.waitKey(1) & 0xFF == ord("q")):
                break

    except KeyboardInterrupt:
        print("Stopping detector...")
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    args = parse_args()
    run_detection(
        session_id=args.session_id,
        model_path=args.model,
        api_url=normalize_api_url(args.api_url),
        confidence_threshold=args.confidence,
        interval_seconds=args.interval,
        inference_imgsz=args.imgsz,
        camera_index=args.camera,
        show_window=not args.no_window,
    )
