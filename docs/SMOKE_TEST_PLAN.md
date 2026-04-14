# Smoke Test Plan (Current)

Stand: 2026-02-19

Dieser Plan beschreibt den aktuellen Smoke-Test-Scope nach Entfernung von Modal-, Ideogram- und LTX-2-Pfaden.

## Ziele

- Kern-Generierungspfade gegen echte APIs validieren.
- Kritische Kosten-/Credits-Logik (reserve/settle/refund) prüfen.
- Asynchrone Job-Flows inkl. Polling/Webhook-Status absichern.
- WMS-Kernfluss für Lagerbetrieb verifizieren.

## Scope

### 1) Image Generation (Replicate)

- Flux 2 Pro (`black-forest-labs/flux-2-pro`)
- Flux 1.1 Pro (`black-forest-labs/flux-1.1-pro`)

Endpoint:
- `POST /api/ventures/[id]/marketing/media` (`mode=text-to-image`)

Checks:
- Request akzeptiert
- Prediction/Result vorhanden
- Asset persistiert
- Credits korrekt abgerechnet

### 2) Video Generation (Replicate + Google Veo)

Replicate:
- Kling 2.6 (`kwaivgi/kling-v2.6`)
- Sora 2 (`openai/sora-2`)
- Veo 3.1 via Replicate (`google/veo-3.1`)
- Minimax (`minimax/video-01`)
- Luma (`lumaai/dream-machine`)

Google direkt:
- Veo 3.1
- Veo 3.1 Fast

Endpoints:
- `POST /api/ventures/[id]/marketing/media` (Replicate)
- bestehende Veo-Route(s) im Projekt für Direct-Google-Checks

Checks:
- Job startet
- Polling/Abschlussstatus korrekt
- Ausgabe-URL erreichbar
- Credits korrekt

### 3) Effects

- Face Swap (Replicate-only)
- Lip Sync
- Motion Transfer

Endpoint-Beispiele:
- `POST /api/ventures/[id]/marketing/faceswap`
- `POST /api/ventures/[id]/marketing/lipsync`
- `POST /api/ventures/[id]/marketing/motion-transfer`

Checks:
- Inputvalidierung
- Async completion
- Asset persistiert
- Credits + Quotas korrekt

### 4) Warehouse WMS

Kernfluss:
- Order Import
- Inbound create/update
- Pickup receipt
- optional photo upload/delete

Checks:
- Statusübergänge korrekt
- API-Fehlerfälle sauber
- Datenkonsistenz in Folge-Endpoints

## Nicht mehr im Scope

- Modal-basierte Generierung
- Ideogram
- LTX-2 Sonderpfade
- Video Stitching über Modal (`/api/ventures/[id]/marketing/media/stitch` ist deaktiviert)

## Testausführung

Primär über:
- `npm run test:smoke:image`
- `npm run test:smoke:video`
- `npm run test:smoke:effects`
- `npm run test:smoke:warehouse`
- `npm run test:smoke`

## Mindestvoraussetzungen

- `TEST_VENTURE_ID`
- `TEST_SESSION_COOKIE`
- Für Effekt-Tests: `TEST_VIDEO_URL`, `TEST_IMAGE_URL`, `TEST_AUDIO_URL`, optional `TEST_DRIVING_VIDEO_URL`

## Akzeptanzkriterien

Ein Run gilt als bestanden, wenn:
- keine Smoke-Suite mit Exit-Code != 0 endet,
- keine 5xx-Fehler in den Kernrouten auftreten,
- Credits nach failed Jobs refundet und nach success settled werden,
- erzeugte Assets abrufbar sind.
