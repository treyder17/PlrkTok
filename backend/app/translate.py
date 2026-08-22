"""
Titel-Uebersetzung ueber DeepL.

Uebersetzt wird beim Sync, einmal pro Angebot und Sprache, und in der Datenbank
abgelegt - nicht bei jedem Feed-Aufruf. Sonst waere jeder Scroll eine
Fremdanfrage: langsam, und das Zeichenkontingent waere in Stunden weg.

Ohne DEEPL_API_KEY passiert schlicht nichts und der Feed zeigt die
Originaltitel. Uebersetzung ist Komfort, kein Kernbestandteil - sie darf den
Sync nie zum Scheitern bringen.
"""
import json
import os
import urllib.error
import urllib.request

DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY")

# Free-Schluessel enden auf ":fx" und sprechen einen anderen Host als bezahlte.
def _endpoint() -> str:
    if DEEPL_API_KEY and DEEPL_API_KEY.endswith(":fx"):
        return "https://api-free.deepl.com/v2/translate"
    return "https://api.deepl.com/v2/translate"


# Zielsprachen. Russisch ist die Quellsprache der Angebote und braucht daher
# keine Uebersetzung - dort wird der Originaltitel ausgeliefert.
TARGETS = {"de": "DE", "en": "EN-US"}

# DeepL nimmt bis zu 50 Texte pro Anfrage. Etwas darunter bleiben, damit ein
# Ausrutscher in der Zaehlung nicht die ganze Anfrage verwirft.
BATCH_SIZE = 40


def is_configured() -> bool:
    return bool(DEEPL_API_KEY)


def translate_batch(texts: list[str], lang: str) -> list[str] | None:
    """
    Uebersetzt eine Liste Texte in eine Zielsprache.

    Rueckgabe None heisst "nicht moeglich" (kein Schluessel, Netzfehler,
    Kontingent erschoepft). Der Aufrufer laesst es dann bei den Originalen -
    ein halb uebersetzter Feed ist besser als ein leerer.
    """
    if not DEEPL_API_KEY or not texts:
        return None

    target = TARGETS.get(lang)
    if not target:
        return None

    body = json.dumps({"text": texts, "target_lang": target}).encode("utf-8")
    req = urllib.request.Request(
        _endpoint(),
        data=body,
        headers={
            "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        out = [t["text"] for t in data.get("translations", [])]
        # Nur verwenden, wenn die Zuordnung eindeutig ist: bei abweichender
        # Anzahl wuesste man nicht, welche Uebersetzung zu welchem Titel gehoert.
        if len(out) != len(texts):
            print(f"[translate] {lang}: {len(out)} Antworten fuer {len(texts)} Texte - verworfen")
            return None
        return out
    except urllib.error.HTTPError as e:
        # 456 ist bei DeepL das erschoepfte Kontingent - kein Grund zur Panik,
        # nur ein Grund, es diesen Lauf zu lassen.
        print(f"[translate] {lang}: HTTP {e.code}")
        return None
    except Exception as e:
        print(f"[translate] {lang}: {e}")
        return None


def chunks(items: list, size: int = BATCH_SIZE):
    for i in range(0, len(items), size):
        yield items[i : i + size]
