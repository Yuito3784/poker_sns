# HyperFrames — Instagram リール（記事プロモ用）

`pokertalk-reels/AGENTS.md` と同じルールを適用します。変更後は必ず `npx hyperframes lint` を実行してください。

## レンダリング

```bash
cd hyperframes-marketing-reels
npx hyperframes preview
npx hyperframes render --output output/reel-hyperframes-article.mp4
```

生成物はリポジトリの `.gitignore` で除外済みです。

## プロンプトから一発レンダー（リポジトリルート）

`../video_prompt.txt` に台本を書き、ルートで `py video.py` を実行すると、`compositions/_generated_from_prompt.html` を生成して `output/from_prompt.mp4` を書き出します（`index.html` は一時差し替えののち復元）。既存の 30 秒リールだけ出す場合は `py video.py --preset marketing`。
