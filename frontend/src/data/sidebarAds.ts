/**
 * 右サイドバー用の広告リスト（楽天アフィリエイト・Amazonアソシエイト等）
 * 日替わりで表示順が変わる。type: "html" は楽天の貼り付けHTML、type: "link" はタイトル+URLのカード。
 */
export type SidebarAdItem =
  | {
      id: string;
      type: "html";
      source: "rakuten";
      /** 楽天の「リンク作成ツール」で取得したHTML（そのまま貼り付け） */
      html: string;
    }
  | {
      id: string;
      type: "link";
      title: string;
      description?: string;
      linkUrl: string;
      source: "amazon" | "rakuten" | "other";
    };

export const SIDEBAR_ADS: SidebarAdItem[] = [
  {
    id: "rakuten-poker-chip-set",
    type: "html",
    source: "rakuten",
    html: '<table border="0" cellpadding="0" cellspacing="0"><tr><td><div style="border:1px solid #95a5a6;border-radius:.75rem;background-color:#FFFFFF;width:504px;margin:0px;padding:5px;text-align:center;overflow:hidden;"><table><tr><td style="width:240px"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad624e.37a6ac63.51ad624f.6aec661f/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fimaging888%2Fmg-101%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/51ad624e.37a6ac63.51ad624f.6aec661f/?me_id=1391328&item_id=10000162&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fimaging888%2Fcabinet%2Fcasino%2F34.jpg%3F_ex%3D240x240&s=240x240&t=picttext" border="0" style="margin:2px" alt="ポーカーセット" title="ポーカーセット"></a></td><td style="vertical-align:top;width:248px;display: block;"><p style="font-size:12px;line-height:1.4em;text-align:left;margin:0px;padding:2px 6px;word-wrap:break-word"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad624e.37a6ac63.51ad624f.6aec661f/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fimaging888%2Fmg-101%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;">【最強配送】 カジノセット ポーカーセット 【本格的なポーカー体験を貴方に】 カジノチップ チップ ポーカーチップ 麻雀チップ カジノ ポーカー 麻雀 (ゲームチップ) 5色 100枚 200枚 300枚 500枚</a><br><span >価格：2,480円～（税込、送料無料)</span> <span style="color:#BBB">(2026/3/8時点)</span></p><div style="margin:10px;"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad624e.37a6ac63.51ad624f.6aec661f/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fimaging888%2Fmg-101%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://static.affiliate.rakuten.co.jp/makelink/rl.svg" style="float:left;max-height:27px;width:auto;margin-top:0" ></a><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad624e.37a6ac63.51ad624f.6aec661f/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fimaging888%2Fmg-101%2F%3Fscid%3Daf_pc_bbtn&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ==" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><div style="float:right;width:41%;height:27px;background-color:#bf0000;color:#fff!important;font-size:12px;font-weight:500;line-height:27px;margin-left:1px;padding: 0 12px;border-radius:16px;cursor:pointer;text-align:center;"> 楽天で購入 </div></a></div></td></tr></table></div></td></tr></table>',
  },
  {
    id: "rakuten-poker-mat-set",
    type: "html",
    source: "rakuten",
    html: '<table border="0" cellpadding="0" cellspacing="0"><tr><td><div style="border:1px solid #95a5a6;border-radius:.75rem;background-color:#FFFFFF;width:504px;margin:0px;padding:5px;text-align:center;overflow:hidden;"><table><tr><td style="width:240px"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad6589.f936f98c.51ad658a.dabfe577/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fmorimotoshoji%2Fcompass1740633529%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/51ad6589.f936f98c.51ad658a.dabfe577/?me_id=1431297&item_id=10000010&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fmorimotoshoji%2Fcabinet%2Fcompass1764060299.jpg%3F_ex%3D240x240&s=240x240&t=picttext" border="0" style="margin:2px" alt="ポーカーセット" title="ポーカーセット"></a></td><td style="vertical-align:top;width:248px;display: block;"><p style="font-size:12px;line-height:1.4em;text-align:left;margin:0px;padding:2px 6px;word-wrap:break-word"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad6589.f936f98c.51ad658a.dabfe577/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fmorimotoshoji%2Fcompass1740633529%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;">【スーパーSALE P5倍】ポーカーマット ポーカーセット カジノセット【5点セット】 ALL IN DEALER トランプ 収容ケース 収容バッグ 本格ポーカー　プロ仕様</a><br><span >価格：3,280円～（税込、送料無料)</span> <span style="color:#BBB">(2026/3/8時点)</span></p><div style="margin:10px;"><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad6589.f936f98c.51ad658a.dabfe577/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fmorimotoshoji%2Fcompass1740633529%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://static.affiliate.rakuten.co.jp/makelink/rl.svg" style="float:left;max-height:27px;width:auto;margin-top:0" ></a><a href="https://hb.afl.rakuten.co.jp/ichiba/51ad6589.f936f98c.51ad658a.dabfe577/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fmorimotoshoji%2Fcompass1740633529%2F%3Fscid%3Daf_pc_bbtn&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ==" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><div style="float:right;width:41%;height:27px;background-color:#bf0000;color:#fff!important;font-size:12px;font-weight:500;line-height:27px;margin-left:1px;padding: 0 12px;border-radius:16px;cursor:pointer;text-align:center;"> 楽天で購入 </div></a></div></td></tr></table></div></td></tr></table>',
  },
  {
    id: "amazon-poker-1",
    type: "link",
    title: "Amazonでポーカー関連を見る",
    description: "ポーカー本・グッズ",
    linkUrl: "https://amzn.to/3MPB3ZN",
    source: "amazon",
  },
  {
    id: "amazon-poker-2",
    type: "link",
    title: "Amazonでポーカー関連を見る",
    description: "ポーカー本・グッズ",
    linkUrl: "https://amzn.to/47fDsDS",
    source: "amazon",
  },
];

/** サイドバーに同時に表示する広告数（日替わりでこの数だけ表示。4なら全件） */
export const SIDEBAR_ADS_DISPLAY_COUNT = 4;
