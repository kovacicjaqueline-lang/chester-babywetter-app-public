# Tagesausflug-Review-Fixes

Dieser technische Review-Fix präzisiert bereits beschlossene V1-Semantik, ohne neue Outfit-, Temperatur- oder Safety-Regeln einzuführen.

- Die sichtbare Auswahl **„Jetzt“** beginnt am tatsächlichen Request-Zeitpunkt. Bei noch nutzbaren älteren Wetterdaten bleibt deren unveränderter `current.time` nur thermische Referenz; reale Wetterzeitstempel werden nicht umgeschrieben. Das Wetterrisikofenster läuft ab dem tatsächlichen Planstart.
- Spätere auswählbare Zeiten bleiben reale zukünftige Prognosepunkte.
- Situationswechsel werden im Tagesverlauf als neutrale Marker sichtbar, auch wenn der Wechsel keine Kleidungsaktion auslöst. Sie sind keine zusätzlichen Outfitwechsel und verändern die Planner-/Engine-Logik nicht.
