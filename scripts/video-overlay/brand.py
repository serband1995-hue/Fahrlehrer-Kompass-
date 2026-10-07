"""Markenwerte (Farben, Schrift, Logo) aus brand.json. Quelle der Farben: Webseite css/style.css laut Vault."""
import json
import os

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", ".."))


def laden(pfad=None):
    return json.load(open(pfad or os.path.join(HIER, "brand.json"), encoding="utf-8"))


def ass(hex_farbe):
    """'#d9b56b' -> '&H006BB5D9&' (ASS nutzt Blau-Grün-Rot)"""
    h = hex_farbe.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}&".upper().replace("&H", "&H", 1)


def rgb(hex_farbe, alpha=255):
    h = hex_farbe.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)
