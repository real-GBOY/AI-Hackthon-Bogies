"""
A dummy RiskModel used until a real model is trained on the chosen dataset.

Scores are randomized but deterministic per feature set (seeded from a hash
of the input) so repeated calls with the same features return the same
answer, the way a real model would.
"""

from __future__ import annotations

import random
from typing import Any

from .base import RiskModel

DEFAULT_FEATURE_NAMES = ["feature_a", "feature_b", "feature_c"]


def _stable_seed(features: dict[str, Any]) -> int:
    return hash(tuple(sorted((str(k), str(v)) for k, v in features.items())))


class MockRiskModel(RiskModel):
    def predict_proba(self, features: dict[str, Any]) -> float:
        rng = random.Random(_stable_seed(features))
        return round(rng.uniform(0.0, 1.0), 3)

    def explain(self, features: dict[str, Any]) -> list[tuple[str, float]]:
        rng = random.Random(_stable_seed(features) + 1)
        names = list(features.keys()) or DEFAULT_FEATURE_NAMES
        sampled = rng.sample(names, k=min(3, len(names)))
        while len(sampled) < 3:
            sampled.append(f"feature_{len(sampled)}")
        return [(name, round(rng.uniform(-1.0, 1.0), 3)) for name in sampled[:3]]
