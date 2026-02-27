from datetime import datetime, date
from typing import Tuple

from fastapi import HTTPException, status

from src.models import Usuario


def get_usuario_or_404(user_id: int) -> Usuario:
    usuario = Usuario.get(id=user_id)
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return usuario


def validate_date_range_and_get_bounds(
    fecha_inicio: date,
    fecha_fin: date,
) -> Tuple[datetime, datetime]:
    if fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin no puede ser anterior a la fecha de inicio",
        )

    start_datetime = datetime.combine(fecha_inicio, datetime.min.time())
    end_datetime = datetime.combine(fecha_fin, datetime.max.time())
    return start_datetime, end_datetime

