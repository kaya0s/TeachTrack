from __future__ import annotations

import argparse
from pathlib import Path

import cv2


def parse_args() -> argparse.Namespace:
    desktop = Path.home() / "Desktop"
    parser = argparse.ArgumentParser(
        description="Extract frames from a video every N seconds for dataset creation."
    )
    parser.add_argument(
        "--video",
        type=Path,
        required=True,
        help="Path to input video file.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Seconds between extracted frames (e.g. 2 or 3).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=desktop / "dataset_frames",
        help="Output base directory (default: Desktop/dataset_frames).",
    )
    return parser.parse_args()


def resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else (Path.cwd() / path).resolve()


def main() -> None:
    args = parse_args()

    video_path = resolve_path(args.video)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")
    if args.interval <= 0:
        raise ValueError("--interval must be greater than 0.")

    output_base = resolve_path(args.output)
    output_dir = output_base / video_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        raise RuntimeError("Could not read FPS from video.")

    frame_interval = max(1, int(round(args.interval * fps)))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = total_frames / fps if total_frames > 0 else 0

    saved = 0
    frame_index = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_index % frame_interval == 0:
            timestamp = frame_index / fps
            filename = f"{video_path.stem}_f{frame_index:07d}_t{timestamp:08.2f}s.jpg"
            out_path = output_dir / filename
            cv2.imwrite(str(out_path), frame)
            saved += 1

        frame_index += 1

    cap.release()

    print(f"Video: {video_path}")
    print(f"FPS: {fps:.2f}")
    print(f"Duration: {duration_seconds:.2f}s")
    print(f"Interval: {args.interval}s ({frame_interval} frames)")
    print(f"Saved frames: {saved}")
    print(f"Output folder: {output_dir}")


if __name__ == "__main__":
    main()
