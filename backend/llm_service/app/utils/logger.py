import atexit
import logging
import sys
import tempfile
from logging.handlers import QueueHandler, QueueListener, RotatingFileHandler
from pathlib import Path
from queue import Full, Queue
from threading import Lock
from typing import Any

from app.core.config import get_settings


class BoundedQueueHandler(QueueHandler):
    def __init__(self, queue: Queue[logging.LogRecord | None], handlers: tuple[logging.Handler, ...]) -> None:
        super().__init__(queue)
        self.handlers = handlers
        self.active = True

    def enqueue(self, record: logging.LogRecord) -> None:
        if self.active:
            try:
                self.queue.put_nowait(record)
                return
            except Full:
                pass
        for handler in self.handlers:
            if record.levelno >= handler.level:
                handler.handle(record)


class BoundedQueueListener(QueueListener):
    def __init__(self, queue: Queue[logging.LogRecord | None], *handlers: logging.Handler) -> None:
        self._bounded_queue = queue
        super().__init__(queue, *handlers, respect_handler_level=True)

    def enqueue_sentinel(self) -> None:
        self._bounded_queue.put(None)


class Logger:
    _instance: "Logger | None" = None
    _initialized: bool = False

    def __new__(cls) -> "Logger":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        settings = get_settings()
        log_dir = Path(settings.LOG_DIR).resolve()
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            log_dir = Path(tempfile.gettempdir()) / "app_logs"
            log_dir.mkdir(parents=True, exist_ok=True)

        self._logger = logging.getLogger("app")
        levels = (logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL)
        level = levels[settings.LOG_LEVEL]
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler = logging.StreamHandler(sys.stdout)
        file_handler = RotatingFileHandler(
            log_dir / "app.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        self._handlers = (console_handler, file_handler)
        for handler in self._handlers:
            handler.setLevel(level)
            handler.setFormatter(formatter)
        log_queue: Queue[logging.LogRecord | None] = Queue(settings.LOG_QUEUE_SIZE)
        self._queue_handler = BoundedQueueHandler(log_queue, self._handlers)
        self._queue_handler.setLevel(level)
        self._queue_listener = BoundedQueueListener(log_queue, *self._handlers)
        self._logger.handlers = [self._queue_handler]
        self._logger.setLevel(level)
        self._logger.propagate = False
        root = logging.getLogger()
        root.handlers = [self._queue_handler]
        root.setLevel(level)
        for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
            server_logger = logging.getLogger(name)
            server_logger.handlers.clear()
            server_logger.propagate = True
            server_logger.setLevel(level)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO if settings.debug else logging.WARNING)
        self._shutdown_lock = Lock()
        self._stopped = False
        self._queue_listener.start()
        self._initialized = True
        atexit.register(self.shutdown)

    def debug(self, msg: str, *args: object, **kwargs: Any) -> None:
        self._logger.debug(msg, *args, stacklevel=2, **kwargs)

    def info(self, msg: str, *args: object, **kwargs: Any) -> None:
        self._logger.info(msg, *args, stacklevel=2, **kwargs)

    def warning(self, msg: str, *args: object, **kwargs: Any) -> None:
        self._logger.warning(msg, *args, stacklevel=2, **kwargs)

    def error(self, msg: str, *args: object, **kwargs: Any) -> None:
        self._logger.error(msg, *args, stacklevel=2, **kwargs)

    def shutdown(self) -> None:
        with self._shutdown_lock:
            if self._stopped:
                return
            self._queue_handler.acquire()
            try:
                self._queue_handler.active = False
            finally:
                self._queue_handler.release()
            self._queue_listener.stop()
            self._stopped = True


log = Logger()
