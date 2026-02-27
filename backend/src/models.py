from pony.orm import *
from datetime import datetime, date
from enum import Enum
from .db import db


# ======================
# USUARIO
# ======================

class Usuario(db.Entity):
    id = PrimaryKey(int, auto=True)
    user = Required(str, unique=True)
    password_hash = Required(str)
    created_at = Required(datetime, default=lambda: datetime.now())
    settings = Optional("UserSettings")
    meals = Set("Meal")
    foods_created = Set("Food")


# ======================
# CONFIGURACIÓN METABÓLICA
# ======================

class UserSettings(db.Entity):
    id = PrimaryKey(int, auto=True)
    user = Required(Usuario)
    metabolism_base = Required(int, default=1770)

    protein_target = Optional(int)
    carbs_target = Optional(int)
    fat_target = Optional(int)

    updated_at = Required(datetime, default=lambda: datetime.now())


# ======================
# ALIMENTOS
# ======================

class Food(db.Entity):
    id = PrimaryKey(int, auto=True)

    name = Required(str)

    calories_per_100g = Required(float)
    protein_per_100g = Required(float)
    carbs_per_100g = Required(float)
    fat_per_100g = Required(float)

    barcode = Optional(str, unique=True)

    created_by = Optional(Usuario)
    created_at = Required(datetime, default=lambda: datetime.now())

    meals = Set("Meal")


# ======================
# REGISTRO DE COMIDA
# ======================

class Meal(db.Entity):
    id = PrimaryKey(int, auto=True)

    user = Required(Usuario)
    food = Required(Food)

    quantity_grams = Required(float)

    calories = Required(float)
    protein = Required(float)
    carbs = Required(float)
    fat = Required(float)

    consumed_at = Required(datetime, default=lambda: datetime.now())