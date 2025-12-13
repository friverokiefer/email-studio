# ia-engine/app/models/request.py
"""Modelos de request para el motor de IA de Emails V2.

A nivel de negocio hablamos de *sets de contenido*:
cada set = {subject, preheader, title, subtitle, body, cta}.
"""

from typing import Optional, Any

from pydantic import BaseModel, Field


class EmailFeedback(BaseModel):
    """
    Feedback opcional desde el usuario para refinar la variante.

    Estos hints vienen desde el front/backend JS y se usan para ajustar
    el copy manteniendo coherencia con campaña/cluster.
    """

    subject: Optional[str] = Field(
        default=None,
        description="Hint de asunto entregado por el usuario.",
    )
    preheader: Optional[str] = Field(
        default=None,
        description="Hint de preheader entregado por el usuario.",
    )
    bodyContent: Optional[str] = Field(
        default=None,
        description="Hint de body entregado por el usuario (texto plano).",
    )
    body: Optional[str] = Field(
        default=None,
        description="Compatibilidad para payloads legacy donde venía 'body' plano.",
    )


class GenerateRequest(BaseModel):
    """
    Request para el endpoint /ia/generate.

    Mapea 1:1 con lo que necesitamos desde el backend Node:
    - engine   → nombre lógico del motor (por ahora 'openai').
    - campaign → campaña (ej: 'Crédito de consumo - Persona').
    - cluster  → cluster/segmento (driver_asunto).
    - sets     → CANTIDAD DE SETS de contenido a generar.
    - feedback → hints opcionales del usuario.
    """

    engine: str = Field(
        default="openai",
        description="Motor de IA a utilizar (por ahora solo 'openai').",
    )

    campaign: str = Field(
        ...,
        description="Campaña (ej: 'Crédito de consumo - Persona', 'DAP (Depósito a plazo)', etc.).",
    )

    cluster: str = Field(
        ...,
        description="Cluster/driver definido para la campaña (segmento/driver comercial).",
    )

    sets: int = Field(
        default=1,
        ge=1,
        le=5,
        description=(
            "Cantidad de SETS de contenido a generar (1..5). "
            "Cada set incluye subject, preheader, title, subtitle, body, cta."
        ),
    )

    # [NUEVO] Campo para controlar la creatividad
    temperature: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=2.0,
        description="Nivel de creatividad (0.0 = determinista, 1.0 = creativo/balanceado).",
    )

    feedback: Optional[EmailFeedback] = Field(
        default=None,
        description="Feedback opcional del usuario (subject/preheader/bodyContent/body).",
    )

    # Helpers por si quieres usar un estilo fluido en el futuro

    def with_sets(self, sets: int) -> "GenerateRequest":
        """
        Helper opcional para pipelines internos:
        ajusta la cantidad de sets y devuelve self.
        """
        self.sets = sets
        return self


class ImagePromptRequest(BaseModel):
    """
    Request para solicitar la construcción de un prompt de imagen (Prompt as a Service).
    Centraliza las reglas de branding visual en Python.
    """
    campaign: str = Field(..., description="Nombre de la campaña")
    cluster: str = Field(..., description="Nombre del cluster/segmento")
    feedback: Optional[Any] = Field(
        None, description="Feedback o 'hint' visual del usuario")
