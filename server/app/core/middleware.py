import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

from app.services.admin import settings_service
from app.core.request_context import set_request, reset_request

logger = logging.getLogger("app.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_token = set_request(request)
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                f"{request.method} {request.url.path} -> 500 ({duration_ms:.2f}ms)",
                extra={"request_id": request_id},
            )
            raise
        finally:
            reset_request(request_token)

        duration_ms = (time.perf_counter() - start) * 1000
        if settings_service.is_admin_log_stream_enabled():
            logger.info(
                f"{request.method} {request.url.path} -> {status_code} ({duration_ms:.2f}ms)",
                extra={"request_id": request_id},
            )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response
