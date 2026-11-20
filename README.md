[English](README.md) | [日本語](README.ja.md)

# Conformal World Map Hexaflexagon

A hexaflexagon is a two-dimensional cousin of the Kaleidocycle: a folded paper hexagon that you flex to reveal different faces.
This repository contains a paper model of a hexaflexagon with a world map printed on it, and a web app for designing your own.
Each portion of the world is mapped onto a hexagon while preserving angles (that is, conformally) using the
[Schwarz–Christoffel mapping](https://en.wikipedia.org/wiki/Schwarz%E2%80%93Christoffel_mapping).
The world-map model was designed by Lai Hsin-Yu and Kai-Hsiang Wang during the
[NCTS Undergraduate Summer Research Program 2018](https://ncts.ntu.edu.tw/news_detail.php?nid=59) (Taiwan, 23 Jul – 24 Aug 2018).

## Web app

**Open it here: <https://shizuo-kaji.github.io/worldhexaflex/>** (English / Japanese; nothing to install).
It also runs offline: download this repository and open [webapp/index.html](webapp/index.html) in a browser.

- Upload several photos and crop a hexagon for each face (drag to move, wheel/pinch to zoom, rotate).
- Make any face a globe: click a world map (or pick a city or region, or type a latitude/longitude) to choose its centre, and the surrounding part of the Earth is mapped conformally onto the hexagon by the stereographic projection followed by the Schwarz–Christoffel map. One click can turn every face into a globe (one face per continent, or spread evenly over the Earth).
- The “How the map works” tab explains conformal maps visually: linked pictures of the globe, the disk and the hexagon (point anywhere to see the same spot in all three), and a playground where the SC map turns a disk into a polygon.
- Choose the number of faces (3–12) and print an A4 template with mountain/valley marks. By default it is single-sided: the back is printed mirrored next to the front, so you fold along the blue line and glue. Separate front and back sheets are also available.
- Follow animated step-by-step folding instructions generated for the chosen flexagon.
- Simulate pinch flexes in 3D, and explore the transition graph (the states form a triangulated polygon whose vertices are the faces).

## Paper model

- [worldmap_hexagon_all.pdf](worldmap_hexagon_all.pdf): the six-faced hexaflexagon with a conformally printed world map.
- [instruction_hexaflexa_long.pdf](instruction_hexaflexa_long.pdf): a detailed, illustrated guide to folding the hexaflexagon and the Kaleidocycle ([Japanese version](instruction_hexaflexa_long_jp.pdf)).
- [instruction_short.pdf](instruction_short.pdf): a one-page summary of the above (in Japanese).
- [paper-K8.pdf](paper-K8.pdf), [paper-K9.pdf](paper-K9.pdf): Kaleidocycle nets with 8 and 9 tetrahedra.

What you need: a colour printer, scissors, glue or adhesive tape, and patience.
Print worldmap_hexagon_all.pdf, cut out the three pieces, and follow instruction_hexaflexa_long.pdf to assemble them.

## Credits

- World-map hexaflexagon: Lai Hsin-Yu and Kai-Hsiang Wang (NCTS Undergraduate Summer Research Program 2018).
- Coastlines in the web app: NOAA/NGDC World Coast Line (public domain), as distributed with the Asymptote examples in TeX Live; stitched into closed outlines and simplified.
- Pat notation, generating sequences and the pinch flex follow Scott Sherman’s flexagon notation.
