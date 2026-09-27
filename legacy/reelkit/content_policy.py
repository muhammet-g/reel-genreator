"""Central default content rules for Motion-Only planning and local resource selection.

Metadata checks are guardrails; they do not visually classify an imported asset.
"""

DEFAULT_POLICY = {
    "music": "prohibited",
    "nonmusical_sfx": "allowed",
    "real_people": "men without identifiable facial features only",
    "illustrated_people": "faceless only; modestly dressed girl is the sole stated exception",
    "women_in_real_media": "prohibited",
    "animals": "prohibited",
    "invented_quotes": "prohibited",
    "fabricated_testimonials_results_proof": "prohibited",
    "fake_logos": "prohibited",
    "decorative_mockups_as_evidence": "prohibited",
    "preferred_alternatives": ["typography", "diagram", "abstract motion", "book", "object", "device", "UI", "shape", "icon"],
}

BLOCKED_TAGS = {"music", "woman", "women", "animal", "animals", "identifiable-face", "fake-proof",
                "fake-logo", "fabricated-testimonial", "fabricated-result"}


def validate_resource_content_metadata(*, tags, safety, kind):
    normalized = {str(tag).strip().lower() for tag in tags}
    if kind == "sfx" and "music" in normalized:
        raise ValueError("Music is not allowed in the default Motion-Only policy.")
    if safety == "approved" and normalized & BLOCKED_TAGS:
        raise ValueError("An approved resource cannot carry a blocked content tag.")
