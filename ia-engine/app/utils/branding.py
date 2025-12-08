# ia-engine/app/utils/branding.py

# ==========================================
# 1. IDENTIDAD VISUAL V3.5 (Cinematic Depth & Interaction)
# ==========================================
BICE_VISUAL_IDENTITY = (
    "PHOTOGRAPHY STYLE: High-end cinematic advertising photography. 8k resolution. "
    "CAMERA SPECS: Shot on 85mm portrait lens, f/1.8 aperture for creamy bokeh and cinematic depth separation. "
    "VIBE: Optimistic, Premium, Reliable, Genuine Happiness. "
    "INTERACTION RULE (CRITICAL): Subjects must have SHARED FOCUS. They should be looking at each other, "
    "pointing at the same object, or smiling at a shared view. Avoid subjects looking in random directions. "
    "LIGHTING: Golden Hour (soft, warm sunlight) or sophisticated bright natural light. The light acts as a narrative element. "
    "COMPOSITION: Candid moments, authentic emotions. Avoid stiff 'stock photo' poses. "
    "DEFAULT CONTEXT: High Net Worth / Upper Class lifestyle in Chile (Santiago/Vitacura/Sanhattan style). "
    "COLORS: Corporate palette accents (Deep Navy Blue and Bright Cyan/Turquoise) integrated naturally in clothing or props."
)

# AJUSTE CRÍTICO: Anclaje de Identidad + Diversidad Coherente
BICE_DEMOGRAPHIC_BASE = (
    "SUBJECTS IDENTITY (STRICT): "
    "The subjects are ALWAYS Chilean/Southern Cone people (Western-Latin phenotype). "

    # 1. REGLA DE APARIENCIA (High-End & Diversidad)
    "APPEARANCE: Sophisticated, elegant, and well-groomed. "
    "Physical traits: Light to Medium-Olive skin tone. "
    "HAIR: Predominantly Dark Brown/Black. "
    "However, include Natural Blonde, Light Brown, or Red hair in a realistic proportion (approx 10-15% chance) to reflect the diversity of this segment. "

    # 2. REGLA DE CONTEXTO EXTRANJERO (El "Escudo" sofisticado)
    "CONTEXT RULE (Travel/Foreign): If the location is foreign (Japan, Europe, etc.), depict subjects as SOPHISTICATED TRAVELERS visiting that place. "
    "Crucial: They must retain their Chilean/Western appearance and High-Net-Worth fashion style. "
    "Do NOT make them look like locals of the destination. "
    "Do NOT make them look like stereotypical backpackers. "

    # 3. REGLA DE VESTUARIO
    "ATTIRE: Smart casual luxury (Linen shirts, blazers, high-quality knitwear). No ties, no hiking gear."

    "NEGATIVE PROMPT: "
    "Do NOT generate subjects matching the ethnicity of the background location. "
    "Do NOT generate messy hair, oversized backpacks, or sloppy clothing. "
    "Do NOT generate disconnected characters (Zombie stare)."
)

BICE_GRAPHIC_OVERLAY = (
    "GRAPHIC ELEMENTS: Subtle integration of flowing wavy lines in Cyan and Navy Blue framing the scene. "
    "Optional: Stylish 3D text floating naturally in the scene saying 'BICE'."
)

# ==========================================
# 2. IDENTIDAD TEXTUAL
# ==========================================
BICE_TEXT_TONE = (
    "ROL: Lead Copywriter Senior de Banco BICE (Banca Privada). "
    "TONO: Aspiracional, experto, cercano pero exclusivo. "
    "OBJETIVO: Persuadir vendiendo la experiencia y la tranquilidad."
)

BICE_TEXT_CONSTRAINTS = (
    "REGLAS: Voz activa ('Tú'). Sin clichés. Sin exclamaciones dobles. "
    "Lenguaje premium y sobrio. Legibilidad alta."
)

BICE_TEXT_STRUCTURE_BASE = (
    "ESTRUCTURA JSON:\n"
    "- subject: Gancho corto (max 50 chars).\n"
    "- preheader: Complemento.\n"
    "- title: Título interno H1.\n"
    "- subtitle: Bajada explicativa persuasiva (OBLIGATORIO).\n"
    "- body: Estructura variable (Bullets o Narrativa).\n"
    "- cta: Botón imperativo suave."
)

__all__ = [
    "BICE_VISUAL_IDENTITY",
    "BICE_DEMOGRAPHIC_BASE",
    "BICE_TEXT_TONE",
    "BICE_TEXT_CONSTRAINTS",
    "BICE_TEXT_STRUCTURE_BASE",
    "BICE_GRAPHIC_OVERLAY"
]
