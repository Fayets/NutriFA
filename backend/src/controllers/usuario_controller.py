from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from src.schemas import UsuarioCreate, UsuarioLogin, BaseAPIResponse
from src.services.usuario_service import UsuarioService
from src.auth import get_current_user, create_access_token
from src.utils.responses import respuesta_ok, respuesta_error

router = APIRouter(tags=["Usuario"])
service = UsuarioService()


@router.post("/register", response_model=BaseAPIResponse)
def register(body: UsuarioCreate):
    """Registra un nuevo usuario."""
    try:
        data = service.crear_usuario(body)
        return respuesta_ok("Usuario registrado correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.post("/login", response_model=BaseAPIResponse)
def login(body: UsuarioLogin):
    """Login: devuelve access_token para usar en Authorization: Bearer <token>."""
    try:
        usuario = service.login_usuario(body.user, body.password)
        token = create_access_token(data={"sub": str(usuario["id"])})
        return respuesta_ok(
            "Login correcto",
            {
                "access_token": token,
                "token_type": "bearer",
                "usuario": usuario,
            },
        )
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/me", response_model=BaseAPIResponse)
def me(current_user=Depends(get_current_user)):
    """Devuelve el usuario autenticado (requiere Bearer token)."""
    try:
        return respuesta_ok("OK", current_user)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)
