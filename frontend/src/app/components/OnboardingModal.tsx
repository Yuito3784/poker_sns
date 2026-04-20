"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, fetchWithAuth } from "../../lib/api";

/* ── Types ─────────────────────────────────────────��───── */
interface OnboardingModalProps {
  onClose: () => void;
}

type PersonalizationData = {
  experience: string;
  playStyle: string;
  goal: string;
  frequency: string;
};

/* ── Animation variants ────────────────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

/* ── Total steps ────────────────────────────────────────── */
const TOTAL_STEPS = 7;

/* ── Suit icon component ──────────────────────────────── */
function SuitIcon({ suit, size = "text-4xl" }: { suit: string; size?: string }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <span className={`select-none font-bold ${red ? "text-[#c0392b]" : "text-[#c9a84c]"} ${size}`}>
      {suit}
    </span>
  );
}

/* ── Option button ─────────────────────────────────────── */
function OptionButton({
  label,
  sublabel,
  selected,
  onClick,
  icon,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors"
      style={{
        background: selected ? "rgba(201,168,76,0.12)" : "#0d1009",
        borderColor: selected ? "#c9a84c" : "#2a3828",
      }}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: selected ? "#c9a84c" : "#ddd6c8" }}>
          {label}
        </div>
        {sublabel && (
          <div className="mt-0.5 text-xs" style={{ color: "#6b7a66" }}>
            {sublabel}
          </div>
        )}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: "#c9a84c" }}
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1.5" stroke="#0d1009" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Main OnboardingModal                                     */
/* ══════════════════════════════════════════════════════════ */
export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [personalization, setPersonalization] = useState<PersonalizationData>({
    experience: "",
    playStyle: "",
    goal: "",
    frequency: "",
  });
  const [enjoyRating, setEnjoyRating] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    onClose();
  }, [onClose]);

  const handleCheckout = useCallback(async (plan: "monthly" | "annual") => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/subscriptions/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          localStorage.setItem("hasCompletedOnboarding", "true");
          window.location.href = data.checkoutUrl;
          return;
        }
      }
    } catch {
      // fall through to complete
    }
    handleComplete();
  }, [handleComplete]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true; // welcome
      case 1: return !!personalization.experience;
      case 2: return !!personalization.playStyle;
      case 3: return !!personalization.goal;
      case 4: return !!personalization.frequency;
      case 5: return true; // review prompt
      case 6: return true; // paywall
      default: return true;
    }
  };

  /* ── Step 0: Welcome ────────────────────────────── */
  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center">
      {/* Animated card flip */}
      <motion.div
        className="mb-8 flex gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {(["♠", "♥", "♦", "♣"] as const).map((s, i) => (
          <motion.div
            key={s}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
            className="flex h-16 w-12 items-center justify-center rounded-lg border"
            style={{ background: "#131a14", borderColor: "#2a3828" }}
          >
            <SuitIcon suit={s} size="text-2xl" />
          </motion.div>
        ))}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mb-3 font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight"
        style={{ color: "#ddd6c8" }}
      >
        PokerTALK へようこそ
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mb-6 max-w-sm text-sm leading-relaxed"
        style={{ color: "#9a8e7a" }}
      >
        テーブルの外でも、ポーカーを語ろう。
        <br />
        あなたに最適な体験を用意するために、いくつか質問させてください。
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-2 rounded-full border px-4 py-2"
        style={{ borderColor: "#2a3828", background: "#080a08" }}
      >
        <div className="h-2 w-2 rounded-full" style={{ background: "#c9a84c" }} />
        <span className="text-xs" style={{ color: "#6b7a66" }}>所要時間：約30秒</span>
      </motion.div>
    </div>
  );

  /* ── Step 1: Experience ─────────────────────────── */
  const renderExperience = () => (
    <div>
      <h2 className="mb-2 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
        ポーカー歴は？
      </h2>
      <p className="mb-6 text-center text-sm" style={{ color: "#6b7a66" }}>
        あなたに合ったコンテンツをおすすめします
      </p>
      <div className="space-y-3">
        {[
          { value: "beginner", label: "これから始める", sublabel: "ルールを覚えたばかり" },
          { value: "under1y", label: "1年未満", sublabel: "基本は分かってきた" },
          { value: "1to5y", label: "1〜5年", sublabel: "レギュラーで打ってる" },
          { value: "over5y", label: "5年以上", sublabel: "ベテランプレイヤー" },
        ].map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={personalization.experience === opt.value}
            onClick={() => setPersonalization((p) => ({ ...p, experience: opt.value }))}
          />
        ))}
      </div>
    </div>
  );

  /* ── Step 2: Play style ─────────────────────────── */
  const renderPlayStyle = () => (
    <div>
      <h2 className="mb-2 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
        よくプレイするのは？
      </h2>
      <p className="mb-6 text-center text-sm" style={{ color: "#6b7a66" }}>
        同じスタ��ルのプレイヤーとつながれます
      </p>
      <div className="space-y-3">
        {[
          { value: "live", label: "ライブポーカー", sublabel: "アミューズメント・カジノ", icon: <SuitIcon suit="♠" size="text-xl" /> },
          { value: "online", label: "オンラインポーカー", sublabel: "GGPoker・PokerStarsなど", icon: <SuitIcon suit="♥" size="text-xl" /> },
          { value: "both", label: "両方プレイする", sublabel: "ライブもオンラインも", icon: <SuitIcon suit="♦" size="text-xl" /> },
          { value: "starting", label: "これから始める", sublabel: "まだプレイしたことがない", icon: <SuitIcon suit="♣" size="text-xl" /> },
        ].map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={personalization.playStyle === opt.value}
            onClick={() => setPersonalization((p) => ({ ...p, playStyle: opt.value }))}
            icon={opt.icon}
          />
        ))}
      </div>
    </div>
  );

  /* ── Step 3: Goal ───────────────────────────────── */
  const renderGoal = () => (
    <div>
      <h2 className="mb-2 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
        PokerTALK で一番やりたいことは？
      </h2>
      <p className="mb-6 text-center text-sm" style={{ color: "#6b7a66" }}>
        あなたの目的に合���せた体験を提供します
      </p>
      <div className="space-y-3">
        {[
          { value: "share", label: "ハンドを記録・共有したい", sublabel: "セッションの振り返りに" },
          { value: "connect", label: "ポーカー仲間と交流したい", sublabel: "語り合える場所がほしい" },
          { value: "improve", label: "もっと上手くなりたい", sublabel: "議論やレビューで学びたい" },
          { value: "all", label: "全部やりたい", sublabel: "PokerTALK をフル活用" },
        ].map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={personalization.goal === opt.value}
            onClick={() => setPersonalization((p) => ({ ...p, goal: opt.value }))}
          />
        ))}
      </div>
    </div>
  );

  /* ── Step 4: Frequency ──────────────────────────── */
  const renderFrequency = () => (
    <div>
      <h2 className="mb-2 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
        どのくらいポーカーをプレイする？
      </h2>
      <p className="mb-6 text-center text-sm" style={{ color: "#6b7a66" }}>
        セッション頻度に合わせた通知を設定します
      </p>
      <div className="space-y-3">
        {[
          { value: "daily", label: "ほぼ毎日", sublabel: "ポーカーが日課" },
          { value: "weekly", label: "週に数回", sublabel: "定期的にプレイ" },
          { value: "monthly", label: "月に数回", sublabel: "時間があるときに" },
          { value: "rarely", label: "たまに", sublabel: "気が向いたら" },
        ].map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={personalization.frequency === opt.value}
            onClick={() => setPersonalization((p) => ({ ...p, frequency: opt.value }))}
          />
        ))}
      </div>
    </div>
  );

  /* ── Step 5: Review prompt + Plan generation ────── */
  const renderReviewAndPlan = () => {
    const planFeatures = (() => {
      const features = ["セッション後のハンド投稿"];
      if (personalization.playStyle === "live" || personalization.playStyle === "both") {
        features.push("ライブ勢コミュニティとの交流");
      }
      if (personalization.playStyle === "online" || personalization.playStyle === "both") {
        features.push("オンラインプレイヤーとの議論");
      }
      if (personalization.goal === "improve" || personalization.goal === "all") {
        features.push("AIハンド分析で弱点を発見");
      }
      if (personalization.goal === "connect" || personalization.goal === "all") {
        features.push("同レベルプレイヤーとのマッチング");
      }
      features.push("週間プレイ振り返りレポート");
      return features;
    })();

    const experienceLabel: Record<string, string> = {
      beginner: "ポーカー初心者",
      under1y: "ポーカー歴1年未満",
      "1to5y": "ポーカー歴1〜5年",
      over5y: "ベテランプレイヤー",
    };

    return (
      <div>
        {/* Enjoyment check */}
        {enjoyRating === null ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h2 className="mb-2 text-xl font-bold" style={{ color: "#ddd6c8" }}>
              ここまでの体験はいかがですか？
            </h2>
            <p className="mb-8 text-sm" style={{ color: "#6b7a66" }}>
              タップで教えてください
            </p>
            <div className="flex justify-center gap-6">
              {[
                { emoji: "😍", value: 5 },
                { emoji: "😊", value: 4 },
                { emoji: "😐", value: 3 },
              ].map(({ emoji, value }) => (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setEnjoyRating(value);
                    // For positive ratings, try to prompt review
                    if (value >= 4 && typeof window !== "undefined") {
                      // Web doesn't have native review API - just proceed
                    }
                    // Start generating plan
                    setGenerating(true);
                    setTimeout(() => setGenerating(false), 1500);
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl transition-colors"
                  style={{ borderColor: "#2a3828", background: "#0d1009" }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : generating ? (
          /* Loading animation */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-8"
          >
            <motion.div
              className="mb-6 flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  className="h-3 w-3 rounded-full"
                  style={{ background: "#c9a84c" }}
                />
              ))}
            </motion.div>
            <p className="text-sm font-medium" style={{ color: "#c9a84c" }}>
              あなた専用のプランを作成中...
            </p>
          </motion.div>
        ) : (
          /* Personalized plan */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 text-center">
              <span
                className="inline-block rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "#c9a84c40", background: "#c9a84c15", color: "#c9a84c" }}
              >
                {experienceLabel[personalization.experience] || "ポーカープレイヤー"}のあなたへ
              </span>
            </div>
            <h2 className="mb-6 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
              あなた専用のプラン
            </h2>
            <div
              className="space-y-3 rounded-xl border p-5"
              style={{ borderColor: "#2a3828", background: "#080a08" }}
            >
              {planFeatures.map((feat, i) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#c9a84c20" }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-sm" style={{ color: "#ddd6c8" }}>
                    {feat}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  /* ── Step 6: Soft paywall ───────────────────────── */
  const renderPaywall = () => (
    <div>
      <div className="mb-2 text-center">
        <span
          className="inline-block rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: "#c9a84c", background: "#c9a84c20", color: "#c9a84c" }}
        >
          Premium
        </span>
      </div>
      <h2 className="mb-2 text-center text-xl font-bold" style={{ color: "#ddd6c8" }}>
        もっとポーカーを語ろう
      </h2>
      <p className="mb-6 text-center text-sm" style={{ color: "#6b7a66" }}>
        Premiumで制限なく楽しめます
      </p>

      {/* Annual plan - emphasized */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => handleCheckout("annual")}
        className="relative mb-3 w-full rounded-xl border-2 p-5 text-left"
        style={{ borderColor: "#c9a84c", background: "rgba(201,168,76,0.08)" }}
      >
        <div
          className="absolute -top-3 left-4 rounded-full px-3 py-0.5 text-xs font-bold"
          style={{ background: "#c9a84c", color: "#0d1009" }}
        >
          おすすめ
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-bold" style={{ color: "#ddd6c8" }}>
              年間プラン
            </div>
            <div className="mt-1 text-xs" style={{ color: "#6b7a66" }}>
              7日間無料トライアル付き
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: "#c9a84c" }}>
              ¥490<span className="text-xs font-normal">/月</span>
            </div>
            <div className="text-xs line-through" style={{ color: "#6b7a66" }}>
              ¥980/月
            </div>
          </div>
        </div>
        <div
          className="mt-3 rounded-lg py-2 text-center text-sm font-semibold"
          style={{ background: "#c9a84c", color: "#0d1009" }}
        >
          無料で始める
        </div>
      </motion.button>

      {/* Monthly plan */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => handleCheckout("monthly")}
        className="mb-4 w-full rounded-xl border p-4 text-left"
        style={{ borderColor: "#2a3828", background: "#0d1009" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: "#9a8e7a" }}>
              月額プラン
            </div>
            <div className="mt-0.5 text-xs" style={{ color: "#6b7a66" }}>
              トライアルなし
            </div>
          </div>
          <div className="text-sm font-bold" style={{ color: "#9a8e7a" }}>
            ¥980<span className="text-xs font-normal">/月</span>
          </div>
        </div>
      </motion.button>

      {/* Premium benefits */}
      <div className="mb-4 space-y-2">
        {[
          "広告完全非表示",
          "投稿文字数 1,000文字",
          "AIハンド分析 無制限",
          "Premiumバッジ表示",
        ].map((benefit) => (
          <div key={benefit} className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs" style={{ color: "#9a8e7a" }}>
              {benefit}
            </span>
          </div>
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={handleComplete}
        className="w-full py-2 text-center text-xs transition-colors hover:underline"
        style={{ color: "#6b7a66" }}
      >
        あとで（無料プランで続ける）
      </button>
    </div>
  );

  /* ── Render current step ────────────────────────── */
  const renderStep = () => {
    switch (step) {
      case 0: return renderWelcome();
      case 1: return renderExperience();
      case 2: return renderPlayStyle();
      case 3: return renderGoal();
      case 4: return renderFrequency();
      case 5: return renderReviewAndPlan();
      case 6: return renderPaywall();
      default: return null;
    }
  };

  const showNextButton = step < TOTAL_STEPS - 1 && !(step === 5 && (enjoyRating === null || generating));
  const showBackButton = step > 0 && step < TOTAL_STEPS - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0d1009" }}
    >
      {/* Background decorative suits */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute top-[8%] left-[6%] select-none text-6xl font-bold opacity-[0.03]" style={{ color: "#c9a84c" }}>♠</span>
        <span className="absolute top-[15%] right-[8%] select-none text-7xl font-bold opacity-[0.03]" style={{ color: "#c0392b" }}>♥</span>
        <span className="absolute bottom-[20%] left-[4%] select-none text-5xl font-bold opacity-[0.03]" style={{ color: "#c0392b" }}>♦</span>
        <span className="absolute bottom-[10%] right-[6%] select-none text-6xl font-bold opacity-[0.03]" style={{ color: "#c9a84c" }}>♣</span>
      </div>

      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: "rgba(201,168,76,0.08)" }} />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-6">
        <div className="mx-auto flex max-w-md gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{ background: i <= step ? "#c9a84c" : "#1f2a1e" }}
            />
          ))}
        </div>
        {/* Step counter */}
        <div className="mx-auto mt-2 max-w-md text-right">
          <span className="text-[10px]" style={{ color: "#6b7a66" }}>
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Skip button (top right) */}
      {step < TOTAL_STEPS - 1 && (
        <button
          onClick={handleComplete}
          className="absolute top-6 right-6 z-10 text-xs transition-colors hover:underline"
          style={{ color: "#6b7a66" }}
        >
          スキップ
        </button>
      )}

      {/* Content area */}
      <div className="relative w-full max-w-md px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {(showNextButton || showBackButton) && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-8">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            {showBackButton ? (
              <button
                onClick={goBack}
                className="rounded-lg px-4 py-2.5 text-sm transition-colors"
                style={{ color: "#6b7a66" }}
              >
                戻る
              </button>
            ) : (
              <div />
            )}
            {showNextButton && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                disabled={!canProceed()}
                className="rounded-xl px-8 py-3 text-sm font-semibold transition-all"
                style={{
                  background: canProceed() ? "#c9a84c" : "#2a3828",
                  color: canProceed() ? "#0d1009" : "#6b7a66",
                  opacity: canProceed() ? 1 : 0.5,
                }}
              >
                {step === 0 ? "始める" : "次へ"}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
