from datetime import datetime
from pony.orm import db_session, flush
from pony.orm.core import TransactionIntegrityError, MultipleObjectsFoundError
from fastapi import HTTPException, status

from src.models import Usuario, UserSettings
from src.schemas import SettingsCreate, SettingsUpdate


class UserSettingsService:
    @staticmethod
    def _serialize(usuario: Usuario, settings: UserSettings) -> dict:
        return {
            "id": settings.id,
            "user_id": usuario.id,
            "metabolism_base": settings.metabolism_base,
            "protein_target": settings.protein_target,
            "carbs_target": settings.carbs_target,
            "fat_target": settings.fat_target,
            "updated_at": settings.updated_at,
        }

    def crear_settings(self, user_id: int, data: SettingsCreate) -> dict:
        with db_session:
            usuario = Usuario.get(id=user_id)
            if usuario is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            settings = usuario.settings
            if settings is None:
                # Crear nueva configuración
                settings = UserSettings(
                    user=usuario,
                    metabolism_base=data.metabolism_base or 1770,
                    protein_target=data.protein_target,
                    carbs_target=data.carbs_target,
                    fat_target=data.fat_target,
                )
                flush()  # asegurarnos de tener id asignado
            else:
                # Si ya existe, la actualizamos con los datos recibidos
                settings.metabolism_base = (
                    data.metabolism_base or settings.metabolism_base or 1770
                )
                settings.protein_target = data.protein_target
                settings.carbs_target = data.carbs_target
                settings.fat_target = data.fat_target
                settings.updated_at = datetime.now()

            return self._serialize(usuario, settings)

    def obtener_settings(self, user_id: int) -> dict:
        with db_session:
            usuario = Usuario.get(id=user_id)
            if usuario is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            settings = usuario.settings
            if settings is None:
                # No hay configuración para este usuario
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Configuración no encontrada para este usuario",
                )

            return self._serialize(usuario, settings)

    def actualizar_settings(self, user_id: int, data: SettingsUpdate) -> dict:
        with db_session:
            usuario = Usuario.get(id=user_id)
            if usuario is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            settings = usuario.settings
            if settings is None:
                # Si no existe configuración, la creamos (upsert)
                settings = UserSettings(
                    user=usuario,
                    metabolism_base=data.metabolism_base or 1770,
                    protein_target=data.protein_target,
                    carbs_target=data.carbs_target,
                    fat_target=data.fat_target,
                )
                flush()
            else:
                # Actualizar solo los campos proporcionados
                if data.metabolism_base is not None:
                    settings.metabolism_base = data.metabolism_base
                if data.protein_target is not None:
                    settings.protein_target = data.protein_target
                if data.carbs_target is not None:
                    settings.carbs_target = data.carbs_target
                if data.fat_target is not None:
                    settings.fat_target = data.fat_target

            settings.updated_at = datetime.now()

            return self._serialize(usuario, settings)
