# ia-engine/app/utils/branding.py

# ==========================================
# 1. IDENTIDAD VISUAL V3.6 (Wider Shot & Pure Photography)
# ==========================================
BICE_VISUAL_IDENTITY = (
    "PHOTOGRAPHY STYLE: High-end cinematic advertising photography. 8k resolution. "

    # AJUSTE DE CÁMARA: De 85mm (Zoom) a 35mm (Angular).
    # Esto aleja la cámara y obliga a mostrar el entorno.
    "CAMERA SPECS: Shot on 35mm lens. Environmental portrait style. "
    "COMPOSITION: Wide shot (Plano General) or Medium Shot. The subjects should take up about 30-40% of the frame, "
    "allowing the background/environment to be clearly visible and set the context. Avoid extreme close-ups. "

    "VIBE: Optimistic, Premium, Reliable, Genuine Happiness. "
    "INTERACTION RULE (CRITICAL): Subjects must have SHARED FOCUS. They should be looking at each other, "
    "pointing at the same object, or smiling at a shared view. Avoid subjects looking in random directions. "
    "LIGHTING: Golden Hour (soft, warm sunlight) or sophisticated bright natural light. The light acts as a narrative element. "
    "COMPOSITION: Candid moments, authentic emotions. Avoid stiff 'stock photo' poses. "
    "DEFAULT CONTEXT: High Net Worth / Upper Class lifestyle in Chile (Santiago/Vitacura/Sanhattan style). "
    "COLORS: Corporate palette accents (Deep Navy Blue and Bright Cyan/Turquoise) integrated naturally in clothing or props."
)

# AJUSTE CRÍTICO DE BLINDAJE DEMOGRÁFICO
BICE_DEMOGRAPHIC_BASE = (
    "SUBJECTS IDENTITY (STRICT): "
    "The subjects are ALWAYS Chilean/Southern Cone people (Western-Latin phenotype). "

    # 1. REGLA DE APARIENCIA
    "APPEARANCE: Sophisticated, elegant, and well-groomed. "
    "Physical traits: **Light to Medium-Olive skin tone (Mediterranean/Hispanic phenotype)**. "
    "HAIR: Predominantly Dark Brown/Black. "
    "However, include Natural Blonde, Light Brown, or Red hair in a realistic proportion (approx 10-15% chance) to reflect the diversity of this segment. "

    # 2. REGLA DE CONTEXTO EXTRANJERO
    "CONTEXT RULE (Travel/Foreign): If the location is foreign (Japan, Europe, etc.), depict subjects as SOPHISTICATED TRAVELERS visiting that place. "
    "Crucial: They must retain their Chilean/Western appearance and High-Net-Worth fashion style. "
    "Do NOT make them look like locals of the destination. "
    "Do NOT make them look like stereotypical backpackers. "

    # 3. REGLA DE VESTUARIO
    "ATTIRE: Smart casual luxury (Linen shirts, blazers, high-quality knitwear). No ties, no hiking gear."

    "NEGATIVE PROMPT (CRITICAL): "
    "Do NOT generate subjects matching the ethnicity of the background location. "
    "**Do NOT generate Black, East Asian, or Indian phenotypes.** "
    "Do NOT generate messy hair, oversized backpacks, or sloppy clothing. "
    "Do NOT generate disconnected characters (Zombie stare)."
)

# AJUSTE: Eliminamos la petición de logos y líneas.
# Ahora forzamos "limpieza" para que tú pongas el logo manualmente después.
BICE_GRAPHIC_OVERLAY = (
    "CLEAN IMAGE RULE: NO text, NO logos, NO watermarks, NO graphic overlays, NO blue waves. "
    "Pure photography only. Keep the image clean for post-production."
)

# ==========================================
# 2. IDENTIDAD TEXTUAL (Sin cambios)
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
