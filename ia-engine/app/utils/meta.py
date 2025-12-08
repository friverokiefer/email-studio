# ia-engine/app/utils/meta.py
from typing import Dict, Any, List

from app.utils.campaigns import CAMPAIGNS_TONE
from app.utils.clusters import CLUSTERS as CLUSTERS_DEF, CAMPAIGN_CLUSTERS
from app.utils.copy_meta import BENEFITS, CTAS, SUBJECTS, CLUSTER_TONE


def get_meta() -> Dict[str, Any]:
    """
    Devuelve el catálogo maestro para el Frontend y Backend.

    Estructura de retorno optimizada para UI dinámica:
    - campaigns: Lista de objetos {id, label, description}.
    - clusters: Lista de objetos {id, label, description}.
    - mapping: Diccionario { campaign_id: [cluster_ids] }.
    - defaults: Diccionario con benefits, ctas, subjects y tone (copy assets).
    """

    # Transformamos el dict de campañas en una lista de objetos para el UI
    campaigns_ui = [
        {
            "id": name,
            "label": name,
            "description": desc
        }
        for name, desc in CAMPAIGNS_TONE.items()
    ]

    # Transformamos el dict de clusters en una lista de objetos para el UI
    clusters_ui = [
        {
            "id": name,
            "label": name,
            "description": desc
        }
        for name, desc in CLUSTERS_DEF.items()
    ]

    return {
        "campaigns": campaigns_ui,
        "clusters": clusters_ui,
        "mapping": CAMPAIGN_CLUSTERS,  # Relación Campaña -> Clusters permitidos
        "defaults": {
            "benefits": BENEFITS,
            "ctas": CTAS,
            "subjects": SUBJECTS,
            "clusterTone": CLUSTER_TONE,
        }
    }
