# ia-engine/app/utils/prompts.py
"""Construcción de prompts para el motor de texto e imagen."""

from __future__ import annotations
import json
from typing import Tuple, Any

from app.utils.branding import (
    BICE_TEXT_TONE,
    BICE_TEXT_CONSTRAINTS,
    BICE_TEXT_STRUCTURE_BASE,
    BICE_VISUAL_IDENTITY,
    BICE_DEMOGRAPHIC_BASE,
    BICE_GRAPHIC_OVERLAY
)
from app.utils.campaigns import normalize_campaign
from app.utils.clusters import describe_cluster
from app.utils.copy_meta import BENEFITS, CTAS

# --- REGLAS TÉCNICAS ---
LENGTHS_EMAIL = (
    "LÍMITES TÉCNICOS:\n"
    "- Subject: 35-50 caracteres (Visible en móvil).\n"
    "- Preheader: 50-80 caracteres.\n"
    "- Title: 20-45 caracteres.\n"
    "- Subtitle: 80-120 caracteres.\n"
    "- Body: Longitud adaptable según estructura seleccionada.\n"
    "- CTA: 2-4 palabras."
)

PRODUCT_RULES = (
    "REGLAS DE PRODUCTO:\n"
    "- Usa placeholders exactos: '%%MONTO%%', '%%NOMBRE%%' si aplica.\n"
    "- Enfatiza '100% online' y 'Aprobación rápida'."
)


def _json_only_clause() -> str:
    """
    Instrucción crítica que ahora PROHIBE negritas (**) y permite SÓLO listas (-).
    """
    return (
        "IMPORTANTE: Tu respuesta debe ser UNICAMENTE un objeto JSON válido raw. "
        "NO uses bloques de código (```json ... ```). "
        "DENTRO de los campos de texto (body), USA SOLO formato de Markdown para listas con guiones (-). "
        "PROHIBIDO: No uses negritas (**) ni cursivas (*)."
    )


# [Otras funciones auxiliares como _extract_feedback_text, _extract_visual_feedback, _detect_subject_age se mantienen sin cambios]
def _extract_feedback_text(feedback: Any) -> str:
    if not feedback:
        return ""
    try:
        if isinstance(feedback, str):
            return feedback.strip()
        parts = []
        if isinstance(feedback, dict):
            if f := feedback.get("subject"):
                parts.append(f"Subject Idea: {f}")
            if f := feedback.get("bodyContent") or feedback.get("body"):
                parts.append(f"Content Focus: {f}")
        else:
            if getattr(feedback, "subject", None):
                parts.append(f"Subject Idea: {feedback.subject}")
            if getattr(feedback, "bodyContent", None):
                parts.append(f"Content Focus: {feedback.bodyContent}")
        return " | ".join(parts)
    except:
        return str(feedback)


def _extract_visual_feedback(feedback: Any) -> str | None:
    if not feedback:
        return None
    try:
        text = ""
        if isinstance(feedback, str):
            text = feedback
        elif isinstance(feedback, dict):
            text = feedback.get("bodyContent") or feedback.get("body") or ""
        else:
            text = getattr(feedback, "bodyContent", None) or getattr(
                feedback, "body", None) or ""

        if text and len(text) > 5:
            return text
        return None
    except:
        return None


def _get_consistent_structure(campaign: str) -> str:
    """
    Define la estructura con 'Creatividad Controlada' y más flexibilidad para omitir listas.
    """
    camp_lower = campaign.lower()

    # GRUPO 1: Productos Complejos / Serios (Inversiones, Hipotecarios, etc)
    complex_products = ["inversión", "fondo",
                        "hipotecario", "dap", "vida", "seguro"]

    if any(x in camp_lower for x in complex_products):
        return (
            "ESTILO DE CUERPO: 'Profesional Flexible'.\n"
            "Estructura Sugerida: Intro empática + CUERPO ADAPTABLE + Cierre con CTA.\n"
            "OPCIONES PARA EL CUERPO (Elige la mejor para este texto):\n"
            "A) Lista de 3 a 5 puntos usando guiones '-' (Ideal para enumerar características o beneficios técnicos).\n"
            "B) Narrativa fluida de 2-3 párrafos (Ideal si el mensaje es emocional o de 'tranquilidad').\n"
            "Decisión Crítica: Si la longitud del cuerpo es corta (menos de 6 líneas), favorece la narrativa (B) para que el correo no se vea mecanizado. Prioriza la claridad sobre la formalidad."
        )

    # GRUPO 2: Productos Ágiles / Consumo (Tarjetas, Apps, Go Bice)
    return (
        "ESTILO DE CUERPO: 'Ágil y Directo'.\n"
        "Estructura Sugerida: Gancho corto + CUERPO DINÁMICO + Cierre rápido.\n"
        "OPCIONES PARA EL CUERPO (Elige la mejor):\n"
        "A) Lista corta de 2 a 3 puntos clave usando guiones '-' (Para beneficios directos como descuentos).\n"
        "B) Texto fluido, un párrafo corto y potente (Para invitaciones rápidas o mensajes de estilo de vida).\n"
        "Decisión Crítica: Si el mensaje se puede decir de forma concisa en un párrafo, omite la lista. "
        "Objetivo: Ser conciso (Skimmable content)."
    )


def _detect_subject_age(cluster: str) -> str:
    """
    Determina la edad aproximada del sujeto para consistencia visual.
    """
    c_lower = cluster.lower()

    # 1. Joven / Universitario / Go Bice / Primer auto
    if any(x in c_lower for x in ["go bice", "universitaria", "joven", "moto", "primera vivienda"]):
        return "Young adults (20-28 years old), stylish university students or young professionals"

    # 2. Senior / Consolidado
    if any(x in c_lower for x in ["senior", "inversión", "alta renta", "patrimonio", "empresa"]):
        return "Mature adults (40-55 years old), sophisticated and established business people"

    # 3. Default (Adulto joven/medio)
    return "Adults (30-45 years old), stylish and successful"


def build_email_prompt(campaign: str, cluster: str, feedback: Any = None, variant_index: int = 1) -> Tuple[str, str]:
    normalized_camp = normalize_campaign(campaign)
    official_benefits = BENEFITS.get(normalized_camp, [])
    approved_ctas = CTAS.get(normalized_camp, [])
    feedback_str = _extract_feedback_text(feedback)
    cluster_desc = describe_cluster(cluster, normalized_camp)

    # Inyectamos la estructura FLEXIBLE basada en campaña
    dynamic_body_rules = _get_consistent_structure(normalized_camp)

    system = (
        f"{BICE_TEXT_TONE}\n\n"
        f"{BICE_TEXT_STRUCTURE_BASE}\n"
        f"{dynamic_body_rules}\n\n"
        f"{BICE_TEXT_CONSTRAINTS}\n"
        f"{LENGTHS_EMAIL}\n"
        f"{PRODUCT_RULES}\n"
        f"INSTRUCCIÓN FINAL: Debes seducir al cliente. Usa un lenguaje elegante pero convincente."
    )

    user = f"""
TAREA: Genera el contenido del correo (Variante #{variant_index}).

CONTEXTO DEL CLIENTE:
- Campaña: {normalized_camp}
- Segmento/Cluster: {cluster} ({cluster_desc})

RECURSOS DE MARKETING (Úsalos):
- Beneficios Clave: {', '.join(official_benefits[:6])}
- Opciones de CTA: {', '.join(approved_ctas[:4])}

INPUT DEL EJECUTIVO (Obligatorio integrar si existe):
{feedback_str if feedback_str else "Sin input manual, usa tu mejor criterio basado en el cluster."}

{_json_only_clause()}
"""
    return system, user.strip()


def build_image_prompt(campaign: str, cluster: str, feedback: Any = None) -> str:
    c_lower = cluster.lower()
    camp_lower = campaign.lower()
    user_visual_request = _extract_visual_feedback(feedback)

    # 1. Definir EDAD del sujeto (Lógica de Segmento)
    subject_age_desc = _detect_subject_age(cluster)

    # 2. Definir ESCENA
    scene_description = ""

    if user_visual_request:
        # --- LÓGICA INTELIGENTE DE INPUT MANUAL (SAFETY SUFFIX) ---
        req_lower = user_visual_request.lower()

        # Palabras que suelen "contaminar" la etnia y generar sesgos geográficos
        risk_keywords = [
            "japón", "japan", "tokyo",
            "asia", "china", "korea",
            "europa", "europe", "paris", "london", "italia",
            "africa", "áfrica",
            "caribe", "cancun", "brasil"
        ]

        # Detectamos si hay palabras de riesgo en el input
        is_risk_context = any(kw in req_lower for kw in risk_keywords)

        safety_suffix = ""
        if is_risk_context:
            # INYECCIÓN CRÍTICA: Desacopla la etnia del lugar usando la definición de Branding
            safety_suffix = (
                " (CRITICAL REQUIREMENT: The subjects are SOPHISTICATED CHILEAN TRAVELERS visiting this location. "
                "They MUST maintain the High-Net-Worth Southern Cone aesthetic defined above. "
                "They are NOT locals. They are tourists)."
            )

        scene_description = f"engaged in an activity depicting: '{user_visual_request}'{safety_suffix}."

    else:
        # --- LÓGICA AUTOMÁTICA POR CAMPAÑA (Se mantiene igual, solo mejoramos textos de viaje) ---

        # --- EMPRESAS ---
        if "empresa" in camp_lower or "negocio" in c_lower:
            scene_description = (
                "in a modern glass-walled corporate office. "
                "The subject is standing next to a colleague, looking at a tablet together and discussing a plan. "
                "Shared attention and professional interaction."
            )

        # --- SEGUROS ---
        elif "seguro" in c_lower or "seguro" in camp_lower:
            if "salud" in c_lower:
                scene_description = (
                    "relaxing in a comfortable modern bedroom or living room, lying on the bed or sofa. "
                    "The subject is happy and healthy, holding a cup of coffee and looking at a tablet screen."
                )
            elif "auto" in c_lower or "vehículo" in c_lower:
                scene_description = (
                    "standing next to a modern high-end car in a showroom or driveway. "
                    "The subject is confidently handing car keys to a partner or checking a document together."
                )
            elif "vida" in c_lower or "familia" in c_lower:
                scene_description = (
                    "enjoying a beautiful outdoor moment in a park or garden with their family. "
                    "Laughing, playing, or hugging. No documents, just happiness."
                )
            elif "hogar" in c_lower:
                scene_description = (
                    "sitting comfortably on a sofa in a stylish, sun-lit living room, "
                    "reading a book or drinking tea."
                )
            else:
                scene_description = "looking at a tablet with a relieved expression, feeling protected and secure."

        # --- VIAJES (Lógica Automática Blindada) ---
        elif any(x in c_lower for x in ["viaje", "mundo", "vacaciones", "internacional"]):
            context_kw = "exclusive airport lounge"
            if "familia" in c_lower:
                context_kw = "walking in a beautiful travel destination"

            # CRUCIAL: "Tourist visiting" desacopla la etnia del sujeto del lugar
            scene_description = (
                f"{context_kw}. IMPORTANT: Depict the subjects as SOPHISTICATED TRAVELERS visiting the place. "
                "They are holding travel accessories (camera, map, luggage) to visually distinguish them from locals. "
                "They look excited about the trip."
            )

        # --- CUENTA GO BICE / UNIVERSITARIA (Joven) ---
        elif "go bice" in c_lower or "universitaria" in c_lower:
            scene_description = (
                "in a trendy urban coffee shop or university campus. "
                "Using a modern smartphone to interact with the bank app. "
                "Vibe: Digital nomad, agile, happy and tech-savvy."
            )

        # --- FAMILIA / HOGAR (General) ---
        elif any(x in c_lower for x in ["familia", "hogar", "casa"]):
            scene_description = "sitting together on a sofa in a modern living room, looking at a laptop screen with a happy expression."

        # --- AUTO / VEHÍCULO ---
        elif any(x in c_lower for x in ["auto", "vehículo"]):
            scene_description = "standing next to a high-end modern car on a scenic route, smiling confidently."

        # --- DEUDA / FINANZAS ---
        elif any(x in c_lower for x in ["deuda", "orden", "tranquilidad"]):
            scene_description = "relaxing at home, holding a warm cup of coffee, looking peaceful and relieved."

        else:
            scene_description = "in a blurred modern architectural background, engaging with the camera with a confident smile."

    # 3. ENSAMBLAJE FINAL
    # Nota: Insertamos subject_age_desc para que la edad se respete antes de la demografía base
    prompt = (
        f"{BICE_VISUAL_IDENTITY} "
        f"MAIN SUBJECTS: {subject_age_desc}. {BICE_DEMOGRAPHIC_BASE} "
        f"ACTION/CONTEXT: The subjects are {scene_description} "
        f"BRANDING: {BICE_GRAPHIC_OVERLAY}"
    )

    return prompt
