# Mobile QA Protocol (Forge OS)

Ziel: Mobile ist first-class. Keine Desktop-Shrink-Version. Diese Checkliste ist das Minimum, bevor ein Feature live geht.

## Breakpoints (Tailwind)
- 320px (iPhone SE)
- 360px (Android small)
- 375px (iPhone 12/13/14)
- 390px (iPhone 15)
- 414px (iPhone Pro Max)
- 768px (iPad mini portrait)
- 1024px (iPad landscape)

## Device Matrix (smoke)
- iOS Safari: iPhone SE, iPhone 14/15
- Android Chrome: Pixel 7/8, Samsung S21
- iPadOS Safari: iPad mini (portrait + landscape)

## Global Acceptance Criteria
- Navigation immer erreichbar (Hamburger + aktiver Titel).
- Content no-clip: keine abgeschnittenen Buttons, Inputs, Modals.
- Touch targets >= 44px, keine dichten Icon-Cluster.
- Lesen ohne Zoom (min. 14px text size, ausreichender Kontrast).
- Keine horizontalen Scroll-Bars außer bewusstes Chips/Carousels.
- Sticky/Header/Overlays blockieren keinen Content-Flow.

## Core Flows (must-pass)
### Auth + Onboarding
- Login -> Dashboard -> Logout (keine Offscreen Buttons).
- Turnstile sichtbar, keine Overflows.

### Forum
- Feed scrollt flüssig, Votes/Comments erreichbar.
- New Post Modal: Editor, Emoji, Upload, Preview und Submit.
- Kommentare: Reply, Edit/Delete, Voting, Threaded view.
- Notifications: anzeigen, als gelesen markieren, Navigation zu Zielpost.

### Messages
- Inbox list -> Thread view -> back to Inbox.
- Search + Start thread -> send message.
- Composer bleibt sichtbar, keine Keyboard-Overlaps.

### Profile
- Follow/Unfollow Button sichtbar, Stats lesbar, DM Start.

### Misc
- Pricing, Apply Form, Chat Widget (Landing).
- Sidebar-Navigation (mobile drawer) aktiv/geschlossen, body lock korrekt.

## Visual/UX Checks
- Text hierarchisch: Headline > Body > Meta.
- Buttons reagieren sichtbar (active/hover states, disabled).
- Icons und Labels niemals abgeschnitten.
- Cards stapeln sauber, kein 2-column squeeze.

## Performance & Stability
- Keine Layout Shifts beim Laden.
- Lazy content (images, infinite scroll) ohne Springen.
- Keine Hydration Warnings im Console Log.

## Defect Severity
- P0: Navigation/Submit blockiert, Datenverlust.
- P1: Layout bricht (Overflows, unclickable elements).
- P2: Lesbarkeit/Spacing schlecht, aber nutzbar.
- P3: Cosmetic (Spacing/Color minor).

## Reporting Template
- Seite / Route
- Gerät / Browser
- Schritte zur Reproduktion
- Erwartet vs. Ist
- Screenshot/Video
