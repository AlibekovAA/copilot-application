import atexit
import logging
import sys
from logging.handlers import QueueHandler, QueueListener, RotatingFileHandler
from pathlib import Path
from queue import Queue
from typing import Any, Self

from app.core.config import get_settings


class Logger:
    _instance: "Logger | None" = None
    _initialized: bool = False

    def __new__(cls) -> Self:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance  # type: ignore

    def __init__(self) -> None:
        if self._initialized:
            return

        self._initialized = True
        settings = get_settings()

        log_dir = Path(settings.LOG_DIR).resolve()
        log_dir.mkdir(parents=True, exist_ok=True)

        self._logger = logging.getLogger("app")

        level_map = {
            0: logging.DEBUG,
            1: logging.INFO,
            2: logging.WARNING,
            3: logging.ERROR,
            4: logging.CRITICAL,
        }
        log_level = level_map.get(settings.LOG_LEVEL, logging.INFO)

        self._logger.setLevel(log_level)
        self._logger.propagate = False
        self._logger.handlers.clear()

        console_formatter = logging.Formatter(
            fmt="%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(console_formatter)

        file_handler = RotatingFileHandler(
            log_dir / "app.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(console_formatter)

        log_queue: Queue[Any] = Queue(-1)
        self._queue_listener = QueueListener(
            log_queue,
            console_handler,
            file_handler,
            respect_handler_level=True,
        )
        self._queue_listener.start()

        queue_handler = QueueHandler(log_queue)
        self._logger.addHandler(queue_handler)

        atexit.register(self.shutdown)

    def debug(self, msg: str, **kwargs: Any) -> None:
        self._logger.debug(msg, stacklevel=2, **kwargs)

    def info(self, msg: str, **kwargs: Any) -> None:
        self._logger.info(msg, stacklevel=2, **kwargs)

    def warning(self, msg: str, **kwargs: Any) -> None:
        self._logger.warning(msg, stacklevel=2, **kwargs)

    def error(self, msg: str, **kwargs: Any) -> None:
        self._logger.error(msg, stacklevel=2, **kwargs)

    def critical(self, msg: str, **kwargs: Any) -> None:
        self._logger.critical(msg, stacklevel=2, **kwargs)

    def shutdown(self) -> None:
        self._queue_listener.stop()


logger = Logger()
debug = logger.debug
info = logger.info
warning = logger.warning
error = logger.error
critical = logger.critical
