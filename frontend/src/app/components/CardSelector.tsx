"use client";

import { useState } from "react";

type CardSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  multiple?: boolean;
  maxCards?: number;
  disabledCards?: string[];
};

const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const suits = [
  { value: "s", symbol: "♠", color: "#6a7a68", bg: "rgba(106,122,104,.1)",  name: "Spades"   },
  { value: "h", symbol: "♥", color: "#b84040", bg: "rgba(184,64,64,.1)",    name: "Hearts"   },
  { value: "d", symbol: "♦", color: "#3d6ba0", bg: "rgba(61,107,160,.1)",   name: "Diamonds" },
  { value: "c", symbol: "♣", color: "#3a8060", bg: "rgba(58,128,96,.1)",    name: "Clubs"    },
];

function MiniCard({ card }: { card: string }) {
  const suit = suits.find((s) => s.value === card.slice(-1));
  const rank = card.slice(0, -1);
  if (!suit) return null;
  return (
    <div style={{
      width: 34, height: 48,
      background: "#f5f2ec",
      borderRadius: 5,
      border: `1.5px solid ${suit.color}28`,
      boxShadow: "0 2px 6px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.95)",
      position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: suit.color, fontWeight: 800, userSelect: "none", flexShrink: 0,
    }}>
      <div style={{ position:"absolute", top:2, left:3, display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1.05 }}>
        <span style={{ fontSize:9 }}>{rank}</span>
        <span style={{ fontSize:9 }}>{suit.symbol}</span>
      </div>
      <span style={{ fontSize:18, lineHeight:1 }}>{suit.symbol}</span>
      <div style={{ position:"absolute", bottom:2, right:3, display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1.05, transform:"rotate(180deg)" }}>
        <span style={{ fontSize:9 }}>{rank}</span>
        <span style={{ fontSize:9 }}>{suit.symbol}</span>
      </div>
    </div>
  );
}

export default function CardSelector({
  value,
  onChange,
  label,
  multiple = false,
  maxCards = 1,
  disabledCards = [],
}: CardSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? value.split(" ").filter(Boolean) : [];

  const toggle = (rank: string, suitVal: string) => {
    const card = `${rank}${suitVal}`;
    if (disabledCards.includes(card)) return;
    if (multiple) {
      onChange(
        selected.includes(card)
          ? selected.filter((c) => c !== card).join(" ")
          : selected.length < maxCards
          ? [...selected, card].join(" ")
          : value
      );
    } else {
      onChange(card);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {label && (
        <label style={{ color: "#6b7a66", fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6, letterSpacing: .2 }}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", width: "100%", minHeight: 44,
          alignItems: "center", gap: 8,
          borderRadius: 8, border: "1px solid #1f2a1e",
          background: "#0d1009", padding: "8px 12px",
          outline: "none", cursor: "pointer",
          transition: "border-color .15s",
        }}
      >
        {selected.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selected.map((card) => <MiniCard key={card} card={card} />)}
          </div>
        ) : (
          <span style={{ color: "#6b7a66", fontSize: 13 }}>カードを選択...</span>
        )}
        <svg
          style={{
            marginLeft: "auto", width: 16, height: 16, flexShrink: 0,
            color: "#6b7a66", transition: "transform .15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Popup */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute z-20 mt-2 overflow-hidden"
            style={{
              width: "min(100vw - 1.5rem, 460px)",
              borderRadius: 10,
              background: "#131a14",
              border: "1px solid #1f2a1e",
              boxShadow: "0 24px 48px rgba(0,0,0,.65), 0 0 0 1px rgba(201,168,76,.05)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #1f2a1e" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7a66", letterSpacing: .5, textTransform: "uppercase" }}>
                カードを選択
              </span>
              {selected.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {selected.map((card) => {
                      const s = suits.find((su) => su.value === card.slice(-1));
                      return (
                        <span key={card} style={{ color: s?.color, fontSize: 12, fontWeight: 800 }}>
                          {card.slice(0, -1)}{s?.symbol}
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    style={{
                      padding: "2px 8px", fontSize: 11, color: "#6b7a66",
                      background: "transparent", border: "1px solid #2a3828",
                      borderRadius: 4, cursor: "pointer",
                    }}
                  >
                    クリア
                  </button>
                </div>
              )}
            </div>

            {/* Card grid */}
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {suits.map((suit) => (
                <div key={suit.value} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Suit icon */}
                  <div style={{
                    display: "flex", width: 28, height: 28, flexShrink: 0,
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 6, fontSize: 14, fontWeight: 700,
                    color: suit.color, background: suit.bg,
                    border: `1px solid ${suit.color}1a`,
                  }}>
                    {suit.symbol}
                  </div>

                  {/* Rank buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {ranks.map((rank) => {
                      const card = `${rank}${suit.value}`;
                      const isSel = selected.includes(card);
                      const isDis = disabledCards.includes(card);
                      return (
                        <button
                          key={card}
                          type="button"
                          onClick={() => toggle(rank, suit.value)}
                          disabled={isDis}
                          style={{
                            width: 30, height: 36,
                            borderRadius: 4,
                            fontWeight: 800, fontSize: 12,
                            transition: "all .1s",
                            cursor: isDis ? "not-allowed" : "pointer",
                            color: isDis ? "#2a3828" : isSel ? "#0d1009" : suit.color,
                            background: isDis ? "#0d1009" : isSel ? suit.color : "rgba(255,255,255,.025)",
                            border: isDis
                              ? "1.5px solid #1f2a1e"
                              : isSel
                              ? `1.5px solid ${suit.color}`
                              : "1.5px solid #1f2a1e",
                            boxShadow: isSel ? `0 2px 8px ${suit.color}30` : "none",
                            transform: isSel ? "scale(1.05)" : "scale(1)",
                          }}
                        >
                          {rank}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {multiple && maxCards > 1 && (
              <div style={{ borderTop: "1px solid #1f2a1e", padding: "8px 14px", textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#6b7a66" }}>
                  {selected.length} / {maxCards} 枚選択中
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
