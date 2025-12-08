# ia-engine/app/utils/campaigns.py
"""Utilidades para campañas (productos) Banco BICE."""

from typing import Dict, List

CAMPAIGNS_TONE: Dict[str, str] = {
    "Crédito de consumo - Persona": (
        "Financiamiento flexible y exclusivo para concretar proyectos personales de alto valor. "
        "El foco no es la deuda, sino la libertad de realizar planes (viajes, remodelaciones, estudios) "
        "con la tranquilidad de una tasa preferencial y un proceso digital impecable. Tono: Facilitador de sueños."
    ),
    "Crédito de consumo - Empresa": (
        "Soluciones de liquidez y crecimiento para empresas que buscan excelencia operativa. "
        "Capital de trabajo o inversión con una mirada estratégica. "
        "Tono: Socio estratégico, experto y enfocado en la continuidad del éxito del negocio."
    ),
    "DAP (Depósito a plazo)": (
        "Instrumento de inversión conservador para quienes valoran la certeza y la preservación de capital. "
        "Ideal para rentabilizar excedentes de caja con tasa conocida. "
        "Tono: Prudencia inteligente, seguridad y respaldo patrimonial."
    ),
    "Crédito hipotecario": (
        "La llave para la propiedad soñada o una inversión inteligente. "
        "Más que un préstamo, es una asesoría especializada para estructurar una operación de largo plazo "
        "con las mejores condiciones del mercado. Tono: Solidez, proyección y acompañamiento experto."
    ),
    "Refinanciar deuda": (
        "Una estrategia financiera inteligente para reordenar pasivos, mejorar el flujo de caja mensual "
        "y recuperar tranquilidad mental. No es 'salir de deudas', es 'optimizar la carga financiera'. "
        "Tono: Empático, solucionador y ordenado."
    ),
    "Apertura producto - Cuenta corriente": (
        "La puerta de entrada a una relación bancaria superior. "
        "Acceso a un ecosistema de beneficios, atención personalizada y herramientas digitales de vanguardia. "
        "Tono: Bienvenida a un mundo de privilegios y servicio de excelencia."
    ),
    "Apertura producto - Tarjeta de crédito": (
        "Un medio de pago que premia el estilo de vida del cliente. "
        "Beneficios exclusivos en viajes, gastronomía y experiencias, con seguridad internacional. "
        "Tono: Lifestyle, disfrute y respaldo en cualquier lugar del mundo."
    ),
    "Seguros": (
        "Protección patrimonial y familiar de alto estándar. "
        "La tranquilidad de saber que lo importante está cubierto por especialistas. "
        "Tono: Protección, cuidado y respaldo incondicional."
    ),
}

CAMPAIGN_ALIASES: Dict[str, str] = {
    "Crédito de Consumo BICE": "Crédito de consumo - Persona",
    "Consolidación de deudas": "Refinanciar deuda",
    "Ordena tus deudas": "Refinanciar deuda",
    "Tarjeta de crédito": "Apertura producto - Tarjeta de crédito",
    "Cuenta corriente PyME": "Apertura producto - Cuenta corriente",
    "DAP (Depósito a Plazo)": "DAP (Depósito a plazo)",
    "DAP (Deposito a plazo)": "DAP (Depósito a plazo)",
    "Fondos mutuos / Inversión": "DAP (Depósito a plazo)",
    "Seguros de auto": "Seguros",
    "Seguros de vida": "Seguros",
    "Aumento línea de crédito": "Crédito de consumo - Persona",
    "Aumento cupo TC": "Apertura producto - Tarjeta de crédito",
}

CANONICAL_CAMPAIGNS: List[str] = list(CAMPAIGNS_TONE.keys())


def normalize_campaign(name: str) -> str:
    if not isinstance(name, str):
        return ""
    cleaned = name.strip()
    return CAMPAIGN_ALIASES.get(cleaned, cleaned)


def describe_campaign(campaign: str) -> str:
    normalized = normalize_campaign(campaign)
    base = CAMPAIGNS_TONE.get(normalized)
    if base:
        return base
    return (
        f"Campaña financiera del Banco BICE relacionada con '{normalized}'. "
        "Enfócate en claridad, beneficios concretos y exclusividad, "
        "manteniendo un tono sobrio, profesional y orientado al segmento de rentas altas."
    )


__all__ = ["CAMPAIGNS_TONE", "CAMPAIGN_ALIASES",
           "CANONICAL_CAMPAIGNS", "normalize_campaign", "describe_campaign"]
