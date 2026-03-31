import logging

from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.db import models  # noqa: F401

logger = logging.getLogger(__name__)
settings = get_settings()


def init_db() -> None:
    if engine.dialect.name == 'postgresql':
        try:
            with engine.begin() as connection:
                connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        except Exception:
            logger.warning('Could not create pgvector extension; continuing startup.')

    Base.metadata.create_all(bind=engine)
    _ensure_user_auth_columns()

    if engine.dialect.name == 'postgresql':
        try:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        'CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding_ivfflat '
                        'ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) '
                        f'WITH (lists = {settings.vector_ivfflat_lists})'
                    )
                )
                connection.execute(
                    text(
                        'CREATE INDEX IF NOT EXISTS ix_symptom_records_embedding_ivfflat '
                        'ON symptom_records USING ivfflat (embedding vector_cosine_ops) '
                        f'WITH (lists = {settings.vector_ivfflat_lists})'
                    )
                )
        except Exception:
            logger.warning('Could not create pgvector ANN indexes; continuing startup.')


def _ensure_user_auth_columns() -> None:
    inspector = inspect(engine)
    if 'users' not in inspector.get_table_names():
        return

    existing_columns = {column['name'] for column in inspector.get_columns('users')}
    alter_statements: list[str] = []
    is_postgres = engine.dialect.name == 'postgresql'

    bool_false = 'FALSE' if is_postgres else '0'
    bool_true = 'TRUE' if is_postgres else '1'
    ts_type = 'TIMESTAMPTZ' if is_postgres else 'DATETIME'
    ts_default = 'NOW()' if is_postgres else 'CURRENT_TIMESTAMP'

    if 'username' not in existing_columns:
        alter_statements.append('ALTER TABLE users ADD COLUMN username VARCHAR(50)')

    if 'password_hash' not in existing_columns:
        alter_statements.append('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)')

    if 'is_google_user' not in existing_columns:
        alter_statements.append(
            f'ALTER TABLE users ADD COLUMN is_google_user BOOLEAN NOT NULL DEFAULT {bool_false}'
        )

    if 'role' not in existing_columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'patient'")

    if 'is_active' not in existing_columns:
        alter_statements.append(
            f'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT {bool_true}'
        )

    if 'created_at' not in existing_columns:
        alter_statements.append(
            f'ALTER TABLE users ADD COLUMN created_at {ts_type} NOT NULL DEFAULT {ts_default}'
        )

    if 'updated_at' not in existing_columns:
        alter_statements.append(
            f'ALTER TABLE users ADD COLUMN updated_at {ts_type} NOT NULL DEFAULT {ts_default}'
        )

    if alter_statements:
        with engine.begin() as connection:
            for statement in alter_statements:
                connection.execute(text(statement))

    with engine.begin() as connection:
        if 'password' in existing_columns:
            connection.execute(
                text(
                    'UPDATE users SET password_hash = password '
                    'WHERE password_hash IS NULL AND password IS NOT NULL'
                )
            )
        connection.execute(text("UPDATE users SET role = 'patient' WHERE role IS NULL OR role = ''"))
        connection.execute(text(f'UPDATE users SET is_active = {bool_true} WHERE is_active IS NULL'))
        connection.execute(text(f'UPDATE users SET is_google_user = {bool_false} WHERE is_google_user IS NULL'))
        connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)'))
        connection.execute(text('CREATE INDEX IF NOT EXISTS ix_users_is_google_user ON users (is_google_user)'))
        connection.execute(text('CREATE INDEX IF NOT EXISTS ix_users_role ON users (role)'))
        connection.execute(text('CREATE INDEX IF NOT EXISTS ix_users_is_active ON users (is_active)'))


if __name__ == '__main__':
    init_db()
    print('Database tables initialized.')
