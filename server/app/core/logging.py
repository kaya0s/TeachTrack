import logging
import sys


def configure_logging(level: str = "INFO") -> None:
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
