import logging
import sys
import threading
from collections import deque
from datetime import datetime, timezone
from typing import Any

_MAX_BUFFER_SIZE = 1000
_log_buffer: deque[dict[str, Any]] = deque(maxlen=_MAX_BUFFER_SIZE)
_buffer_lock = threading.Lock()


class InMemoryLogBufferHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "source": record.name,
                "request_id": getattr(record, "request_id", "-"),
                "message": record.getMessage(),
            }
            with _buffer_lock:
                _log_buffer.append(entry)
        except Exception:
            # Never break application flow due to logging side-effects.
            self.handleError(record)


def get_recent_server_logs(limit: int = 120) -> list[dict[str, Any]]:
    capped_limit = max(1, min(limit, 500))
    with _buffer_lock:
        snapshot = list(_log_buffer)
    return snapshot[-capped_limit:]

def configure_logging(level: str = "INFO", enable_admin_log_stream: bool = True) -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())

    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)
    if enable_admin_log_stream:
        root.addHandler(InMemoryLogBufferHandler())


class RequestIdFilter(logging.Filter):
    def __init__(self, default_request_id: str = "-") -> None:
        super().__init__()
        self.default_request_id = default_request_id

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = self.default_request_id
        return True


def bind_request_id(logger: logging.Logger, request_id: str) -> logging.LoggerAdapter:
    return logging.LoggerAdapter(logger, extra={"request_id": request_id})
