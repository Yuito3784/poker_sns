# 音声・画像素材（Git 管理方針）

## インフルエンサー／広告塔（静止画）

- `influencer.png` — 24〜27 秒の **HOST / PR** カットで使用（`compositions/reel-hyperframes-article.html`）。差し替え時は同ファイル名で上書きするか、HTML の `src` を変更。
- 台本・ナレーション案は `scripts/reel-influencer-tower-script.md`。

## BGM（背景音楽）

著作権フリーのトラックを `bgm.mp3` としてこのフォルダに置き、`index.html` に `<audio class="clip" ... src="assets/bgm.mp3">` を追加してください。長さは本リールは **30 秒** 想定です（ループやフェードは編集ソフトまたは Hyperframes の `data-volume` で調整）。

## SE（効果音）

同様に `sfx-hit.wav` などを置き、カット点に合わせて別 `<audio>` クリップを足すと「キメ」が強くなります。現状の構成では **白フラッシュ＋短いシェイク** で SE 相当を視覚化しています。

## 広告塔・顔出しカット

`compositions/reel-hyperframes-article.html` の **24〜27 秒** 付近にプレースホルダ枠があります。差し替え例:

1. 写真を `assets/model.jpg` として保存
2. 同シーン内に `<img class="clip" ... src="assets/model.jpg" />` を追加し、`data-start` / `data-duration` / `data-track-index` を既存ルールに合わせる

画像をコミットするかどうかはチーム方針に従ってください（肖像権・商用利用の範囲を確認すること）。
