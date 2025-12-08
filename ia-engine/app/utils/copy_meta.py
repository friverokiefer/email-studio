# ia-engine/app/utils/copy_meta.py
"""
Catálogo de copy para campañas y clusters del IA Engine.
Centraliza BENEFITS, CTAS, SUBJECTS y CLUSTER_TONE.
Alineado con Identidad V3.2 (High-End & Estructurada).
"""

from typing import Any, Dict, List

# ============================================================
#  BENEFICIOS (Inspiración para la narrativa)
#  Redactados como "Valor para el cliente" manteniendo el dato duro.
# ============================================================
BENEFITS: Dict[str, List[str]] = {
    "Crédito de consumo - Persona": [
        "Tasa preferencial exclusiva para clientes Banco BICE, reconociendo tu trayectoria.",
        "Flexibilidad total: elige el plazo y el valor cuota que se adapten a tu flujo mensual.",
        "Abono inmediato en tu cuenta corriente con un proceso 100% online y seguro.",
        "Comienza a pagar después: hasta 3 meses de gracia para el primer vencimiento.",
        "Libertad financiera: opción de prepago flexible para reducir deuda cuando quieras.",
        "Liquidez ágil para concretar proyectos de alto valor sin tocar tus inversiones.",
        "Orden y simplicidad: consolida tus compromisos en una sola entidad.",
    ],
    "Crédito de consumo - Empresa": [
        "Liquidez inmediata para asegurar la continuidad operacional y capital de trabajo.",
        "Financiamiento estratégico para la renovación de activos productivos y tecnología.",
        "Estructura de cuotas diseñada a la medida del ciclo de ingresos de tu negocio.",
        "Evaluación experta realizada por un equipo especializado en empresas.",
        "Respaldo financiero sólido para proyectos de expansión y crecimiento.",
    ],
    "DAP (Depósito a plazo)": [
        "Rentabilidad asegurada con tasa fija conocida desde el día uno.",
        "La tranquilidad de invertir con el respaldo patrimonial del Banco BICE.",
        "Plazos a tu medida (desde 7 hasta 365 días) para una gestión eficiente de caja.",
        "Gestión 100% digital: invierte, simula y renueva directamente desde tu App o Web.",
        "El instrumento ideal para rentabilizar excedentes de liquidez sin riesgo de mercado.",
    ],
    "Crédito hipotecario": [
        "Financiamiento a largo plazo con condiciones de tasa competitivas.",
        "Asesoría personalizada de un especialista durante todo el proceso de compra.",
        "Holgura inicial: hasta 6 meses de gracia para el pago del primer dividendo.",
        "Flexibilidad total para financiar propiedades nuevas, usadas o fines generales.",
        "Evaluación ágil para que no pierdas oportunidades de inversión inmobiliaria.",
    ],
    "Refinanciar deuda": [
        "Orden financiero: unifica múltiples pasivos en una sola cuota más baja y manejable.",
        "Mejora tu flujo de caja mensual reduciendo significativamente la carga financiera.",
        "Accede a una tasa preferencial exclusiva para consolidación de deuda.",
        "Posibilidad de extender el plazo para ganar mayor holgura mes a mes.",
        "Recupera tu capacidad de ahorro y simplifica tu vida bancaria.",
    ],
    "Apertura producto - Tarjeta de crédito": [
        "Acumulación acelerada de Dólares BICE en todas tus compras nacionales e internacionales.",
        "Experiencia de viaje superior: acceso a Salones VIP en aeropuertos del mundo.",
        "Viaja sin costos ocultos: 0% comisión en todas tus compras internacionales.",
        "Protección total: seguros de viaje, protección de compra y garantía extendida incluidos.",
        "Sin costo de mantención semestral (cumpliendo requisitos simples de uso).",
    ],
    "Apertura producto - Cuenta corriente": [
        "La puerta de entrada a un modelo de atención preferente y personalizado.",
        "Acceso exclusivo a productos de inversión y financiamiento selecto.",
        "Plataforma digital premiada por su usabilidad, seguridad y diseño.",
        "Beneficios únicos en gastronomía, viajes y experiencias lifestyle.",
        "Tarjeta de Débito con tecnología avanzada y aceptación global.",
    ],
    "Seguros": [
        "Coberturas integrales diseñadas para proteger tu patrimonio y estilo de vida.",
        "Asistencia 24/7 con respuesta rápida en caso de siniestro o emergencia en ruta.",
        "Contratación simple, transparente y 100% digital, sin letra chica.",
        "Respaldo de las compañías aseguradoras más prestigiosas del mercado.",
        "Primas preferenciales y beneficios exclusivos por ser cliente BICE.",
    ],
}

# ============================================================
#  CTAs (Llamados a la acción - Imperativo suave)
# ============================================================
CTAS: Dict[str, List[str]] = {
    "Crédito de consumo - Persona": [
        "Simular mi crédito", "Ver mi oferta disponible", "Solicitar ahora", "Evaluar opciones",
    ],
    "Crédito de consumo - Empresa": [
        "Evaluar financiamiento", "Contactar a mi ejecutivo", "Ver opciones", "Solicitar capital",
    ],
    "DAP (Depósito a plazo)": [
        "Simular inversión", "Ver tasas de hoy", "Invertir ahora", "Rentabilizar mi dinero",
    ],
    "Crédito hipotecario": [
        "Simular dividendo", "Solicitar asesoría", "Ver propiedades", "Evaluar crédito",
    ],
    "Refinanciar deuda": [
        "Evaluar consolidación", "Ver mi nueva cuota", "Ordenar mis deudas", "Solicitar orden",
    ],
    "Apertura producto - Tarjeta de crédito": [
        "Solicitar Tarjeta", "Ver beneficios", "Pedir online", "Quiero mi tarjeta",
    ],
    "Apertura producto - Cuenta corriente": [
        "Hacerme cliente", "Abrir cuenta", "Conocer más", "Empezar ahora",
    ],
    "Seguros": [
        "Cotizar seguro", "Ver coberturas", "Proteger ahora", "Contratar online",
    ],
}

# ============================================================
#  SUBJECTS (Asuntos de correo - Estilo Inbox)
# ============================================================
SUBJECTS: Dict[str, List[str]] = {
    "Crédito de consumo - Persona": [
        "Tus proyectos tienen luz verde 🟢",
        "Una propuesta financiera pensada en ti",
        "¿Planes en mente? Hazlos realidad hoy",
        "Revisa tu oferta preferencial de consumo",
        "Financia eso que tanto quieres",
    ],
    "Crédito de consumo - Empresa": [
        "El impulso que tu negocio necesita",
        "Liquidez ágil para tus desafíos operativos",
        "Financiamiento estratégico para tu empresa",
        "Respaldo BICE para tu crecimiento",
    ],
    "DAP (Depósito a plazo)": [
        "Haz crecer tus ahorros con seguridad",
        "Tu dinero puede rentar más: revisa nuestras tasas",
        "Invierte con la tranquilidad del Banco BICE",
        "Una decisión inteligente para tu capital",
    ],
    "Crédito hipotecario": [
        "El camino a tu nueva casa comienza aquí",
        "Tu propiedad soñada, financiada a tu medida",
        "Asesoría experta para tu inversión inmobiliaria",
        "Hablemos de tu próximo hogar",
    ],
    "Refinanciar deuda": [
        "Recupera tu tranquilidad financiera",
        "Ordena tus compromisos en una sola cuota",
        "Mejora tu flujo de caja este mes",
        "Una solución para ordenar tus pasivos",
    ],
    "Apertura producto - Tarjeta de crédito": [
        "Bienvenido a un mundo de beneficios exclusivos",
        "Viaja y compra mejor con tu Tarjeta BICE",
        "Descubre el poder de tus Dólares BICE",
        "La tarjeta que acompaña tu estilo de vida",
    ],
    "Apertura producto - Cuenta corriente": [
        "La experiencia bancaria que mereces",
        "Bienvenido a Banco BICE: comencemos",
        "Simplifica tu vida financiera con nosotros",
        "Un banco a la altura de tus expectativas",
    ],
    "Seguros": [
        "Protege lo que más quieres hoy",
        "Tranquilidad para ti y tu familia",
        "Tu auto y hogar, en las mejores manos",
        "Cobertura total para tu tranquilidad",
    ],
}

# ============================================================
#  TONO POR CLUSTER (Contexto emocional para el System Prompt)
# ============================================================
CLUSTER_TONE: Dict[str, str] = {
    # --- Persona ---
    "Auto familiar": "Destaca seguridad, comodidad y espacio para la familia al renovar el auto. Tono protector y de bienestar.",
    "Auto soltero": "Tono aspiracional; enfócate en estilo de vida, independencia y libertad de movimiento.",
    "Cambio de moto": "Resalta movilidad ágil, economía, libertad y un upgrade tecnológico.",
    "Mejora del hogar": "Conecta con ideas de renovación, confort, estética y valorización del espacio personal.",
    "Proyectos familiares": "Enfoca en bienestar del grupo familiar, hitos de vida (estudios, salud) y respaldo sólido.",
    "Proyectos personales": "Habla de desarrollo personal, estudios, hobbies y la satisfacción de cumplir metas propias.",
    "Reorganizar finanzas joven": "Tono empático, sin juicio; foco en alivio de carga, orden y futuro despejado.",
    "Reorganizar finanzas senior": "Tono claro, respetuoso y sereno; prioriza estabilidad, simplicidad y protección patrimonial.",
    "Viajes familiares": "Invita a vivir experiencias memorables en familia, planificar con anticipación y viajar tranquilos.",
    "Viajes solteros": "Tono más lúdico, aventurero y exclusivo; habla de destinos, experiencias y flexibilidad.",

    # --- Nuevos Clusters Cuenta Corriente ---
    "Cuenta digital GO BICE": "Tono fresco, ágil y 'mobile-first'. Enfatiza la libertad, la rapidez del onboarding y la pertenencia a un banco top sin burocracia.",
    "Cuenta corriente Universitaria": "Tono joven, de apoyo y bienvenida al mundo financiero. Destaca la gratuidad y los beneficios en tecnología y tiempo libre.",

    # --- Empresa ---
    "Liquidez Operativa": "Tono resolutivo y ágil. Enfocado en velocidad de respuesta, no detener la operación y eficiencia de caja.",
    "Inversión para Crecer": "Tono visionario y de partnership. Habla de competitividad, modernización y futuro del negocio.",
    "Reordenamiento Financiero": "Tono estratégico y experto. Enfocado en salud financiera, sostenibilidad y estructura inteligente.",
}


def get_copy_meta() -> Dict[str, Any]:
    return {
        "benefits": BENEFITS,
        "ctas": CTAS,
        "subjects": SUBJECTS,
        "clusterTone": CLUSTER_TONE,
    }


__all__ = ["BENEFITS", "CTAS", "SUBJECTS", "CLUSTER_TONE", "get_copy_meta"]
