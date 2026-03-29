"use client";

import { useEffect, useState } from "react";
import PokerHandDisplay from "../../components/PokerHandDisplay";
import type { PokerHand } from "../../components/PokerHandDisplay";

export default function HandRenderClient({ hand }: { hand: PokerHand }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // DOMレンダリング完了を待つ
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
  }, []);

  return (
    <div
      id={ready ? "hand-ready" : "hand-loading"}
      style={{
        background: "#0b1209",
        padding: "16px 20px 20px",
        width: "600px",
      }}
    >
      <PokerHandDisplay hand={hand} />
    </div>
  );
}
