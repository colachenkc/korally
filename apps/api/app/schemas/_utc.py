from datetime import datetime, timezone


def serialize_utc(dt: datetime | None) -> str | None:
    """SQLite drops tz info; we always write UTC so tag naive datetimes back as UTC on output."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
