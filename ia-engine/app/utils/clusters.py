# ia-engine/app/utils/clusters.py
"""Definiciones de clusters (drivers) para Banco BICE.

Estas descripciones se usan para contextualizar al modelo según el driver/cluster
seleccionado en Email Studio.

IMPORTANTE:
- Las keys de CLUSTERS deben coincidir con backend/src/utils/constants.ts::CLUSTERS.
- CAMPAIGN_CLUSTERS debe reflejar backend/src/utils/constants.ts::CAMPAIGN_CLUSTERS.
"""

from typing import Dict, List, Optional

from app.utils.campaigns import normalize_campaign

# ============================================================
# 1. DEFINICIONES BASE DE CLUSTERS (El "Qué")
# ============================================================
CLUSTERS: Dict[str, str] = {
    # --- Crédito de consumo - Persona ---
    "Auto familiar": (
        "Clientes de alto patrimonio evaluando renovar el auto familiar por un modelo SUV o de alta gama. "
        "Priorizan la seguridad absoluta de sus hijos y el confort para viajes largos. Buscan calidad sin compromisos."
    ),
    "Auto soltero": (
        "Profesionales exitosos que buscan un auto que refleje su estilo de vida y logros. "
        "Valoran el diseño, la tecnología y la experiencia de conducción. Tono aspiracional y moderno."
    ),
    "Cambio de moto": (
        "Aficionados al motociclismo o usuarios de movilidad eficiente que buscan renovar su equipo "
        "por modelos de mayor cilindrada o tecnología. Valoran la libertad y la agilidad."
    ),
    "Mejora del hogar": (
        "Clientes que invierten en valorizar su propiedad o crear espacios de disfrute (quincho, piscina, terraza). "
        "Buscan estética, confort y disfrute familiar en casa."
    ),
    "Proyectos familiares": (
        "Familias que invierten en hitos importantes: educación internacional, bodas, salud de excelencia "
        "o grandes viajes. Priorizan el bienestar y las experiencias memorables sobre el costo."
    ),
    "Proyectos personales": (
        "Clientes enfocados en su autorealización: postgrados en el extranjero, hobbies costosos o emprendimientos personales. "
        "Buscan un socio financiero que impulse sus metas."
    ),
    "Reorganizar finanzas joven": (
        "Profesionales jóvenes con altos ingresos pero con desorden financiero temporal. "
        "Buscan simplificar su vida, ordenar sus flujos y recuperar capacidad de ahorro/inversión."
    ),
    "Reorganizar finanzas senior": (
        "Clientes consolidados que buscan optimizar su estructura patrimonial y simplificar la gestión de sus pasivos. "
        "Valoran la claridad, el respeto y la eficiencia."
    ),
    "Viajes familiares": (
        "Familias planificando vacaciones premium (All inclusive, Disney, Europa). "
        "Quieren resolver el financiamiento rápido para enfocarse solo en disfrutar y crear recuerdos."
    ),
    "Viajes solteros": (
        "Viajeros frecuentes que buscan destinos exóticos o experiencias exclusivas con amigos. "
        "Valoran la flexibilidad y tener liquidez para aprovechar oportunidades en el destino."
    ),

    # --- Crédito de consumo - Empresa ---
    "Liquidez Operativa": (
        "Empresas que necesitan caja rápida para mantener la operación sin interrupciones: "
        "pago de proveedores, nómina, estacionalidad, o pagos de impuestos sin afectar la liquidez diaria."
    ),
    "Inversión para Crecer": (
        "Empresas que modernizan activos, renuevan maquinaria o abren nuevas líneas de negocio. "
        "El crédito se presenta como una palanca estratégica para la expansión y eficiencia."
    ),
    "Reordenamiento Financiero": (
        "Empresas que buscan optimizar su estructura de pasivos para mejorar el flujo de caja, "
        "ordenar vencimientos y lograr mayor eficiencia financiera."
    ),

    # --- DAP (Depósito a plazo) ---
    "Ahorro objetivo": (
        "Planificadores que reservan capital para una meta específica de alto valor. "
        "Buscan certeza absoluta en el monto final."
    ),
    "Fondo de emergencia": (
        "Clientes prudentes que construyen un colchón de liquidez seguro ante imprevistos, "
        "protegiendo su estilo de vida."
    ),
    "Inversión conservadora": (
        "Perfiles que ya han acumulado patrimonio y priorizan su preservación por sobre el riesgo. "
        "Valoran la solidez del banco."
    ),
    "Plan de corto plazo": (
        "Gestión de tesorería personal para excedentes puntuales. "
        "Buscan eficiencia: que el dinero no esté inmovilizado sin rentar."
    ),
    "Plan de largo plazo": (
        "Inversión estructurada con visión de futuro, aprovechando tasas para asegurar retornos "
        "en horizontes mayores."
    ),

    # --- Crédito hipotecario ---
    "Primera vivienda": (
        "Profesionales comprando su primer departamento o casa. Es un hito de vida y éxito. "
        "Necesitan guía experta y agilidad en el proceso."
    ),
    "Mejora de vivienda actual": (
        "Upgrade a una propiedad de mayor estándar o mejor ubicación (barrios exclusivos). "
        "Buscan calidad de vida y plusvalía."
    ),
    "Inversión inmobiliaria": (
        "Inversionistas sofisticados ampliando su portafolio de rentas. "
        "Analizan la operación con lógica financiera (tasa, rentabilidad)."
    ),
    "Refinanciar hipotecario": (
        "Optimización financiera: clientes buscando mejorar las condiciones de su deuda "
        "aprovechando oportunidades de mercado."
    ),

    # --- Refinanciar deuda ---
    "Consolidar deudas consumo": (
        "Estrategia de orden: unificar compromisos para simplificar la gestión mensual "
        "y liberar carga mental."
    ),
    "Bajar dividendo hipotecario": (
        "Gestión de flujo de caja: reducir la carga fija mensual para destinar recursos a otros fines "
        "o inversión."
    ),
    "Reorganizar tarjetas de crédito": (
        "Limpieza financiera: eliminar saldos rotativos caros para pasarlos a una estructura "
        "de crédito más eficiente y barata."
    ),
    "Ordenar líneas y sobregiros": (
        "Estructuración de pasivos: formalizar deuda de corto plazo en un crédito estructurado."
    ),

    # --- Apertura producto - Cuenta corriente (OPTIMIZADO) ---
    "Cuenta digital GO BICE": (
        "Jóvenes profesionales que exigen una experiencia 100% digital, ágil y sin fricciones. "
        "Valoran la autonomía total desde el celular y ven en GO BICE su puerta de entrada "
        "a un servicio de estándar superior."
    ),
    "Cuenta corriente Universitaria": (
        "Estudiantes de educación superior (últimos años) que buscan su primer aliado financiero serio. "
        "Valoran una cuenta costo cero mientras estudian, beneficios en tecnología y tiempo libre, "
        "y una App que les permita gestionar su dinero sin trámites burocráticos."
    ),
    "Cuenta para PyME": (
        "Empresarios que necesitan una cuenta operativa robusta y digital que siga el ritmo de su negocio."
    ),
    "Cuenta alta renta": (
        "Clientes Banca Privada que exigen un servicio impecable, ejecutivo de inversión "
        "y productos exclusivos."
    ),
    "Cuenta para profesional independiente": (
        "Médicos, abogados o consultores que requieren separar sus flujos con herramientas "
        "bancarias profesionales."
    ),

    # --- Apertura producto - Tarjeta de crédito ---
    "Viajes internacionales": (
        "Viajeros frecuentes (Jet-set) que exigen salones VIP, seguros integrales y cero fricción "
        "al pagar en el extranjero."
    ),
    "Compras diarias": (
        "Usuarios intensivos que maximizan la acumulación de puntos/millas en su gasto habitual."
    ),
    "Compras online": (
        "Perfil digital que valora la seguridad extrema en transacciones e-commerce y "
        "casillas en USA."
    ),
    "Segmento alta renta": (
        "Tarjeta Black/Infinite como símbolo de estatus y herramienta de acceso a privilegios exclusivos."
    ),

    # --- Seguros ---
    "Seguro de auto": (
        "Protección total para vehículos de alta gama. Lo que se valora es la asistencia premium "
        "y la respuesta inmediata (auto de reemplazo, taller de marca)."
    ),
    "Seguro de vida": (
        "Responsabilidad y legado: asegurar el bienestar del grupo familiar ante cualquier eventualidad."
    ),
    "Seguro de hogar": (
        "Protección del patrimonio inmobiliario y los bienes contenidos. Tranquilidad total en el hogar."
    ),
    "Seguro de viaje": (
        "Cobertura médica internacional robusta para viajar sin preocupaciones sanitarias o logísticas."
    ),
    "Seguro de salud": (
        "Complemento de salud de alto nivel (Catastrófico, Clínica exclusiva) para garantizar "
        "la mejor atención médica posible."
    ),
}

# ============================================================
# 2. MAPA DE CAMPAÑAS (Validación Frontend)
# ============================================================
CAMPAIGN_CLUSTERS: Dict[str, List[str]] = {
    "Crédito de consumo - Persona": [
        "Auto familiar",
        "Auto soltero",
        "Cambio de moto",
        "Mejora del hogar",
        "Proyectos familiares",
        "Proyectos personales",
        "Reorganizar finanzas joven",
        "Reorganizar finanzas senior",
        "Viajes familiares",
        "Viajes solteros",
    ],
    "Crédito de consumo - Empresa": [
        "Liquidez Operativa",
        "Inversión para Crecer",
        "Reordenamiento Financiero",
    ],
    "DAP (Depósito a plazo)": [
        "Ahorro objetivo",
        "Fondo de emergencia",
        "Inversión conservadora",
        "Plan de corto plazo",
        "Plan de largo plazo",
    ],
    "Crédito hipotecario": [
        "Primera vivienda",
        "Mejora de vivienda actual",
        "Inversión inmobiliaria",
        "Refinanciar hipotecario",
    ],
    "Refinanciar deuda": [
        "Consolidar deudas consumo",
        "Bajar dividendo hipotecario",
        "Reorganizar tarjetas de crédito",
        "Ordenar líneas y sobregiros",
    ],
    # --- ACTUALIZADO: NUEVOS CLUSTERS CUENTA CORRIENTE ---
    "Apertura producto - Cuenta corriente": [
        "Cuenta digital GO BICE",
        "Cuenta corriente Universitaria",
        "Cuenta para PyME",
        "Cuenta alta renta",
        "Cuenta para profesional independiente",
    ],
    "Apertura producto - Tarjeta de crédito": [
        "Viajes internacionales",
        "Compras diarias",
        "Compras online",
        "Segmento alta renta",
    ],
    "Seguros": [
        "Seguro de auto",
        "Seguro de vida",
        "Seguro de hogar",
        "Seguro de viaje",
        "Seguro de salud",
    ],
}

# ============================================================
# 3. CONTEXTO AVANZADO (El "Cómo" según la Campaña)
# ============================================================
# Aquí definimos matices finos para guiar al Prompt Builder.
CAMPAIGN_CLUSTER_CONTEXT: Dict[str, Dict[str, str]] = {
    # --- CONSUMO PERSONAS ---
    "Crédito de consumo - Persona": {
        "Auto familiar": (
            "Presenta el crédito como la vía inteligente para renovar el SUV familiar, "
            "enfatizando la seguridad de los hijos y la comodidad de los viajes en familia."
        ),
        "Auto soltero": (
            "Enfoca el mensaje en el placer de conducir y el upgrade de estilo de vida. "
            "El auto como extensión del éxito personal."
        ),
        "Mejora del hogar": (
            "Inspirar con la idea de la casa soñada: la nueva terraza, la cocina de chef. "
            "El crédito hace realidad ese espacio de disfrute."
        ),
        "Viajes familiares": (
            "Conecta con la emoción de viajar sin preocupaciones financieras. "
            "El crédito permite pagar el viaje soñado en cuotas cómodas."
        ),
    },

    # --- EMPRESAS (Foco: Eficiencia y Sociedad) ---
    "Crédito de consumo - Empresa": {
        "Liquidez Operativa": (
            "Habla de agilidad, continuidad y respaldo para no detener la operación. "
            "Tono resolutivo y experto: 'Tu negocio no puede esperar'."
        ),
        "Inversión para Crecer": (
            "Tono de socio estratégico que impulsa la modernización y el futuro. "
            "Enfócate en competitividad y liderazgo en el mercado."
        ),
    },

    # --- CUENTA CORRIENTE (NUEVO CONTEXTO) ---
    "Apertura producto - Cuenta corriente": {
        "Cuenta digital GO BICE": (
            "Enfoca el mensaje en la rapidez y simplicidad del onboarding digital, destacando que GO BICE "
            "permite abrir una cuenta corriente en minutos desde el celular. Reforzar que es una puerta "
            "premium de entrada al ecosistema BICE."
        ),
    },

    # --- SEGUROS (Foco: Respaldo Premium y Respuesta) ---
    "Seguros": {
        "Seguro de auto": (
            "Enfócate en la 'Seguridad de Élite'. No solo es reparar el auto, es la asistencia premium, "
            "auto de reemplazo y taller de marca. Tranquilidad total en ruta."
        ),
        "Seguro de viaje": (
            "La libertad de explorar el mundo sabiendo que BICE te respalda ante cualquier emergencia médica. "
            "Viaja como un local, protegido globalmente."
        ),
    },

    # --- TARJETAS (Foco: Lifestyle) ---
    "Apertura producto - Tarjeta de crédito": {
        "Viajes internacionales": (
            "Destaca la experiencia 'Fricción Cero' en el extranjero: Salones VIP y 0% comisión. "
            "El cliente es un ciudadano del mundo."
        ),
    }
}


def clusters_for_campaign(campaign: str) -> list[str]:
    """
    Devuelve la lista de clusters válidos para una campaña dada.
    """
    normalized = normalize_campaign(campaign)
    return CAMPAIGN_CLUSTERS.get(normalized, [])


def describe_cluster(cluster: str, campaign: Optional[str] = None) -> str:
    """
    Devuelve una descripción amigable y contextualizada del cluster.
    Aplica lógica de 'Anclaje Geográfico' para evitar alucinaciones.
    """
    base = CLUSTERS.get(cluster)
    normalized_campaign: Optional[str] = (
        normalize_campaign(campaign) if campaign else None
    )

    # 1) Contexto específico (Override manual si existe en CAMPAIGN_CLUSTER_CONTEXT)
    if normalized_campaign:
        override = CAMPAIGN_CLUSTER_CONTEXT.get(
            normalized_campaign, {}
        ).get(cluster)
        if override:
            # Enriquecemos el override con el anclaje demográfico
            return f"{override} (Perfil: Cliente ABC1 residente en Chile)."

    # 2) Descripción base + Instrucción de adaptación
    if base and normalized_campaign:
        return (
            f"{base} EN CONTEXTO DE: '{normalized_campaign}'. "
            "Adapta el mensaje para conectar emocionalmente con este perfil aspiracional. "
            "NOTA: El cliente es residente en Chile (Perfil Banca Privada)."
        )

    # 3) Fallback
    if base:
        return base

    return f"Segmento '{cluster}'. Ajusta el mensaje a un perfil de renta alta residente en Chile."


__all__ = [
    "CLUSTERS",
    "CAMPAIGN_CLUSTERS",
    "CAMPAIGN_CLUSTER_CONTEXT",
    "clusters_for_campaign",
    "describe_cluster"
]
