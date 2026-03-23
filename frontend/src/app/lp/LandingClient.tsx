"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ── Intersection Observer helper ───────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ── Animated section wrapper ────────────────────────────────── */
function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Suit badge ───────────────────────────────────────────────── */
function Suit({ suit, className = "" }: { suit: "♠" | "♥" | "♦" | "♣"; className?: string }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <span className={`select-none font-bold ${red ? "text-[#c0392b]" : "text-[#ddd6c8]"} ${className}`}>
      {suit}
    </span>
  );
}

/* ── Feature card ─────────────────────────────────────────────── */
function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-8 transition-all duration-300 hover:border-[#c9a84c]/40 hover:bg-[#192118]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#c9a84c]/0 to-[#c9a84c]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-[#c9a84c]/5 group-hover:to-transparent" />
      <div className="relative">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#2a3828] bg-[#0d1009] text-[#c9a84c]">
          {icon}
        </div>
        <h3 className="mb-3 font-display text-xl font-semibold text-[#ddd6c8]">{title}</h3>
        <p className="text-sm leading-relaxed text-[#9a8e7a]">{body}</p>
      </div>
    </div>
  );
}

/* ── Step card ────────────────────────────────────────────────── */
function StepCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/50 bg-[#c9a84c]/10 font-display text-base font-bold text-[#c9a84c]">
        {num}
      </div>
      <div>
        <h4 className="mb-1 font-semibold text-[#ddd6c8]">{title}</h4>
        <p className="text-sm leading-relaxed text-[#9a8e7a]">{body}</p>
      </div>
    </div>
  );
}

/* ── Premium benefit row ──────────────────────────────────────── */
function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-[#ddd6c8]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/20 text-[#c9a84c]">
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7L10 1" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Main LP Component                                            */
/* ══════════════════════════════════════════════════════════════ */
export default function LandingClient() {
  return (
    <div className="min-h-screen bg-[#0d1009] font-sans text-[#ddd6c8]">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#1f2a1e]/60 bg-[#0d1009]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3828] bg-[#131a14]">
              <Suit suit="♠" className="text-lg" />
            </div>
            <span className="font-display text-lg font-semibold tracking-wide text-[#ddd6c8]">
              Poker SNS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-sm text-[#9a8e7a] transition-colors hover:text-[#ddd6c8] sm:inline"
            >
              ログイン
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-[#c9a84c]/60 px-4 py-2 text-sm font-medium text-[#c9a84c] transition-all hover:bg-[#c9a84c] hover:text-[#0d1009]"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a84c]/5 blur-[120px]" />
          <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[#c9a84c]/3 blur-[100px]" />
        </div>

        {/* Floating suits */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute top-[12%] left-[8%] select-none font-bold text-[#ddd6c8] text-5xl opacity-[0.04]" style={{ transform: "rotate(-12deg)" }}>♠</span>
          <span className="absolute top-[20%] right-[6%] select-none font-bold text-[#c0392b] text-7xl opacity-[0.04]" style={{ transform: "rotate(8deg)" }}>♥</span>
          <span className="absolute bottom-[25%] left-[5%] select-none font-bold text-[#c0392b] text-6xl opacity-[0.04]" style={{ transform: "rotate(16deg)" }}>♦</span>
          <span className="absolute bottom-[15%] right-[8%] select-none font-bold text-[#ddd6c8] text-5xl opacity-[0.04]" style={{ transform: "rotate(-8deg)" }}>♣</span>
        </div>

        {/* Badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a84c]" />
          <span className="text-xs font-medium tracking-widest text-[#c9a84c] uppercase">
            日本初・ポーカー特化SNS
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative mb-6 max-w-3xl text-center font-display text-5xl font-bold leading-[1.12] tracking-tight text-[#ddd6c8] sm:text-6xl lg:text-7xl">
          ポーカーを、
          <br />
          <span className="bg-gradient-to-r from-[#c9a84c] via-[#e0c068] to-[#c9a84c] bg-clip-text text-transparent">
            もっと深く。
          </span>
        </h1>

        <p className="relative mb-10 max-w-xl text-center text-lg leading-relaxed text-[#9a8e7a]">
          ハンドを共有し、戦略を議論し、上達を加速する。
          <br className="hidden sm:block" />
          ポーカープレイヤーのための専用コミュニティ。
        </p>

        {/* CTA */}
        <div className="relative flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-[#c9a84c] px-8 py-4 text-base font-semibold text-[#0d1009] shadow-[0_4px_24px_rgba(201,168,76,0.25)] transition-all hover:bg-[#d4b965] hover:shadow-[0_4px_32px_rgba(201,168,76,0.35)]"
          >
            無料アカウントを作成
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-[#2a3828] px-8 py-4 text-base font-medium text-[#9a8e7a] transition-all hover:border-[#3a4838] hover:text-[#ddd6c8]"
          >
            機能を見る
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#6b7a66]">
            <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── Social proof strip ──────────────────────────────── */}
      <section className="border-y border-[#1f2a1e] bg-[#080a08] py-8">
        <FadeSection>
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6">
            {[
              { val: "ポーカーハンド", label: "専用投稿フォーマット" },
              { val: "リアルタイム", label: "フィード更新" },
              { val: "Premium", label: "広告フリー・文字数拡張" },
              { val: "100%", label: "日本語対応" },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="font-display text-xl font-bold text-[#c9a84c]">{val}</span>
                <span className="text-xs text-[#6b7a66]">{label}</span>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <FadeSection className="mb-16 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#c9a84c]">Features</p>
            <h2 className="font-display text-4xl font-bold text-[#ddd6c8] sm:text-5xl">
              ポーカーに特化した、<br className="hidden sm:block" />すべての機能。
            </h2>
            <p className="mt-4 text-[#9a8e7a]">一般SNSでは得られない、ポーカー専用の体験を。</p>
          </FadeSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="4" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7 8h8M7 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
                title: "ポーカーハンド投稿",
                body: "ホールカード、ボードカード、アクションシーケンスを専用フォームで構造化投稿。読みやすいハンドレビューが誰でも簡単に。",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
                title: "リアルタイムタイムライン",
                body: "フォロー中のプレイヤーの最新ハンドや投稿が即座に流れる。無限スクロールで快適なブラウジング。",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M3 6h16M3 11h10M3 16h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
                title: "戦略的ディスカッション",
                body: "いいね・リプライ・リポストでハンドを深掘り。ハッシュタグで話題のトレンドに参加しよう。",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2L13.5 8H20L14.5 12L16.5 18L11 14L5.5 18L7.5 12L2 8H8.5L11 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                ),
                title: "Premiumメンバーシップ",
                body: "広告非表示、投稿文字数1000文字、バッジ表示。本気のプレイヤーのための上位プラン。",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M14 14c0-2.21-2.686-4-6-4s-6 1.79-6 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M19 12v4M17 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
                title: "フォロー & コミュニティ",
                body: "プレイヤーをフォローして成長を追う。ブックマーク、ブロック、ミュートで快適な環境をカスタマイズ。",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M3 3h7v7H3zM12 3h7v7h-7zM3 12h7v7H3zM15.5 12v7M12 15.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: "アフィリエイト連携",
                body: "ポーカールーム、ツール、学習コンテンツのパートナーと連携。信頼性の高い情報でコミュニティをサポート。",
              },
            ].map((f, i) => (
              <FadeSection key={f.title} delay={i * 80}>
                <FeatureCard {...f} />
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#080a08]">
        <div className="mx-auto max-w-4xl">
          <FadeSection className="mb-16 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#c9a84c]">How it works</p>
            <h2 className="font-display text-4xl font-bold text-[#ddd6c8] sm:text-5xl">
              3ステップで始める
            </h2>
          </FadeSection>

          <div className="grid gap-12 sm:grid-cols-3">
            {[
              {
                num: "01",
                title: "アカウント作成",
                body: "メールアドレスで30秒登録。プロフィールを設定してプレイヤーとして参加しよう。",
              },
              {
                num: "02",
                title: "ハンドを投稿",
                body: "専用フォームでポジション、スタック、アクションを入力。美しくフォーマットされたハンドを投稿。",
              },
              {
                num: "03",
                title: "コミュニティで上達",
                body: "他のプレイヤーのレビューを受け、ディスカッションで戦略を磨き、ゲームを次のレベルへ。",
              },
            ].map((s, i) => (
              <FadeSection key={s.num} delay={i * 120}>
                <StepCard {...s} />
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premium ─────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-[#c9a84c]/20 bg-[#131a14]">
            <div className="grid lg:grid-cols-2">
              {/* Left: copy */}
              <FadeSection className="p-10 lg:p-14">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1">
                  <Suit suit="♠" className="text-sm text-[#c9a84c]" />
                  <span className="text-xs font-medium text-[#c9a84c]">Premium</span>
                </div>
                <h2 className="mb-4 font-display text-3xl font-bold text-[#ddd6c8] sm:text-4xl">
                  上位1%の<br />プレイヤーへ
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-[#9a8e7a]">
                  本気で強くなりたいプレイヤーのためのプレミアムプランで、制限なくコミュニティを活用しよう。
                </p>
                <ul className="mb-10 space-y-3.5">
                  <Benefit>広告完全非表示</Benefit>
                  <Benefit>投稿文字数 1,000文字（通常の約3.5倍）</Benefit>
                  <Benefit>プロフィールにPremiumバッジ表示</Benefit>
                  <Benefit>優先サポート</Benefit>
                </ul>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c9a84c] px-7 py-3.5 text-sm font-semibold text-[#0d1009] transition-all hover:bg-[#d4b965]"
                >
                  Premiumを試す
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </FadeSection>

              {/* Right: decorative */}
              <FadeSection className="relative flex items-center justify-center overflow-hidden bg-[#0d1009] p-10" delay={150}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a84c]/8 to-transparent" />
                <div className="relative grid grid-cols-2 gap-4">
                  {(["♠", "♥", "♦", "♣"] as const).map((s) => (
                    <div
                      key={s}
                      className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#1f2a1e] bg-[#131a14] shadow-lg"
                    >
                      <Suit suit={s} className="text-5xl opacity-60" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-[#c9a84c]/10 blur-2xl" />
                </div>
              </FadeSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── Affiliate / Partners ─────────────────────────────── */}
      <section className="py-28 px-6 bg-[#080a08]">
        <div className="mx-auto max-w-5xl">
          <FadeSection className="mb-14 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#c9a84c]">Partners</p>
            <h2 className="font-display text-4xl font-bold text-[#ddd6c8] sm:text-5xl">
              アフィリエイトパートナー
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-[#9a8e7a]">
              ポーカー関連サービスとの連携により、ユーザーに価値ある情報を提供します。
              パートナー企業はブランド力を持つポーカーコミュニティにリーチできます。
            </p>
          </FadeSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            {[
              { icon: "♠", label: "ポーカールーム", desc: "オンラインカジノ・ポーカーサイト" },
              { icon: "♦", label: "学習コンテンツ", desc: "スクール・コーチング・書籍" },
              { icon: "♥", label: "ツール・ソフト", desc: "HUD・トレーニングソフト" },
              { icon: "♣", label: "グッズ・用品", desc: "チップ・マット・アクセサリー" },
            ].map(({ icon, label, desc }) => (
              <FadeSection key={label}>
                <div className="rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-6 text-center transition-all hover:border-[#c9a84c]/30">
                  <div className="mb-3 text-3xl text-[#c9a84c]/60">{icon}</div>
                  <div className="mb-1 font-semibold text-[#ddd6c8]">{label}</div>
                  <div className="text-xs text-[#6b7a66]">{desc}</div>
                </div>
              </FadeSection>
            ))}
          </div>

          <FadeSection>
            <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#131a14] p-8 sm:p-10 text-center">
              <h3 className="mb-3 font-display text-2xl font-semibold text-[#ddd6c8]">
                パートナーシップのメリット
              </h3>
              <div className="mb-8 grid gap-4 text-sm text-[#9a8e7a] sm:grid-cols-3">
                <div className="rounded-xl border border-[#1f2a1e] p-4">
                  <div className="mb-2 font-semibold text-[#c9a84c]">ターゲット精度</div>
                  ポーカーに特化したユーザーベース。趣味・熱量の高い層に直接リーチ。
                </div>
                <div className="rounded-xl border border-[#1f2a1e] p-4">
                  <div className="mb-2 font-semibold text-[#c9a84c]">コンテキスト露出</div>
                  ハンドレビューや戦略議論の文脈でサービスが自然に紹介される。
                </div>
                <div className="rounded-xl border border-[#1f2a1e] p-4">
                  <div className="mb-2 font-semibold text-[#c9a84c]">透明なレポート</div>
                  クリック数・表示数を管理画面でリアルタイムに確認可能。
                </div>
              </div>
              <a
                href="mailto:support@pokersns.com"
                className="inline-flex items-center gap-2 rounded-xl bg-[#c9a84c] px-8 py-3.5 text-sm font-semibold text-[#0d1009] transition-all hover:bg-[#d4b965]"
              >
                パートナー申請はこちら
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="py-28 px-6">
        <FadeSection>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center gap-4">
              <Suit suit="♠" className="text-3xl opacity-30" />
              <Suit suit="♥" className="text-3xl opacity-30" />
              <Suit suit="♦" className="text-3xl opacity-30" />
              <Suit suit="♣" className="text-3xl opacity-30" />
            </div>
            <h2 className="mb-6 font-display text-4xl font-bold text-[#ddd6c8] sm:text-5xl">
              あなたのポーカーライフを、<br className="hidden sm:block" />
              次のステージへ。
            </h2>
            <p className="mb-10 text-[#9a8e7a]">
              今すぐ無料で参加。ハンドを共有し、議論し、強くなろう。
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-xl bg-[#c9a84c] px-10 py-5 text-lg font-semibold text-[#0d1009] shadow-[0_4px_32px_rgba(201,168,76,0.25)] transition-all hover:bg-[#d4b965] hover:shadow-[0_4px_40px_rgba(201,168,76,0.35)]"
            >
              無料アカウントを作成する
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3.5l5.5 5.5L9 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-[#6b7a66]">クレジットカード不要 · 登録30秒</p>
          </div>
        </FadeSection>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#1f2a1e] bg-[#080a08] py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3828] bg-[#131a14]">
                <Suit suit="♠" className="text-base" />
              </div>
              <span className="font-display text-base font-semibold text-[#ddd6c8]">Poker SNS</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[#6b7a66]">
              <Link href="/terms" className="transition-colors hover:text-[#9a8e7a]">利用規約</Link>
              <Link href="/privacy" className="transition-colors hover:text-[#9a8e7a]">プライバシーポリシー</Link>
              <Link href="/tokushoho" className="transition-colors hover:text-[#9a8e7a]">特定商取引法に基づく表記</Link>
              <Link href="/partners" className="transition-colors hover:text-[#9a8e7a]">パートナー</Link>
              <a href="mailto:support@pokersns.com" className="transition-colors hover:text-[#9a8e7a]">お問い合わせ</a>
            </div>
          </div>
          <div className="border-t border-[#1f2a1e] pt-6 text-center text-xs text-[#6b7a66]">
            &copy; {new Date().getFullYear()} Poker SNS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
