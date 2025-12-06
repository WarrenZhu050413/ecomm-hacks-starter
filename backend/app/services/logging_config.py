"""Centralized logging configuration using structlog.

Configuration via environment variables:
    LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR). Default: INFO
    LOG_FILE: Path to log file. Default: logs/backend.log (relative to backend dir)
    LOG_FORMAT: Output format (json, console). Default: console for dev, json for prod
    LOG_TO_FILE: Whether to write to file (true/false). Default: true

Usage:
    from app.services.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("message", key="value", another_key=123)
"""

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import structlog
from structlog.typing import EventDict, WrappedLogger

# ============================================================================
# Configuration from environment
# ============================================================================

def _get_log_level() -> int:
    """Get log level from LOG_LEVEL env var."""
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    return getattr(logging, level_name, logging.INFO)


def _get_log_file_path() -> Path | None:
    """Get log file path from LOG_FILE env var.

    Returns None if LOG_TO_FILE is false.
    Default: logs/backend.log relative to backend directory.
    """
    if os.environ.get("LOG_TO_FILE", "true").lower() == "false":
        return None

    log_file = os.environ.get("LOG_FILE")
    if log_file:
        return Path(log_file)

    # Default: backend/logs/backend.log
    backend_dir = Path(__file__).parent.parent.parent
    return backend_dir / "logs" / "backend.log"


def _is_json_format() -> bool:
    """Determine if we should use JSON format.

    Default: console for development, can be overridden with LOG_FORMAT=json
    """
    log_format = os.environ.get("LOG_FORMAT", "").lower()
    if log_format == "json":
        return True
    if log_format == "console":
        return False
    # Default: console for local dev
    return False


# ============================================================================
# Custom processors
# ============================================================================

def add_timestamp(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add ISO timestamp to log events."""
    event_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    return event_dict


def add_service_context(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add service context to all log events."""
    event_dict["service"] = "gemini-backend"
    return event_dict


def truncate_long_values(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Truncate very long string values to prevent log bloat."""
    max_len = 500
    for key, value in event_dict.items():
        if isinstance(value, str) and len(value) > max_len:
            event_dict[key] = value[:max_len] + f"... ({len(value)} chars)"
    return event_dict


# ============================================================================
# Logging setup
# ============================================================================

_configured = False


def setup_logging() -> None:
    """Configure structlog and standard logging.

    Call this once at application startup.
    """
    global _configured
    if _configured:
        return

    log_level = _get_log_level()
    log_file_path = _get_log_file_path()
    use_json = _is_json_format()

    # Ensure log directory exists
    if log_file_path:
        log_file_path.parent.mkdir(parents=True, exist_ok=True)

    # Configure handlers for standard logging
    handlers: list[logging.Handler] = []

    # Console handler (always)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    handlers.append(console_handler)

    # File handler (if enabled)
    if log_file_path:
        file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
        file_handler.setLevel(log_level)
        handlers.append(file_handler)

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        handlers=handlers,
        format="%(message)s",  # structlog handles formatting
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    # Shared processors for all output
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_timestamp,
        add_service_context,
        truncate_long_values,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # Choose renderer based on format
    if use_json:
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(
            colors=True,
            exception_formatter=structlog.dev.plain_traceback,
        )

    # Configure structlog
    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure formatter for stdlib handlers
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    for handler in handlers:
        handler.setFormatter(formatter)

    _configured = True

    # Log startup info
    logger = get_logger(__name__)
    logger.info(
        "logging_configured",
        level=logging.getLevelName(log_level),
        log_file=str(log_file_path) if log_file_path else "disabled",
        format="json" if use_json else "console",
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a structlog logger instance.

    Args:
        name: Logger name, typically __name__ of the calling module.

    Returns:
        A bound structlog logger.

    Example:
        logger = get_logger(__name__)
        logger.info("user_action", user_id=123, action="login")
    """
    # Ensure logging is configured
    if not _configured:
        setup_logging()

    return structlog.get_logger(name)


# ============================================================================
# Context management for request tracing
# ============================================================================

def bind_context(**kwargs) -> None:
    """Bind context variables that will be included in all subsequent logs.

    Useful for request-scoped context like request_id, user_id, etc.

    Example:
        bind_context(request_id="abc123", user_id=456)
        logger.info("processing")  # Will include request_id and user_id
    """
    structlog.contextvars.bind_contextvars(**kwargs)


def clear_context() -> None:
    """Clear all bound context variables.

    Call at the end of a request to prevent context leaking.
    """
    structlog.contextvars.clear_contextvars()


def unbind_context(*keys: str) -> None:
    """Remove specific keys from the bound context."""
    structlog.contextvars.unbind_contextvars(*keys)
