# ia-engine/app/utils/branding.py

# ==========================================
# 1. IDENTIDAD VISUAL V5.1 (Hybrid: Editorial Look + Context Logic)
# ==========================================
BICE_VISUAL_IDENTITY = (
    # --- MOTOR GRÁFICO (Rescatado de V4 para mantener el estilo Editorial) ---
    "PHOTOGRAPHY STYLE: High-end Editorial Photography. Analog Film Aesthetic. "
    "FILM STOCK: Kodak Portra 400 (for natural skin tones and fine grain). "
    "TEXTURE: Visible film grain, soft natural shadows. "

    "CAMERA SPECS: Shot on 35mm prime lens. Aperture f/2.8. "
    "FOCUS: Shallow depth of field. The background must be slightly out of focus (bokeh) "
    "to separate the subjects from the environment naturally. "

    "COMPOSITION: Wide shot (Plano General) or Medium Shot. The subjects should take up about 30-40% of the frame, "
    "allowing the background/environment to be clearly visible and set the context. Avoid extreme close-ups. "
    # -------------------------------------------------------------------------

    "VIBE: Optimistic, Premium, Reliable, Genuine Happiness. "

    # --- CORRECCIÓN INTERACCIÓN (Lógica V5 para naturalidad) ---
    "INTERACTION RULE (CRITICAL): Subjects must share a GENUINE MOMENT. "
    "Instead of posing, they are engaged in conversation, laughing together, or looking at a shared view. "
    "CRITICAL CONSTRAINT: Avoid forced 'pointing' gestures. Avoid static advertising smiles. "
    "The interaction must look spontaneous, candid, and unposed."
    # -----------------------------------------------------------

    "LIGHTING: Golden Hour (soft, warm sunlight) or sophisticated bright natural light. The light acts as a narrative element. "
    "DEFAULT CONTEXT: High Net Worth / Upper Class lifestyle in Chile (Santiago/Vitacura/Sanhattan style). "

    "CLOTHING COLOR PALETTE: Neutral and Sophisticated (Beige, White, Light Grey, Navy, Earth tones). "
    "Do NOT use bright Cyan or Turquoise on main clothing. "
    "BRANDING COLORS (Deep Navy & Cyan) must appear ONLY in background elements "
    "or small accessories (like a phone case or a pen), NEVER as the main shirt/jacket color."
)

# ANCLAJE GEOGRÁFICO DEFAULT
BICE_GEO_ANCHOR = (
    "GEOGRAPHIC ANCHOR: The background MUST resemble Santiago de Chile (Modern glass buildings + The Andes Mountains silhouette in the distance). "
    "Even if the action is futuristic (like a flying car), the city layout and architecture must look Western/Latin American, NOT Cyberpunk Asian (No neon signs with Kanji, no dense Hong Kong style streets). "
    "If the prompt specifies nature/beach/south, prioritize the landscape over the city buildings."
)

BICE_DEMOGRAPHIC_BASE = (
    "SUBJECTS IDENTITY (STRICT): "
    "The subjects are ALWAYS Chilean/Southern Cone people (Western-Latin phenotype). "

    "APPEARANCE: Sophisticated, elegant, and well-groomed. "
    "Physical traits: **Light to Medium-Olive skin tone (Mediterranean/Hispanic phenotype)**. "

    "SKIN TEXTURE: Real skin with visible pores and slight natural imperfections. "
    "Avoid 'wax figure' look. Avoid excessive smoothness. "

    # --- REGLA DE VESTUARIO INTELIGENTE (Solución "Terno en la Playa") ---
    "ATTIRE RULE (CONTEXT AWARE): "
    "The clothing MUST match the activity described in the prompt, while maintaining a High-Net-Worth aesthetic. "
    "1. IF Business/City: Smart casual luxury (Blazers, linen shirts, no ties). "
    "2. IF Outdoors/Trekking: Premium technical apparel (e.g., North Face style, puffer vests). NO Blazers. "
    "3. IF Beach/Summer: High-end resort wear, linen shirts, sunglasses. "
    "4. IF Home/Relax: Quality knitwear, comfortable but stylish. "
    "General Rule: No oversized logos, no sloppy clothing, no ties."
    # ----------------------------------------------------------------------

    "HAIR: Predominantly Dark Brown/Black. "
    "However, include Natural Blonde, Light Brown, or Red hair in a realistic proportion (approx 10-15% chance) to reflect the diversity of this segment. "
    "EXPRESSIONS: Candid smiles, distinct and natural. "

    "NEGATIVE PROMPT (CRITICAL): "
    "Do NOT generate subjects matching the ethnicity of the background location (e.g., no Japanese locals if visiting Japan). "
    "**Do NOT generate Black, East Asian, or Indian phenotypes.** "
    "Do NOT generate suits in outdoor/sport settings. "
    "Do NOT generate forced pointing fingers. "
    "Do NOT generate disconnected characters (Zombie stare)."
)

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
    "BICE_GEO_ANCHOR",
    "BICE_TEXT_TONE",
    "BICE_TEXT_CONSTRAINTS",
    "BICE_TEXT_STRUCTURE_BASE",
    "BICE_GRAPHIC_OVERLAY"
]
