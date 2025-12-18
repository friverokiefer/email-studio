# ia-engine/app/services/openai_client.py
"""Cliente OpenAI de bajo nivel para el IA Engine (Banco BICE).

Responsabilidad:
- Cargar configuración desde variables de entorno / .env.
- Crear un cliente OpenAI.
- Exponer chat_json(system, user, **kwargs).
- Validar qué modelo está respondiendo realmente (Log de auditoría).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from openai import OpenAI

logger = logging.getLogger(__name__)

# =========================
# Configuración base
# =========================

MODEL_JSON = (
    os.getenv("OPENAI_MODEL_EMAIL")
    or os.getenv("OPENAI_TEXT_JSON")
    or "gpt-4o"
)

# ✅ CAMBIOS: Timeouts aumentados para operaciones largas
DEFAULT_TEMP = float(os.getenv("OPENAI_TEXT_TEMP", "0.7"))
DEFAULT_TOP_P = float(os.getenv("OPENAI_TEXT_TOP_P", "0.9"))
DEFAULT_MAX_TOKENS = int(os.getenv("OPENAI_TEXT_MAX_TOKENS", "1000"))
REQUEST_TIMEOUT = float(
    os.getenv("OPENAI_REQUEST_TIMEOUT", "120"))  # ✅ 45s → 120s
MAX_RETRIES = int(os.getenv("OPENAI_MAX_RETRIES", "3"))  # ✅ 2 → 3 reintentos

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is not None:
        return _client

    api_key = (
        os.getenv("OPENAI_API_KEY")
        or os.getenv("OPENAI_APIKEY")
        or os.getenv("OPENAI_TOKEN")
    )
    if not api_key:
        logger.warning("IA-Engine: OPENAI_API_KEY no está configurada")

    base_url = (
        os.getenv("OPENAI_BASE_URL")
        or os.getenv("OPENAI_API_BASE")
        or os.getenv("OPENAI_ENDPOINT")
    )

    try:
        # ✅ CAMBIO: Timeout del cliente aumentado de 60s → 180s
        client_timeout = float(os.getenv("OPENAI_CLIENT_TIMEOUT", "180"))
    except ValueError:
        client_timeout = 180.0

    kwargs: Dict[str, Any] = {
        "api_key": api_key,
        "timeout": client_timeout,
        "max_retries": 0,  # Control manual
    }

    if base_url:
        kwargs["base_url"] = base_url

    _client = OpenAI(**kwargs)
    logger.info(
        "IA-Engine: cliente OpenAI inicializado (target=%s, timeout=%ds)",
        MODEL_JSON,
        int(client_timeout)
    )
    return _client


def chat_json(
    system: str,
    user: str,
    model: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Llama a Chat Completions esperando un JSON.
    Acepta kwargs (temperature, top_p, timeout) para override dinámico.
    """
    client = _get_client()

    # Prioridad: Kwargs > Argumento > Default Env
    m = model or MODEL_JSON
    t = kwargs.get("temperature", DEFAULT_TEMP)
    p = kwargs.get("top_p", DEFAULT_TOP_P)
    mt = kwargs.get("max_tokens", DEFAULT_MAX_TOKENS)
    to = kwargs.get("timeout", REQUEST_TIMEOUT)

    last_err: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.debug(
                "IA-Engine: OpenAI Call (model=%s, temp=%.2f, timeout=%ds, attempt=%d/%d)",
                m, t, int(to), attempt, MAX_RETRIES
            )

            resp = client.chat.completions.create(
                model=m,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=t,
                top_p=p,
                max_tokens=mt,
                response_format={"type": "json_object"},
                timeout=to,
            )

            if not resp.choices:
                raise RuntimeError("IA-Engine: respuesta sin choices")

            # Validación de modelo real
            used_model = resp.model
            logger.info(
                "✅ OpenAI Success: Modelo usado: %s (tokens: prompt=%s, completion=%s)",
                used_model,
                resp.usage.prompt_tokens if resp.usage else "?",
                resp.usage.completion_tokens if resp.usage else "?"
            )

            content = resp.choices[0].message.content or "{}"
            try:
                data = json.loads(content)
            except json.JSONDecodeError as exc:
                logger.error("IA-Engine: contenido no es JSON válido: %s", exc)
                raise

            return data

        except Exception as exc:
            last_err = exc
            logger.warning(
                "IA-Engine: Error OpenAI (attempt %d/%d): %s",
                attempt, MAX_RETRIES, str(exc)[:200]
            )
            if attempt >= MAX_RETRIES:
                break

    msg = f"IA-Engine: Falló llamada a OpenAI tras {MAX_RETRIES} intentos"
    logger.error("%s. Último error: %s", msg, str(last_err)[:300])
    raise RuntimeError(msg) from last_err


__all__ = ["chat_json", "MODEL_JSON"]
