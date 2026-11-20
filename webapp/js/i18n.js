/* UI strings (Japanese / English) */
(function (root) {
  'use strict';
  const S = {
    title: { ja: 'ヘクサフレクサゴン工房', en: 'Hexaflexagon Studio' },
    subtitle: {
      ja: '写真で作る・折り方を見る・動きを試す',
      en: 'Make one from your photos, learn to fold it, play with it',
    },
    faces: { ja: '面の数', en: 'Faces' },
    variant: { ja: 'タイプ', en: 'Type' },
    variantN: { ja: 'タイプ', en: 'Type' },
    straight: { ja: '（まっすぐな帯）', en: ' (straight strip)' },
    tabImages: { ja: '1. 面の絵', en: '1. Faces' },
    tabPrint: { ja: '2. 展開図', en: '2. Template' },
    tabSteps: { ja: '3. 作り方', en: '3. How to fold' },
    tabSim: { ja: '4. 動かす', en: '4. Play' },
    tabExplain: { ja: '5. 地図のしくみ', en: '5. How the map works' },

    // images tab
    uploadTitle: { ja: '画像をアップロード', en: 'Upload images' },
    uploadHint: {
      ja: 'ここにドラッグ＆ドロップ、またはクリックして選択（複数可）',
      en: 'Drop images here or click to choose (multiple allowed)',
    },
    gallery: { ja: 'アップロードした画像', en: 'Uploaded images' },
    galleryEmpty: {
      ja: 'まだ画像がありません。画像がない面は番号つきの模様になります。',
      en: 'No images yet. Faces without an image get a numbered pattern.',
    },
    autoAssign: { ja: '空いている面に順に割り当て', en: 'Fill empty faces in order' },
    faceList: { ja: '各面の絵', en: 'Picture for each face' },
    face: { ja: '面', en: 'Face' },
    faceN: { ja: '面{n}', en: 'Face {n}' },
    appears: { ja: '{d}つの状態で登場', en: 'appears in {d} states' },
    editorTitle: { ja: '面{n} の切り取り', en: 'Crop for face {n}' },
    editorHint: {
      ja: 'ドラッグで移動、ホイール／ピンチで拡大縮小。六角形の中が使われます。細い線は三角形の切れ目です。地球の面では、ドラッグで地球が回り、ホイールで写す範囲が変わります。',
      en: 'Drag to move, wheel / pinch to zoom. The inside of the hexagon is used; thin lines show where it is cut into triangles. On a globe face, dragging turns the globe and the wheel changes how much of it is shown.',
    },
    chooseImage: { ja: 'この面の絵：', en: 'Picture for this face:' },
    earth: { ja: '地球', en: 'Globe' },
    earthTitle: { ja: '地球の場所を選ぶ', en: 'Choose places on the globe' },
    earthHint: {
      ja: '地図をクリックすると、選んでいる面がその地点を中心にした地球になります。番号の印はドラッグで動かせます。黄色の枠がその面に写る範囲です。',
      en: 'Click the map to make the selected face a globe centred there. Drag the numbered markers to move them. The yellow outline shows what the face covers.',
    },
    earthNow: { ja: '面{n}：{p} を中心に表示中', en: 'Face {n}: centred on {p}' },
    earthNone: { ja: '面{n}はまだ地球ではありません。地図をクリックするか、場所を選んでください。', en: 'Face {n} is not a globe yet — click the map or pick a place.' },
    placePick: { ja: '場所を選ぶ…', en: 'Pick a place…' },
    regions: { ja: '地域', en: 'Regions' },
    cities: { ja: '場所', en: 'Places' },
    lat: { ja: '緯度', en: 'Lat' },
    lon: { ja: '経度', en: 'Lon' },
    earthAll: { ja: '全部の面を地球にする', en: 'Make every face a globe' },
    allRegions: { ja: '大陸・海を順に', en: 'Continents and oceans' },
    allSpread: { ja: '地球全体を均等にカバー', en: 'Spread evenly over the globe' },
    earthGrid: { ja: '経緯線', en: 'Graticule' },
    earthMark: { ja: '中心の印', en: 'Centre mark' },
    mapBtn: { ja: '地図画像を変更…', en: 'Use my own map image…' },
    mapReset: { ja: '標準の地図に戻す', en: 'Back to the built-in map' },
    earthCredit: {
      ja: '自分の地図画像は正距円筒図法（横:縦 = 2:1、左端が経度180°W）のものが使えます。標準の海岸線：NOAA/NGDC（パブリックドメイン）。',
      en: 'Your own map must be an equirectangular image (2:1, left edge at 180°W). Built-in coastlines: NOAA/NGDC (public domain).',
    },
    pattern: { ja: '模様', en: 'Pattern' },
    zoom: { ja: '拡大', en: 'Zoom' },
    rotation: { ja: '回転', en: 'Rotate' },
    fit: { ja: 'ぴったり', en: 'Fit' },
    remove: { ja: '削除', en: 'Remove' },
    prevFace: { ja: '← 前の面', en: '← Prev face' },
    nextFace: { ja: '次の面 →', en: 'Next face →' },

    // print tab
    printTitle: { ja: '展開図（A4）', en: 'Template (A4)' },
    printHint: {
      ja: '表面と裏面を印刷して切り取り、裏どうしを貼り合わせます（両面印刷する場合は「長辺とじ」）。赤の実線＝山折り、赤の点線＝谷折り（印刷された面から見て）。灰色の線も両方向に折り目をつけておきます。',
      en: 'Print the front and back sheets, cut them out and glue them back to back (or print double-sided, flip on long edge). Red solid = mountain fold, red dashed = valley fold (seen from the printed side). Crease the grey lines both ways too.',
    },
    printHintFold: {
      ja: '片面だけ印刷すれば作れます。外周の黒い線で切り取り、青い一点鎖線のところで印刷面が外側になるように折り返して（山折り）、内側どうしを貼り合わせます。表と裏の絵がぴったり重なった帯になります。赤の実線＝山折り、赤の点線＝谷折り（印刷された面から見て）。灰色の線も両方向に折り目をつけておきます。',
      en: 'Print on one side only. Cut along the black outline, fold over along the blue dash-dot line with the printed side outwards (mountain fold), and glue the blank sides together; the front and back pictures then line up exactly. Red solid = mountain fold, red dashed = valley fold (seen from the printed side). Crease the grey lines both ways too.',
    },
    printMode: { ja: '印刷のしかた', en: 'Printing' },
    modeFold: { ja: '片面印刷（折り返して貼る）', en: 'Single-sided (fold over and glue)' },
    modeDuplex: { ja: '両面印刷（表と裏を別々に）', en: 'Front and back sheets' },
    modeStatsFold: { ja: '{p}パーツ・{q}ページ', en: '{p} piece(s), {q} page(s)' },
    modeStatsDuplex: { ja: '{p}パーツ・{q}ページ×表裏', en: '{p} piece(s), {q} page(s) × 2 sides' },
    piecesFold: { ja: 'パーツ数: {p}　ページ数: {q}（片面印刷）', en: 'Pieces: {p}   Pages: {q} (one side only)' },
    sheetFold: { ja: '片面印刷', en: 'Single-sided' },
    triSize: { ja: '三角形の一辺', en: 'Triangle side' },
    showNumbers: { ja: '番号を印刷', en: 'Print numbers' },
    showFoldLines: { ja: '山折り・谷折り線', en: 'Fold marks' },
    printBtn: { ja: '印刷する', en: 'Print' },
    download: { ja: '画像で保存', en: 'Save PNG' },
    frontSheet: { ja: '表面', en: 'Front' },
    backSheet: { ja: '裏面（左右反転）', en: 'Back (mirrored)' },
    page: { ja: 'ページ', en: 'page' },
    pieces: { ja: 'パーツ数: {p}　ページ数: {q}（表裏で {r} 枚）', en: 'Pieces: {p}   Pages: {q} (×2 sides = {r})' },
    tooBig: { ja: '三角形が大きすぎてページに入りません。', en: 'Triangles are too large to fit the page.' },
    glue: { ja: 'のりしろ', en: 'glue' },

    // steps tab
    stepsTitle: { ja: '作り方', en: 'How to fold' },
    prev: { ja: '◀ 戻る', en: '◀ Back' },
    next: { ja: '次へ ▶', en: 'Next ▶' },
    play: { ja: '▶ 再生', en: '▶ Play' },
    pause: { ja: '❚❚ 停止', en: '❚❚ Pause' },
    replay: { ja: '↻ もう一度', en: '↻ Again' },
    stepOf: { ja: 'ステップ {i} / {n}', en: 'Step {i} / {n}' },
    s_print_t: { ja: '印刷して切り取る', en: 'Print and cut out' },
    s_print_d: {
      ja: '「2. 展開図」から表面と裏面を印刷し、外周の黒い線に沿って切り取ります。パーツは{p}つです。',
      en: 'Print the front and back sheets from “2. Template” and cut along the black outline. There are {p} piece(s).',
    },
    s_glue_t: { ja: '表と裏を貼り合わせる', en: 'Glue front to back' },
    s_glue_d: {
      ja: '表面のパーツと裏面のパーツを、絵がずれないように裏どうしで貼り合わせます。いま見えているのが表、くるっと回ると裏です。',
      en: 'Glue each front piece to its back piece, back to back, lining up the triangles. You are seeing the front; it turns to show the back.',
    },
    s_print_d_fold: {
      ja: '「2. 展開図」を片面だけ印刷し、外周の黒い線に沿って切り取ります。パーツは{p}つで、どれも表の絵と裏の絵（左右反転）が青い線でつながっています。',
      en: 'Print “2. Template” on one side only and cut along the black outline. There are {p} piece(s); in each, the front picture and the (mirrored) back picture are joined along a blue line.',
    },
    s_glue_t_fold: { ja: '折り返して貼る', en: 'Fold over and glue' },
    s_glue_d_fold: {
      ja: '青い一点鎖線で、印刷面が外側になるように折り返し（山折り）、内側の白い面どうしをのりで貼り合わせます。表と裏で同じ番号の三角形がぴったり重なります。',
      en: 'Fold along the blue dash-dot line with the printed side outwards (mountain fold) and glue the blank insides together. Triangles with the same number line up on both sides.',
    },
    s_join_t: { ja: 'パーツをつなぐ', en: 'Join the pieces' },
    s_join_d: {
      ja: '前のパーツの端ののりしろ（灰色）を、次のパーツの最初の三角形の裏に貼って、1本の帯にします。',
      en: 'Glue the grey tab at the end of each piece under the first triangle of the next piece, making one long strip.',
    },
    s_crease_t: { ja: '折り目をつける', en: 'Pre-crease' },
    s_crease_d: {
      ja: 'すべての三角形の境目を、山折り・谷折りの両方向にしっかり折って折り目をつけます。これで後の作業と、完成後の動きがなめらかになります。',
      en: 'Fold every line between triangles firmly in both directions. This makes the folding and the flexing much smoother.',
    },
    s_fold_t: { ja: '折る（{i}/{n}）', en: 'Fold ({i}/{n})' },
    s_fold_valley: {
      ja: '色のついた部分を、赤い線で<b>手前に</b>折り返します（谷折り）。三角形 {b} が三角形 {a} の{pos}に重なります。',
      en: 'Fold the highlighted part <b>towards you</b> along the red line (valley fold). Triangle {b} lands {pos} triangle {a}.',
    },
    s_fold_mountain: {
      ja: '色のついた部分を、赤い線で<b>向こう側へ</b>折り返します（山折り）。三角形 {b} が三角形 {a} の{pos}に重なります。',
      en: 'Fold the highlighted part <b>away from you</b> along the red line (mountain fold). Triangle {b} lands {pos} triangle {a}.',
    },
    above: { ja: '上', en: 'on top of' },
    below: { ja: '下', en: 'under' },
    s_tab_t: { ja: 'のりしろを貼る', en: 'Glue the tab' },
    s_tab_d: {
      ja: '帯の最後の三角形（のりしろ）が、三角形 1 の{pos}に重なっています。灰色ののりしろ面どうしを貼り合わせて輪にします。',
      en: 'The last triangle of the strip (the tab) now lies {pos} triangle 1. Glue the two grey glue areas together to close the loop.',
    },
    tabAboveTxt: { ja: '上', en: 'on top of' },
    tabBelowTxt: { ja: '下', en: 'under' },
    s_flip_t: { ja: '裏返す', en: 'Turn it over' },
    s_flip_d: { ja: '全体を裏返します。', en: 'Turn the whole thing over.' },
    s_done_t: { ja: '完成！', en: 'Done!' },
    s_done_d: {
      ja: '面{a}が表、面{b}が裏に見えています。「4. 動かす」で動かし方を試してみましょう。',
      en: 'Face {a} is on top and face {b} underneath. Try flexing it in “4. Play”.',
    },
    goSim: { ja: '動かしてみる →', en: 'Try flexing →' },
    viewTilt: { ja: '視点', en: 'View' },

    // simulator
    simTitle: { ja: 'シミュレーター', en: 'Simulator' },
    flexA: { ja: 'つまんで開く A', en: 'Pinch flex A' },
    flexB: { ja: 'つまんで開く B', en: 'Pinch flex B' },
    flexTo: { ja: '→ 面{n}が出る', en: '→ shows face {n}' },
    cannot: { ja: '（ここでは開かない）', en: '(won’t open here)' },
    turnOver: { ja: '裏返す', en: 'Turn over' },
    undo: { ja: '1つ戻る', en: 'Undo' },
    reset: { ja: '最初に戻す', en: 'Reset' },
    autoplay: { ja: '自動で旅する', en: 'Auto tour' },
    stop: { ja: '止める', en: 'Stop' },
    speed: { ja: '速さ', en: 'Speed' },
    topFace: { ja: '表', en: 'Top' },
    bottomFace: { ja: '裏', en: 'Bottom' },
    backView: { ja: '裏側から見ると', en: 'Seen from below' },
    intact: { ja: 'この面は元の絵どおりの並びです', en: 'This face shows its picture as designed' },
    scrambled: {
      ja: 'この面は三角形の並びが元の絵と違います（この面の並びは全部で{k}通り）',
      en: 'The triangles of this face are rearranged ({k} arrangements in total)',
    },
    makeRef: { ja: 'この並びを基準にする', en: 'Use this arrangement as reference' },
    pinchHint: {
      ja: '色つきの点の3つの角を、中心に向かってつまむように折ると、中心が開いて新しい面が出てきます。',
      en: 'Pinch the three coloured corners towards the centre; the middle opens and a new face appears.',
    },
    graphTitle: { ja: '遷移グラフ', en: 'Transition graph' },
    graphHint: {
      ja: '外側の六角形＝面、丸＝状態（表と裏に見える2つの面の組）、線＝つまんで開く操作。丸をクリックするとその状態まで動かします。',
      en: 'Outer hexagons = faces, dots = states (the pair of faces on top and bottom), lines = pinch flexes. Click a dot to flex your way there.',
    },
    visited: { ja: '見つけた状態 {v} / {n}', en: 'States found {v} / {n}' },
    notation: { ja: '構造（パット表記）', en: 'Structure (pat notation)' },
    stateLabel: { ja: '表 {a}・裏 {b}', en: 'top {a} · bottom {b}' },
    computing: { ja: '計算中…', en: 'Computing…' },
    sourceLink: { ja: 'ソースコード・世界地図フレクサゴンの展開図PDF（GitHub）', en: 'Source code and the world-map flexagon PDFs (GitHub)' },

    // how the map works
    exTitle: { ja: '地球を六角形に写すしくみ', en: 'How the globe becomes a hexagon' },
    exIntro: {
      ja: '世界地図フレクサゴンでは、地球の一部を角度を保ったまま（等角に）六角形へ写しています。これは2つの等角写像の組み合わせです。① 立体射影で球面を円の中へ、② シュワルツ・クリストッフェル（SC）写像で円を正六角形へ。',
      en: 'The world-map flexagon maps part of the globe onto a hexagon while preserving angles (conformally). It combines two conformal maps: ① the stereographic projection takes the sphere into a disk, and ② the Schwarz–Christoffel (SC) map takes the disk onto a regular hexagon.',
    },
    exPlace: { ja: '場所', en: 'Place' },
    exRange: { ja: '写す範囲', en: 'Range' },
    exTissot: { ja: '小さな円を並べる', en: 'Show small circles' },
    exCapGlobe: { ja: '地球', en: 'Globe' },
    exCapGlobe2: { ja: '黄色の線の内側を写します', en: 'the inside of the yellow line is mapped' },
    exArrow1: { ja: '立体射影', en: 'stereographic projection' },
    exCapDisk: { ja: '円', en: 'Disk' },
    exCapDisk2: { ja: '円は円に写ります', en: 'circles stay circles' },
    exArrow2: { ja: 'SC写像', en: 'SC map' },
    exCapHex: { ja: '六角形', en: 'Hexagon' },
    exCapHex2: { ja: '赤い6点が角になります', en: 'the six red points become the corners' },
    exHover: {
      ja: '図の上でマウスを動かす（タップする）と、3つの図の同じ地点に紫の円と十字が出ます。円は円のまま、十字は直角のまま—これが等角写像です（左の地球は斜めから見ているので楕円に見えます）。',
      en: 'Move the pointer over a picture (or tap): the same spot is marked in all three with a purple circle and a cross. The circle stays a circle and the cross keeps its right angle — that is what conformal means. (On the globe, circles look like ellipses only because we see it at a slant.)',
    },
    exHere: { ja: '{p} の地点', en: 'The point at {p}' },
    exQ1: { ja: '等角写像ってなに？', en: 'What is a conformal map?' },
    exA1: {
      ja: '角度を変えない写し方です。2本の線が交わる角度は、写した後も同じになります。そのため、ごく小さな図形は形がそのままで、拡大・縮小と回転だけを受けます。六角形の中でも経線と緯線が直角に交わっていることを確かめてみましょう。',
      en: 'A map that never changes angles: two curves crossing at some angle still cross at that angle after mapping. So a very small figure keeps its shape and is only scaled and turned. Check that meridians and parallels still meet at right angles inside the hexagon.',
    },
    exQ2: { ja: '地図はどうしてもゆがむ', en: 'Every map distorts something' },
    exA2: {
      ja: '球面は、伸ばしたり縮めたりせずに平らにすることはできません（ガウスの驚異の定理）。等角写像は形（角度）を守る代わりに、面積の比率を犠牲にします。おなじみのメルカトル図法も等角写像で、グリーンランドが大きく描かれるのはそのためです。オレンジ色の小さな円は地球上ではすべて同じ大きさですが、六角形の中では大きさが変わります（それでも円のままです）。',
      en: 'A sphere cannot be flattened without stretching (Gauss’s Theorema Egregium). A conformal map keeps shapes (angles) and gives up true areas. The familiar Mercator projection is conformal too — that is why Greenland looks huge. The orange circles all have the same size on the globe; in the hexagon their sizes differ, but they stay circles.',
    },
    exQ3: { ja: '① 立体射影', en: '① Stereographic projection' },
    exA3: {
      ja: '中心にしたい地点（黄）の反対側の点 S から光を当て、球面上の点 P の影が、球の中心を通る平面に落ちた点を P の像とします。地球上の円は平面でも円になり、角度も保たれます。中心から90°（半球）がちょうど単位円に収まります。「写す範囲」を変えると、全体を拡大・縮小して（これも角度を変えません）その範囲を円に収めます。',
      en: 'Shine a light from the point S opposite to the chosen centre (yellow). Where the shadow of a point P falls on the plane through the sphere’s centre is its image. Circles on the globe become circles on the plane, and angles are kept. Everything within 90° of the centre (a hemisphere) lands exactly in the unit disk; the Range slider rescales the picture (which also keeps angles) so that a smaller or larger cap fills the disk.',
    },
    exSvgC: { ja: '中心', en: 'centre' },
    exSvgS: { ja: 'S（反対側の点）', en: 'S (antipode)' },
    exSvgPlane: { ja: '平面', en: 'plane' },
    exQ4: { ja: '② シュワルツ・クリストッフェル写像', en: '② The Schwarz–Christoffel map' },
    exA4: {
      ja: '円の内側から多角形の内側への等角写像を与える公式です（クリストッフェル 1867年、シュワルツ 1869年）。円周を一周すると、t⁶ = 1 となる6点で進む向きが60°ずつ曲がり、その間はまっすぐ進むので、境界がちょうど正六角形になります。指数 −1/3 は、角で180°が120° = (1 − 1/3)×180° に縮むことを表します。C ≈ 0.8985 は大きさをそろえる定数です。',
      en: 'A formula for a conformal map from the disk onto a polygon (Christoffel 1867, Schwarz 1869). Going once around the circle, the direction turns by 60° at the six points where t⁶ = 1 and goes straight in between, so the boundary is exactly a regular hexagon. The exponent −1/3 says that 180° shrinks to 120° = (1 − 1/3) × 180° at each corner. C ≈ 0.8985 just sets the size.',
    },
    exQ5: { ja: '角だけは特別', en: 'The corners are special' },
    exA5: {
      ja: '六角形の6つの角では、円周の180°が120°に押しつぶされるので、そこだけは角度が保たれません（赤い点）。角の近くは大きく拡大され、反対に辺の真ん中は中心の約0.79倍（= 2^(−1/3)）に縮みます。',
      en: 'At the six corners, 180° of the circle is squeezed into 120°, so angles are not kept there (red dots). Near a corner the map magnifies strongly, while at the middle of an edge the scale is about 0.79 (= 2^(−1/3)) times that at the centre.',
    },
    exQ6: { ja: 'フレクサゴンとの関係', en: 'Back to the flexagon' },
    exA6: {
      ja: '六角形の面は6つの三角形でできています。白い点線（三角形の切れ目）は、円では直径、地球では中心を通る大円です。つまんで開くと三角形の組み合わせが変わるので、状態によっては地図が“ずれた”面が現れます。探してみましょう。',
      en: 'Each hexagonal face is made of six triangles. The dashed white lines (the cuts between triangles) are diameters of the disk and great circles through the centre on the globe. Pinch flexing regroups the triangles, so in some states the map appears “scrambled” — try to find them.',
    },
    scTitle: { ja: 'SC写像で遊ぶ', en: 'Play with the SC map' },
    scIntro: {
      ja: 'f(z) = ∫₀ᶻ (1 − tᴺ)^(−β) dt で円がどう変わるかを見てみましょう。曲げる強さが 0 なら円のまま、1 で正N角形（β = 2/N）、それより大きいと星形になります。左の格子の小さな四角は、右でも直角を保っています。',
      en: 'See what f(z) = ∫₀ᶻ (1 − tᴺ)^(−β) dt does to the disk. With bend 0 the disk is unchanged, at 1 it becomes a regular N-gon (β = 2/N), and beyond that a star. The little squares of the grid on the left keep their right angles on the right.',
    },
    scN: { ja: '角の数 N', en: 'Corners N' },
    scBend: { ja: '曲げる強さ', en: 'Bend' },
    scPlay: { ja: '▶ 円 → 多角形', en: '▶ Disk → polygon' },
    scCapDisk: { ja: '円（格子つき）', en: 'Disk with a polar grid' },
    scInfo: { ja: 'β = {b}　角の大きさ {a}°', en: 'β = {b} · corner angle {a}°' },
    scHint: { ja: 'どちらかの図の上でマウスを動かすと、対応する点に円と十字が出ます。', en: 'Move the pointer over either picture to see matching circles and crosses.' },
    exCredit: {
      ja: '世界地図フレクサゴンの原案：Lai Hsin-Yu, Kai-Hsiang Wang（NCTS Undergraduate Summer Research Program 2018）。海岸線データ：NOAA/NGDC World Coast Line（パブリックドメイン）。',
      en: 'Original world-map flexagon: Lai Hsin-Yu and Kai-Hsiang Wang (NCTS Undergraduate Summer Research Program 2018). Coastline data: NOAA/NGDC World Coast Line (public domain).',
    },
    footer: {
      ja: 'パット表記とピンチフレックスの定義は Sherman の記法に準拠。状態の地図は面を頂点とする多角形の三角形分割になっています。',
      en: 'Pat notation and the pinch flex follow Sherman’s notation. The state map is a triangulated polygon whose vertices are the faces.',
    },
  };

  let lang = 'ja';
  try {
    const saved = localStorage.getItem('hexaflex-lang');
    if (saved === 'ja' || saved === 'en') lang = saved;
    else if (!(navigator.language || '').startsWith('ja')) lang = 'en';
  } catch (e) { /* ignore */ }

  function t(key, vars) {
    const e = S[key];
    let s = e ? e[lang] || e.en : key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('hexaflex-lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  }
  root.I18N = { t, setLang, get lang() { return lang; } };
})(window);
