# ia-engine/app/routers/generate.py
"""Rutas principales del motor de IA (generación de contenidos)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.request import GenerateRequest, ImagePromptRequest
from app.models.response import GenerateResponse
from app.services.text_engine import generate_sets
# <--- Importamos la lógica de branding
from app.utils.prompts import build_image_prompt

router: APIRouter = APIRouter()


class ImagePromptResponse(BaseModel):
    """Respuesta simple con el prompt construido."""
    prompt: str


@router.post("/generate", response_model=GenerateResponse)
def generate_content(payload: GenerateRequest) -> GenerateResponse:
    """
    Endpoint principal del motor de IA (Texto).

    - Recibe: engine, campaign, cluster, sets, feedback.
    - Devuelve: una lista de sets de contenido y metadatos con los prompts usados.
    """
    try:
        # <--- Desempaquetamos la tupla (variants, debug_prompts)
        variants, debug_prompts = generate_sets(payload)
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(e))

    return GenerateResponse(
        engine=payload.engine,
        variants=variants,
        metadata={
            "message": "IA Engine OK (OpenAI)",
            "sets": len(variants),
            "prompts_debug": debug_prompts,  # Exponemos los prompts en metadata
        },
    )


@router.post("/image-prompt", response_model=ImagePromptResponse)
def generate_image_prompt_endpoint(payload: ImagePromptRequest) -> ImagePromptResponse:
    """
    Devuelve el prompt de imagen construido con las reglas de Branding (Python).
    No genera la imagen, solo entrega la 'receta' para que el Backend la ejecute.
    """
    try:
        # Aquí usamos la función que YA TIENE todas las reglas de branding.py
        prompt_text = build_image_prompt(
            campaign=payload.campaign,
            cluster=payload.cluster,
            feedback=payload.feedback
        )
        return ImagePromptResponse(prompt=prompt_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
