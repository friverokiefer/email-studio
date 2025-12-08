# ia-engine/app/services/text_engine.py
"""Motor de texto para Emails V2 (Banco BICE)."""

from __future__ import annotations

import os  # <--- NUEVO: Para leer variables de entorno
import logging
from typing import List, Dict, Any

from app.models.request import GenerateRequest
from app.models.response import GeneratedVariant, BodyBlock
from app.services.openai_client import chat_json
from app.utils.validators import soft_validate_campaign_cluster
from app.utils.prompts import build_email_prompt

logger = logging.getLogger(__name__)


def _stub_variant(req: GenerateRequest, idx: int, error_detail: str = "") -> GeneratedVariant:
    """Fallback en caso de error."""
    campaign, _ = soft_validate_campaign_cluster(req.campaign, req.cluster)
    debug_msg = f" [Error: {error_detail}]" if error_detail else ""

    return GeneratedVariant(
        id=idx + 1,
        subject=f"{campaign} (Reintentar)",
        preheader="Hubo un problema técnico.",
        body=BodyBlock(
            title="Lo sentimos",
            subtitle="Error de generación",
            content=f"No pudimos generar el texto creativo. Detalle: {debug_msg}"
        ),
        cta="Reintentar"
    )


def _map_json_to_variant(data: Dict[str, Any], index: int) -> GeneratedVariant:
    """Mapea respuesta JSON cruda a modelo Pydantic."""
    if not data:
        raise ValueError("Datos vacíos para mapeo")

    return GeneratedVariant(
        id=index + 1,
        subject=str(data.get("subject", "")).strip(),
        preheader=str(data.get("preheader", "")).strip(),
        body=BodyBlock(
            title=str(data.get("title", "")).strip(),
            subtitle=str(data.get("subtitle", "")).strip() or None,
            content=str(data.get("body", "")
                        or data.get("content", "")).strip(),
        ),
        cta=str(data.get("cta", "Ver más")).strip(),
    )


def generate_sets(request: GenerateRequest) -> List[GeneratedVariant]:
    """
    Orquesta la generación de variantes de texto.
    Usa temperatura dinámica definida en .env (OPENAI_CREATIVE_TEMP).
    """
    campaign, cluster = soft_validate_campaign_cluster(
        request.campaign, request.cluster)

    # Validamos rango seguro de sets (1 a 5)
    total_sets = max(1, min(5, int(getattr(request, "sets", 1))))
    variants = []

    # Leemos la temperatura creativa del entorno (Default: 0.85)
    creative_temp = float(os.getenv("OPENAI_CREATIVE_TEMP", "0.85"))

    # Log con la temperatura real que se usará
    logger.info("Generando %d variantes para '%s' (Temp %.2f)",
                total_sets, campaign, creative_temp)

    for i in range(total_sets):
        try:
            # Construimos los prompts (branding v3.0 incluido)
            system_msg, user_msg = build_email_prompt(
                campaign=campaign,
                cluster=cluster,
                feedback=request.feedback,
                variant_index=i + 1
            )

            # Llamada al cliente con la TEMPERATURA DINÁMICA
            data = chat_json(
                system=system_msg,
                user=user_msg,
                temperature=creative_temp,  # <--- Variable inyectada
                top_p=0.95
            )

            variant = _map_json_to_variant(data, index=i)
            variants.append(variant)

        except Exception as e:  # pylint: disable=broad-exception-caught
            # Capturamos Exception genérica para que un fallo en una variante
            # no bote todo el proceso de generación.
            logger.error("Fallo generando variante %d: %s",
                         i + 1, e, exc_info=True)
            variants.append(_stub_variant(request, i, str(e)))

    return variants


# Alias para exportación
generate_email_sets = generate_sets
__all__ = ["generate_sets", "generate_email_sets"]
