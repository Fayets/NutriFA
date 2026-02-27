from pony.orm import db_session, flush
from pony.orm.core import TransactionIntegrityError
import bcrypt
from fastapi import HTTPException, status

from src.models import Usuario
from src.schemas import UsuarioCreate


class UsuarioService:
    """Service de la entidad Usuario. Lógica y acceso a datos con db_session."""

    @staticmethod
    def _hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def _verify_password(plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

    def crear_usuario(self, data: UsuarioCreate) -> dict:
        """Crea un usuario. Lanza HTTPException si el user ya existe."""
        with db_session:
            try:
                password_hash = self._hash_password(data.password)
                usuario = Usuario(
                    user=data.user,
                    password_hash=password_hash,
                )
                flush()
                return {
                    "id": usuario.id,
                    "user": usuario.user,
                    "created_at": usuario.created_at,
                }
            except TransactionIntegrityError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El nombre de usuario ya está registrado",
                )

    def buscar_usuario_por_id(self, usuario_id: int):
        """Devuelve el Usuario si existe, None si no."""
        with db_session:
            usuario = Usuario.get(id=usuario_id)
            if usuario is None:
                return None
            # Devolver datos serializables para evitar DatabaseSessionIsOver fuera del with
            return {
                "id": usuario.id,
                "user": usuario.user,
                "created_at": usuario.created_at,
            }

    def login_usuario(self, user: str, password: str) -> dict:
        """
        Verifica credenciales. Devuelve dict con id, user, created_at si ok.
        Lanza HTTPException si usuario no existe o contraseña incorrecta.
        """
        with db_session:
            usuario = Usuario.get(user=user)
            if usuario is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario o contraseña incorrectos",
                )
            if not self._verify_password(password, usuario.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario o contraseña incorrectos",
                )
            return {
                "id": usuario.id,
                "user": usuario.user,
                "created_at": usuario.created_at,
            }
