import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    _reserved = {
        'name',
        'msg',
        'args',
        'levelname',
        'levelno',
        'pathname',
        'filename',
        'module',
        'exc_info',
        'exc_text',
        'stack_info',
        'lineno',
        'funcName',
        'created',
        'msecs',
        'relativeCreated',
        'thread',
        'threadName',
        'processName',
        'process',
        'message',
    }

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        extras = {
            key: value
            for key, value in record.__dict__.items()
            if key not in self._reserved and not key.startswith('_')
        }
        if extras:
            payload['context'] = extras
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: str = 'INFO') -> None:
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(JsonFormatter())

    root_logger.addHandler(stream_handler)
    root_logger.setLevel(level.upper())

    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
