# The Forge: Guide to Realistic AI Prompting

**Nutze die Sprache der Fotografie: Kamera + Linse + Licht + 1-2 technische Details. So sparst du Credits durch bessere Ersttreffer.**

**Status:** Draft / Internal Resource
**Last Updated:** February 2026

## 🎯 The Goal: Beyond "Realistic"
Writing "realistic" or "photorealistic" in a prompt is often the *least* effective way to get a realistic image. AI models trained on billions of images respond better to the *language of photography*—specific cameras, lenses, lighting setups, and famous photographers' styles.

This guide collects the best prompt tokens and structures for Midjourney v6, Stable Diffusion (SDXL/SD3), and Flux.

---

## 📸 Core Components of a Pro Prompt

### 1. The Camera Gear (Hardware)
Don't just say "photo". Specify the equipment.
*   **Cameras:** `Canon EOS R3`, `Sony A7R V`, `Hasselblad X2D 100C`, `Leica M11`, `Nikon Z9`, `Fujifilm GFX 100S`
*   **Film Stocks (for analog vibe):** `Kodak Portra 400`, `Fujifilm Velvia 50`, `Cinestill 800T` (halations), `Ilford HP5` (B&W)
*   **Lenses:**
    *   `85mm f/1.2` (Perfect Portraits, creamy bokeh)
    *   `35mm f/1.4` (Street/Environmental)
    *   `24mm f/2.8` (Wide Landscape/Architecture)
    *   `100mm Macro` (Product details)

### 2. Lighting Setup
Light defines realism.
*   **Natural:** `Golden hour`, `Blue hour`, `Overcast soft light`, `Dappled sunlight` (through trees), `Volumetric lighting` (foggy beams)
*   **Studio:** `Rembrandt lighting`, `Butterfly lighting`, `Softbox`, `Rim light` (separates subject from bg), `Three-point lighting`

### 3. Technical Keywords
*   `Depth of field`, `Bokeh`, `Motion blur` (for action), `Chromatic aberration` (subtle realism imperfection), `Film grain`, `High shutter speed`

---

## 🎨 Master List: Photographers to Reference
Using a photographer's name is a shortcut to a specific lighting and composition style.

### Portraits & Fashion
*   **Annie Leibovitz:** Dramatic, painterly lighting, environmental portraits.
*   **Peter Lindbergh:** Raw, emotional, high-contrast B&W, natural skin texture.
*   **Richard Avedon:** Minimalist, stark white backgrounds, motion, emotion.
*   **Helmut Newton:** Provocative, sharp, high-fashion, nocturnal.
*   **Steve McCurry:** Vibrant colors, intense eye contact, cultural documentary (NatGeo style).

### Landscape & Architecture
*   **Ansel Adams:** High contrast B&W landscapes, dramatic skies.
*   **Andreas Gursky:** Massive scale, patterns, high angle, detailed.
*   **Iwan Baan:** Living architecture, capturing life within buildings.

### Cinematic / Mood
*   **Gregory Crewdson:** Elaborate, movie-set like, surreal suburban scenes, twilight.
*   **Roger Deakins:** (Cinematographer) Perfect composition, silhouettes, practical lighting.

---

## 🛠 Platform-Specific Cheatsheet

### ⚡ Flux (The Current Realism King)
Flux excels at anatomy and skin texture.
*   **Key:** Be conversational but descriptive. It handles complex instruction well.
*   **Trigger:** "iPhone photo", "CCTV footage", "Dashcam", "Amateur photo" (for hyper-realism flaws).
*   **Example:** *“A photo taken on an iPhone 14 Pro of a woman sitting in a cafe, natural window light, slight motion blur on her hand, skin texture visible, candid moment.”*

### 🌌 Midjourney v6
*   **Key:** Likes stylistic words. `--style raw` is essential for realism.
*   **Trigger:** `--s 250` (lower stylize values usually look more photographic).
*   **Example:** *“Portrait of an old sailor, weathered face, storm clouds in background, shot on Hasselblad, f/2.8 --style raw --v 6.0”*

### 🤖 Stable Diffusion (SDXL / SD3)
*   **Key:** Needs specific negative prompts to avoid "plastic" looks (e.g., `(worst quality:2), (low quality:2), (normal quality:2)`).
*   **Trigger:** Use specific checkpoints (like Juggernaut XL or RealVisXL).
*   **Token:** `award-winning photography`, `8k`, `uhd`.

---

## 📝 Copy-Paste Templates

### 1. The "Ultra-Real" Portrait
> **Subject:** [Detailed description of person]
> **Prompt:** `Close-up portrait of [Subject], shot on Sony A7R V, 85mm f/1.2 lens, sharp focus on eyes, visible skin pores and vellus hair, natural soft window lighting from left, neutral background, cinematic color grading, hyper-detailed, raw photo`

### 2. The "E-Commerce" Product Shot
> **Subject:** [Product]
> **Prompt:** `Professional product photography of [Subject], centered composition, floating on minimal geometric podium, soft studio lighting, 3-point lighting setup, 4k, high resolution, commercial advertisement style, shot on Phase One XF`

### 3. The "Candid Social Media" Vibe
> **Subject:** [Action/Scene]
> **Prompt:** `Candid iPhone photo of [Subject], posted on Instagram, natural imperfections, slight grain, flash photography, night out vibe, authentic, unposed`

---

**Pro Tip:** Real photos aren't perfect. Add "imperfections" like `slight film grain`, `lens flare`, or `motion blur` to escape the "AI look".
