from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.db import db
from pony.orm import *
from fastapi import FastAPI

# Importar modelos antes de generate_mapping para que Pony registre las entidades
import src.models  # noqa: F401

app = FastAPI()

# Mapeando las entidades a tablas (si no existe la tabla, la crea)
db.generate_mapping(create_tables=True)


app.add_middleware(
    CORSMiddleware,
    # Permitimos todas las origins para simplificar el despliegue
    # (el frontend usa tokens Bearer en cabeceras, no cookies).
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lista de Rutas
from src.controllers.usuario_controller import router as usuario_router
from src.controllers.settings_controller import router as settings_router
from src.controllers.food_controller import router as food_router
from src.controllers.dashboard_controller import router as dashboard_router
from src.controllers.meal_controller import router as meal_router
from src.controllers.health_controller import router as health_router

app.include_router(usuario_router)
app.include_router(settings_router)
app.include_router(food_router)
app.include_router(dashboard_router)
app.include_router(meal_router)
app.include_router(health_router)

# Personalizar el esquema de seguridad en OpenAPI para usar Bearer tokens
_HTTP_METHODS = ("get", "post", "put", "delete", "patch", "head", "options", "trace")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = app._original_openapi()
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path_item in openapi_schema.get("paths", {}).values():
        if not isinstance(path_item, dict):
            continue
        for method_name in _HTTP_METHODS:
            op = path_item.get(method_name)
            if isinstance(op, dict):
                op["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Guardamos la referencia original del método openapi
app._original_openapi = app.openapi
# Reemplazamos el método openapi por nuestra función personalizada
app.openapi = custom_openapi