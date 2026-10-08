# Gasriese · Volumen-Demo (WebGPU)

**Tech-Demo / Experiment.** Ein Gasriese als Volumen im Browser: ein Planetenfoto verschiebt ein kugelförmiges Dichtefeld, ein WebGPU-Raymarcher rendert es mit Selbstschatten, Atmosphäre und Kino-Nachbearbeitung.
*English: an experimental WebGPU demo. A planet photo displaces a spherical density field that is volume-ray-marched with self-shadowing, a haze shell and cinematic post-processing. A from-scratch re-implementation of a technique shown in a public Blender tutorial.*

![Vorschau](docs/vorschau.png)

> Kein fertiges Produkt: ein Lern- und Vergleichsexperiment. Das Bild ist ein **Standbild-Renderer** (es summiert Samples über viele Bilder), **keine Echtzeit-Simulation**: Nichts bewegt sich außer Kamera und Objektdrehung.

## Was passiert

Würfel-Mesh mit Volumen, Dichte aus einer Äquirektangular-Karte `C` (Objektkoordinaten `p` im Würfel −1…1):

1. `q = p · (1 − f + f·C)` – die Karte verzerrt den Raum (Multiply-Mix mit Faktor `f`). Helle Stellen ziehen die Oberfläche nach innen, dunkle nach außen: ein **Höhenfeld über der Kugel**.
2. `g = max(0,999999 − |q|, 0)` – Kugel-Gradient.
3. Dichte `d = [g ≥ t]` (harte Rampe) oder `clamp(g/t, 0, 1)` (weiche Rampe).
4. Streuung im Volumen, nur direktes Sonnenlicht (Einfachstreuung):
   `L = ∫ T(0,s) · σs(s) · f_HG(θ) · E_sonne · T_sonne(s) ds`, `T = exp(−∫σt)` (Beer-Lambert), Henyey-Greenstein-Phase.
5. Zweites, weiches Dichtefeld als Atmosphäre; beide addiert (σt und σs summieren sich).
6. Farbabbildung **AgX**, danach optional Bloom, Korn, Vignette, Farbsaum, Grading, Letterbox, Sterne (diese Teile gehören **nicht** zum Verfahren und sind einzeln abschaltbar).

Der Tiefeneindruck kommt aus echter Geometrie (Silhouette und Selbstschatten), nicht aus einer Normalenkarte. Bei hohem `f` wirken Fotodetails daher wie Nadeln und „flauschig“ – das ist ein Höhenfeld aus Helligkeit, keine physikalische Wolkenhöhe.

## Herkunft und Dank

- **Verfahren:** Das Grundprinzip (Bildtextur verzerrt eine Kugel-Gradient-Dichte, `ColorRamp` auf „Constant“, zweites Volumen als Atmosphäre) wird in dem öffentlichen Tutorial
  *„[Blender Tutorial] Create an Epic Volumetric Gas Giant!“* von **Arghanion's Puzzlebox** gezeigt ([YouTube](https://www.youtube.com/watch?v=CrAn6j8S1gg)), das nach eigener Angabe auf Arbeiten von **Rui Huang** aufbaut. Dieses Projekt ist **nicht** von den beiden, nicht mit ihnen verbunden und nicht von ihnen geprüft.
- **Code:** komplett neu in WGSL/JavaScript geschrieben. Es wurden keine Blender-Dateien, kein Tutorial-Material und kein Blender-Code übernommen. Einzelne Formeln (Kugel-Gradient, Kugelprojektion, Multiply-Mix) wurden gegen Blenders dokumentiertes Verhalten geprüft und selbst formuliert.
- **AgX:** Konstanten wie in [three.js](https://github.com/mrdoob/three.js) (MIT); AgX stammt von Troy Sobotka.
- **Entstanden mit KI-Unterstützung** (Claude, Anthropic) als Werkzeug.

## Daten

`karten/jupiter_4k_solarsystemscope.jpg` (4096×2048): **Solar System Scope**, <https://www.solarsystemscope.com/textures/>, Lizenz **CC BY 4.0**, auf Basis von NASA-Daten (Cassini). Die Datei heißt dort „8k“, ist aber 4096×2048. Eigene Karten lassen sich auf die Seite ziehen.

## Starten

Braucht einen WebGPU-Browser (Chrome/Edge ab 113) und einen kleinen Webserver (ES-Module laufen nicht per `file://`):

```bash
node server.mjs 5206
# dann http://localhost:5206/ öffnen
```

Bedienung: Ziehen = drehen, Mausrad = Zoom, `H` = Bedienfeld aus/ein, Doppelklick auf einen Regler = diesen zurücksetzen, oben „Alles zurücksetzen“.

## Lizenz

Code: MIT (siehe `LICENSE`). Karte: CC BY 4.0, Namensnennung siehe Abschnitt Daten.

## Grenzen (ehrlich)

- Standbild-Renderer, bei Bewegung beginnt er neu und rauscht; hoher Rechenaufwand. Bildraten wurden nicht systematisch gemessen.
- Getestet nur mit Chrome auf einer NVIDIA RTX 5080.
- Das Muster ist ein statisches Foto. Strömung, Wirbel, Zeit gibt es nicht.
- Einige Standardwerte (Atmosphärendichte, Rampenposition, Sonnenwinkel) sind nach Augenmaß gesetzt.

## Bausteine (`bloecke/`)

| Datei | Aufgabe |
|---|---|
| `wgsl/medium.js` | Dichtefeld: Mix → Gradient → Invert → ColorRamp, plus Atmosphäre |
| `wgsl/licht.js` | Sonnen-Transmittanz, Henyey-Greenstein, Einfachstreuung |
| `wgsl/farbe.js`, `rauschen.js`, `zufall.js` | Farbquelle (Karte oder Noise/Voronoi), Hash-Rauschen, PCG |
| `wgsl/rechnen.js`, `hdr.js` | Compute-Kernel, Sample-Mittelung, Sterne |
| `wgsl/bloom.js`, `kino.js`, `agx.js` | Nachbearbeitung |
| `js/*.js` | Regler, Kamera, Renderer, Schleife |
