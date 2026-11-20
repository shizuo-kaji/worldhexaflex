[English](README.md) | [日本語](README.ja.md)

# 等角世界地図ヘクサフレクサゴン

カライドサイクルの親戚として，ヘクサフレクサゴンというやはりクルクルと回して色々な面が出せる折り紙があります．
ここには世界地図が印刷され，回すたびに世界各地が現れるヘクサフレクサゴンの展開図と，自分だけのヘクサフレクサゴンを作れるWebアプリがあります．
[Schwarz-Christoffel写像](https://en.wikipedia.org/wiki/Schwarz%E2%80%93Christoffel_mapping)というものを利用して，各地域が角度を保って(等角に)六角形の面に写されています．
世界地図のモデルは Lai Hsin-Yu さんと Kai-Hsiang Wang さんにより [NCTS Undergraduate Summer Research Program 2018](https://ncts.ntu.edu.tw/news_detail.php?nid=59)（台湾，2018年7月23日〜8月24日）においてデザインされました．

## Webアプリ

**こちらから使えます：<https://shizuo-kaji.github.io/worldhexaflex/>**（日英対応・インストール不要）．
このリポジトリをダウンロードして [webapp/index.html](webapp/index.html) をブラウザで開けば，オフラインでも動きます．

- 写真を複数アップロードし，拡大縮小・回転しながら各面の六角形を切り取れます．
- 各面を「地球」にもできます．世界地図をクリックして中心にする場所（都市・地域のリストや緯度経度でも可）を選ぶと，その周りの地球が立体射影とSchwarz-Christoffel写像で等角に六角形へ写されます．全部の面を大陸ごと／地球全体に均等に，と一度に設定することもできます．
- 「地図のしくみ」タブでは，地球→円→六角形の流れを，マウスで指した点が3つの図で連動する図や，SC写像の形が円から多角形へ変わる様子で説明します．
- 面の数（3〜12）を選んで，山折り・谷折りの線つきのA4展開図を印刷できます．標準は片面印刷で，裏の絵が表の隣に左右反転して並ぶので，青い線で折り返して貼るだけで両面の帯になります（表と裏を別々に印刷することもできます）．
- 選んだヘクサフレクサゴンに合わせて自動生成された折り方を，アニメーションで一手ずつ確認できます．
- つまんで開く（ピンチフレックス）動きを3Dでシミュレーションし，遷移グラフ（面を頂点とする多角形の三角形分割）も表示します．

## 展開図と説明書

- [worldmap_hexagon_all.pdf](worldmap_hexagon_all.pdf): 世界地図ヘクサフレクサゴン（6面）の展開図
- [instruction_hexaflexa_long_jp.pdf](instruction_hexaflexa_long_jp.pdf): ヘクサフレクサゴンとカライドサイクルの折り方の説明（[英語版](instruction_hexaflexa_long.pdf)）
- [instruction_short.pdf](instruction_short.pdf): 上記の簡易版（1ページ）
- [paper-K8.pdf](paper-K8.pdf), [paper-K9.pdf](paper-K9.pdf): カライドサイクル（四面体8個・9個）の展開図

用意するもの：カラープリンタ，はさみ，のりまたは両面テープ，根気．
worldmap_hexagon_all.pdf を印刷して3つのパーツを切り取り，説明書に従って組み立てます．

## クレジット

- 世界地図ヘクサフレクサゴン：Lai Hsin-Yu, Kai-Hsiang Wang（NCTS Undergraduate Summer Research Program 2018）
- Webアプリの海岸線データ：NOAA/NGDC World Coast Line（パブリックドメイン）．TeX Live 付属の Asymptote のサンプルに含まれるものを，閉じた輪郭につなぎ直して簡略化しました．
- パット表記・生成列・ピンチフレックスの記法は Scott Sherman によるフレクサゴンの記法に従っています．
