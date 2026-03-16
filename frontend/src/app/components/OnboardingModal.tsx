"use client";

import { useState } from "react";
import Link from "next/link";

interface OnboardingModalProps {
  onClose: () => void;
}

const steps = [
  {
    title: "ようこそ Poker SNS へ",
    description:
      "ポーカープレイヤーのためのコミュニティへようこそ。ハンド共有、戦略ディスカッション、トーナメント情報など、ポーカーに関するすべてがここに。",
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#c9a84c" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    title: "プロフィールを設定しよう",
    description:
      "アバターや自己紹介を設定して、あなたのポーカープロフィールを完成させましょう。他のプレイヤーからの信頼度がアップします。",
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#c9a84c" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    action: (
      <Link
        href="/settings"
        className="mt-3 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
        style={{ background: "#c9a84c", color: "#0d1009" }}
      >
        プロフィール設定へ
      </Link>
    ),
  },
  {
    title: "さあ、始めよう",
    description:
      "トレンドのハッシュタグをチェックしたり、初めての投稿をしてみましょう。ポーカーハンドの共有もできます。",
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#c9a84c" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  const handleComplete = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: "#131a14", border: "1px solid #2a3828" }}
      >
        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-8 rounded-full transition-colors"
              style={{ background: i <= step ? "#c9a84c" : "#2a3828" }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(154,124,53,0.08))",
              border: "1.5px solid rgba(201,168,76,0.3)",
            }}
          >
            {current.icon}
          </div>
        </div>

        {/* Content */}
        <h2 className="mb-2 text-center text-lg font-semibold" style={{ color: "#ddd6c8" }}>
          {current.title}
        </h2>
        <p className="mb-4 text-center text-sm leading-relaxed" style={{ color: "#9a8e7a" }}>
          {current.description}
        </p>

        {current.action && <div className="mb-4 text-center">{current.action}</div>}

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleComplete}
            className="text-sm transition-colors hover:underline"
            style={{ color: "#6b7a66" }}
          >
            スキップ
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "#c9a84c", color: "#0d1009" }}
            >
              次へ
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "#c9a84c", color: "#0d1009" }}
            >
              始める
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
