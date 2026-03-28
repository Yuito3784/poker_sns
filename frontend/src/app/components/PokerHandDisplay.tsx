"use client";

import { useState, useEffect } from "react";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export type PokerAction = {
  id?: string;
  position: string;
  actionType: string;
  amount?: string | null;
  order: number;
};

export type PokerStreet = {
  id?: string;
  street: "PREFLOP" | "FLOP" | "TURN" | "RIVER";
  boardCards?: string | null;
  actions: PokerAction[];
  potSize?: string | null;
  order: number;
};

export type PokerHand = {
  id: string;
  tableType: string;
  blinds: string;
  tableSize: string;
  heroStack: string;
  heroPosition: string;
  heroHand?: string | null;
  result?: string | null;
  streets: PokerStreet[];
};

const SUIT: Record<string, { sym: string; color: string; bg: string }> = {
  s: { sym: "♠", color: "#8a8e92", bg: "#6b7178" },
  h: { sym: "♥", color: "#d47040", bg: "#c4613a" },
  d: { sym: "♦", color: "#4a7bb5", bg: "#4272a8" },
  c: { sym: "♣", color: "#4a9b6e", bg: "#3e8c5e" },
};

const ACTION: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
  FOLD:   { label: "Fold",   bg: "rgba(74,82,69,.13)",    fg: "#6b7a66",  bd: "rgba(74,82,69,.25)" },
  CHECK:  { label: "Check",  bg: "rgba(100,110,90,.14)",  fg: "#5e6e56",  bd: "rgba(100,110,90,.28)" },
  CALL:   { label: "Call",   bg: "rgba(120,110,75,.14)",  fg: "#7a7050",  bd: "rgba(120,110,75,.28)" },
  BET:    { label: "Bet",    bg: "rgba(201,168,76,.14)",  fg: "#a89040",  bd: "rgba(201,168,76,.3)" },
  RAISE:  { label: "Raise",  bg: "rgba(201,168,76,.22)",  fg: "#c9a84c",  bd: "rgba(201,168,76,.42)" },
  ALL_IN: { label: "All-In", bg: "rgba(201,168,76,.32)",  fg: "#d4b85a",  bd: "rgba(201,168,76,.55)" },
};

/** 結果ラベルの表示用。Lost - Eliminated は他と同様に「Lost」のみ表示 */
function formatResultLabel(result: string | null | undefined): { text: string; title?: string } {
  if (!result) return { text: "" };
  const r = result.trim();
  if (/^lost\s*[-–—]\s*eliminated$/i.test(r)) {
    return { text: "Lost" };
  }
  return { text: r };
}

// ── Playing card ─────────────────────────────────────────────────
function Card({ card, size = "md" }: { card: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const cfg = SUIT[suit] ?? { sym: "?", color: "#888", bg: "#666" };
  const d = {
    xs: { w: 20, h: 28, rank: 10, sym: 10, gap: 0 },
    sm: { w: 26, h: 36, rank: 12, sym: 13, gap: 0 },
    md: { w: 36, h: 50, rank: 16, sym: 18, gap: 1 },
    lg: { w: 48, h: 66, rank: 20, sym: 24, gap: 2 },
  }[size];
  return (
    <div style={{
      width: d.w, height: d.h, background: cfg.bg,
      borderRadius: 5, border: "none",
      boxShadow: "0 2px 8px rgba(0,0,0,.45)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: d.gap,
      color: "#fff", userSelect: "none", flexShrink: 0,
    }}>
      <span style={{ fontSize: d.rank, lineHeight: 1, fontWeight: 800 }}>{rank}</span>
      <span style={{ fontSize: d.sym, lineHeight: 1 }}>{cfg.sym}</span>
    </div>
  );
}

// ── Suit-colored inline text card ────────────────────────────────
function Pip({ card, bright = false }: { card: string; bright?: boolean }) {
  const cfg = SUIT[card.slice(-1)] ?? { sym: "?", color: "#888", bg: "#666" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: -0.2,
      color: "#fff", background: bright ? "rgba(201,168,76,.8)" : cfg.bg,
      padding: "1px 4px", borderRadius: 3,
    }}>
      {card.slice(0, -1)}{cfg.sym}
    </span>
  );
}

// ── Pot label ────────────────────────────────────────────────────
function Chip({ label }: { label: string }) {
  return (
    <div style={{
      background: "rgba(201,168,76,.1)",
      color: "#c9a84c", fontWeight: 700, fontSize: 9,
      padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap",
      border: "1px solid rgba(201,168,76,.22)",
      letterSpacing: 0.5,
      backdropFilter: "blur(4px)",
    }}>
      {label}
    </div>
  );
}

// ── Position badge ───────────────────────────────────────────────
function PosBadge({ label, isHero }: { label: string; isHero: boolean }) {
  return (
    <span style={{
      background: isHero ? "rgba(201,168,76,.1)" : "rgba(42,56,40,.45)",
      color: isHero ? "#c9a84c" : "#6b7a66",
      border: isHero ? "1px solid rgba(201,168,76,.22)" : "1px solid #1f2a1e",
      fontSize: 8, fontWeight: 700, padding: "1.5px 5px",
      borderRadius: 3, letterSpacing: 0.3, flexShrink: 0,
      maxWidth: 46, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// 0bb や空の amount は表示しない（オールインで残り0・コールで差額0のときの表記ゆれ対策）
function formatActionAmount(amount: string | null | undefined): string {
  if (!amount || amount.trim() === "") return "";
  const normalized = amount.replace(/\s/g, "");
  if (normalized === "0bb" || /^0(\.0+)?bb$/i.test(normalized)) return "";
  return ` ${amount}`;
}

// ── Action badge ─────────────────────────────────────────────────
function ActionBadge({ action }: { action: PokerAction }) {
  const cfg = ACTION[action.actionType] ?? ACTION.CALL;
  const label = cfg.label + formatActionAmount(action.amount ?? null);
  return (
    <span style={{
      background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.bd}`,
      fontSize: 8, fontWeight: 700, padding: "1.5px 5px",
      borderRadius: 3, letterSpacing: 0.1,
      whiteSpace: "normal", wordBreak: "break-word", minWidth: 0,
    }}>
      {label}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────
export default function PokerHandDisplay({ hand }: { hand: PokerHand }) {
  const isMobile = useIsMobile();
  const STREET_ORDER = ["PREFLOP", "FLOP", "TURN", "RIVER"] as const;
  const STREET_NAME: Record<string, string> = { PREFLOP:"Preflop", FLOP:"Flop", TURN:"Turn", RIVER:"River" };

  const availableStreets = STREET_ORDER.filter((s) => hand.streets?.find((st) => st.street === s));

  // ── Player data ──────────────────────────────────────────────
  const players = Array.from(new Set(
    (hand.streets ?? []).flatMap((s) =>
      (s.actions ?? []).map((a) => a.position === hand.heroPosition ? "Hero" : a.position)
    )
  ));
  const total = players.length;
  const heroWon = /won|win/i.test(hand.result ?? "");
  const heroLost = /lost/i.test(hand.result ?? "");
  const info = Object.fromEntries(players.map((p) => {
    const pos = p === "Hero" ? hand.heroPosition : p;
    const isWinner = total === 2
      ? (p === "Hero" ? heroWon : heroLost)
      : (p === "Hero" && heroWon);
    return [p, {
      pos,
      cards: p === "Hero" && hand.heroHand ? hand.heroHand.split(" ").filter(Boolean) : [],
      isDealer: pos === "BTN",
      isWinner,
    }];
  }));

  // ── Seat positions (ellipse): テーブル上の物理的な席順（BTN→SB→BB→UTG→…）で並べる
  const tablePositionOrder: Record<string, number> = { BTN:0, SB:1, BB:2, UTG:3, UTG1:4, UTG2:5, MP:6, MP1:7, MP2:8, CO:9 };
  const hero = "Hero";
  const others = players.filter(p=>p!==hero).sort((a,b)=>(tablePositionOrder[info[a]?.pos??a]??99)-(tablePositionOrder[info[b]?.pos??b]??99));
  const CX=50, CY=50;
  const R = isMobile ? 36 : 38;
  const seats: Record<string, {x:number;y:number}> = {};
  const H_ANGLE = 90;
  if (players.includes(hero)) {
    const r = (H_ANGLE*Math.PI)/180;
    seats[hero] = { x: CX+R*Math.cos(r), y: CY+R*Math.sin(r) };
  }
  others.forEach((p,i) => {
    const angle = H_ANGLE + ((i+1)*360)/total;
    const r = (angle*Math.PI)/180;
    seats[p] = { x: CX+R*Math.cos(r), y: CY+R*Math.sin(r) };
  });

  // ── Board cards: 最初から全枚表示（切り替えなし）────────────────
  const getFullBoard = () => {
    const cards: string[] = [];
    const get = (s: string) => hand.streets?.find(x=>x.street===s)?.boardCards;
    const flop = get("FLOP"); const turn = get("TURN"); const river = get("RIVER");
    if (flop) cards.push(...flop.split(" ").filter(Boolean));
    if (turn) cards.push(...turn.split(" ").filter(Boolean));
    if (river) cards.push(...river.split(" ").filter(Boolean));
    return cards;
  };
  const boardCards = getFullBoard();
  const lastStreetWithPot = [...STREET_ORDER].reverse().find((s) => hand.streets?.find((st) => st.street === s)?.potSize);
  const curPot = lastStreetWithPot ? hand.streets?.find(s=>s.street===lastStreetWithPot)?.potSize ?? null : null;
  // result の "Won Xbb" はヒーローの純利益。pot より小さいのは正常（オールイン差額・サイドポット等）

  // ── Action columns（BLINDS は上部表示のため省略）────────────────
  const allCols: { key:string; name:string; data:PokerStreet|null }[] = [];
  for (const s of STREET_ORDER) {
    const data = hand.streets?.find(st=>st.street===s) ?? null;
    if (data) allCols.push({ key:s, name:STREET_NAME[s], data });
  }

  const blindsMatch = hand.blinds.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);

  const won  = /won|win/i.test(hand.result ?? "");
  const lost = /lost/i.test(hand.result ?? "");
  // 自分が負けたヘッズアップは「Lost」ではなく「BB Won」等の勝者表記にする
  const lastStreetWithActions = [...(hand.streets ?? [])].reverse().find((s) => (s.actions?.length ?? 0) > 0);
  const activeInLastStreet = new Set(
    (lastStreetWithActions?.actions ?? []).filter((a) => a.actionType !== "FOLD").map((a) => a.position)
  );
  const resultDisplay = (() => {
    if (!hand.result) return { text: "", showAsWon: false, showAsLost: false };
    if (lost && activeInLastStreet.size === 2 && activeInLastStreet.has(hand.heroPosition)) {
      const winnerPos = [...activeInLastStreet].find((p) => p !== hand.heroPosition);
      if (winnerPos) return { text: `${winnerPos} Won`, showAsWon: true, showAsLost: false };
    }
    const { text } = formatResultLabel(hand.result);
    return { text, showAsWon: won, showAsLost: lost };
  })();

  if (availableStreets.length === 0) return null;

  return (
    <div style={{ marginTop:12, borderRadius:12, overflow:"hidden", background:"#0b1209", border:"1px solid rgba(255,255,255,.06)" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.05)", background:"rgba(0,0,0,.18)" }}>
        <span style={{ background:"rgba(201,168,76,.06)", border:"1px solid rgba(201,168,76,.14)", color:"#7a6030", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:3, letterSpacing:.5 }}>
          {hand.tableType}
        </span>
        <span style={{ background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.2)", color:"#c9a84c", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:3 }}>
          {hand.blinds}
        </span>
        <span style={{ background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.22)", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:3 }}>
          {hand.tableSize}
        </span>
        <span style={{ color:"rgba(255,255,255,.1)" }}>·</span>
        <span style={{ fontSize:11, color:"rgba(255,255,255,.28)" }}>
          Hero{" "}
          <span style={{ color:"#c9a84c", fontWeight:700 }}>{hand.heroPosition}</span>
          {"  ·  Stack "}
          <span style={{ color:"rgba(221,214,200,.55)", fontWeight:600 }}>{hand.heroStack}</span>
        </span>
        {hand.result && resultDisplay.text && (
          <span style={{ marginLeft:"auto" }}>
            <span style={{
              fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:3, letterSpacing:.4,
              ...(resultDisplay.showAsWon
                ? { background:"rgba(201,168,76,.14)", color:"#c9a84c", border:"1px solid rgba(201,168,76,.28)" }
                : resultDisplay.showAsLost
                  ? { background:"rgba(176,48,48,.1)", color:"#905050", border:"1px solid rgba(176,48,48,.2)" }
                  : { background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.32)", border:"1px solid rgba(255,255,255,.08)" }),
            }}>
              {resultDisplay.text}
            </span>
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ position:"relative", width:"100%", aspectRatio:"8/5.5", overflow:"visible" }}>
        {/* Rail */}
        <div style={{
          position:"absolute", top:"8%", left:"10%", width:"80%", height:"84%",
          borderRadius:"50%",
          background:"linear-gradient(160deg, #4a2a10 0%, #2e1608 40%, #3e2010 80%, #221008 100%)",
          boxShadow:"0 8px 32px rgba(0,0,0,.75), inset 0 2px 4px rgba(255,200,100,.03)",
        }} />
        {/* Felt */}
        <div style={{
          position:"absolute", top:"14%", left:"16%", width:"68%", height:"72%",
          borderRadius:"50%",
          background:"radial-gradient(ellipse at 50% 38%, #174513 0%, #0c3209 55%, #061c03 100%)",
          boxShadow:"inset 0 0 55px rgba(0,0,0,.6), inset 0 3px 8px rgba(0,0,0,.5)",
          overflow:"hidden",
        }}>
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"radial-gradient(circle at 1px 1px, rgba(255,255,255,.01) 1px, transparent 0)",
            backgroundSize:"12px 12px",
          }} />
        </div>

        {/* Board cards */}
        {boardCards.length > 0 && (
          <div style={{ position:"absolute", inset:0, zIndex:10, display:"flex", alignItems:"center", justifyContent:"center", paddingBottom:"8%", pointerEvents:"none" }}>
            <div style={{ display:"flex", gap: isMobile ? 3 : 5 }}>
              {boardCards.map((c,i) => <Card key={`${c}-${i}`} card={c} size={isMobile ? "sm" : "md"} />)}
            </div>
          </div>
        )}

        {/* Pot（ボード中央寄りに固定してカードと被らないように） */}
        {curPot && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: boardCards.length > 0 ? "56%" : "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <Chip label={`POT  ${curPot}`} />
          </div>
        )}

        {/* Seats */}
        {players.map((player) => {
          const pi = info[player]; if (!pi) return null;
          const seat = seats[player]; if (!seat) return null;
          const isHero = player === "Hero";
          return (
            <div key={player} style={{ position:"absolute", zIndex:20, left:`${seat.x}%`, top:`${seat.y}%`, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                {pi.isWinner && (
                  <div style={{
                    background:"rgba(201,168,76,.12)", color:"#c9a84c",
                    border:"1px solid rgba(201,168,76,.28)",
                    fontSize:7, fontWeight:800, padding:"1px 6px", borderRadius:3, letterSpacing:.6,
                    flexShrink:0,
                  }}>
                    WIN
                  </div>
                )}
                {/* Avatar — clean dark circle with position text */}
                <div style={{
                width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius:"50%",
                background: isHero
                  ? "radial-gradient(circle at 40% 35%, rgba(201,168,76,.14), rgba(201,168,76,.06))"
                  : "radial-gradient(circle at 40% 35%, #192118, #0f1510)",
                border: `2px solid ${isHero ? "rgba(201,168,76,.45)" : "#2a3828"}`,
                boxShadow: isHero
                  ? "0 0 14px rgba(201,168,76,.18), 0 4px 10px rgba(0,0,0,.65)"
                  : "0 4px 10px rgba(0,0,0,.65)",
                display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative", flexShrink:0,
              }}>
                <span style={{
                  fontSize: pi.pos.length > 2 ? 6.5 : 8,
                  fontWeight: 800,
                  letterSpacing: .3,
                  color: isHero ? "#c9a84c" : "#6b7a66",
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                }}>
                  {isHero ? hand.heroPosition : pi.pos}
                </span>
                {pi.isDealer && (
                  <div style={{
                    position:"absolute", top:-4, right:-4,
                    width:14, height:14, borderRadius:"50%",
                    background:"rgba(221,214,200,.88)",
                    border:"1.5px solid rgba(0,0,0,.45)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:7, fontWeight:900, color:"#0d1009",
                  }}>
                    D
                  </div>
                )}
              </div>
              </div>

              {pi.cards.length > 0 && (
                <div style={{ display:"flex", gap:2, marginBottom: isHero ? 2 : 0, position:"relative" }}>
                  {pi.cards.map((c,i) => <Card key={i} card={c} size={isMobile ? "xs" : "sm"} />)}
                  {isHero && (
                    <span style={{
                      position:"absolute", left:"100%", top:"50%", transform:"translateY(-50%)",
                      marginLeft:5,
                      fontSize:8, fontWeight:700, color:"#c9a84c",
                      background:"rgba(0,0,0,.6)", padding:"2px 6px", borderRadius:3, letterSpacing:.3,
                      whiteSpace:"nowrap",
                    }}>
                      100bb
                    </span>
                  )}
                </div>
              )}
              {!isHero && (
                <span style={{
                  fontSize:7, fontWeight:600, color:"rgba(221,214,200,.55)",
                  background:"rgba(0,0,0,.5)", padding:"1px 5px", borderRadius:3, letterSpacing:.2,
                }}>
                  100bb
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Action history ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.05)" }}>
        {/* Column headers */}
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${allCols.length},1fr)`, borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(0,0,0,.18)" }}>
          {allCols.map((col, ci) => (
            <div key={col.key} style={{ padding:"8px 7px", textAlign:"center", borderRight: ci < allCols.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.22)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>
                {col.name}
              </div>
              {col.data?.boardCards && (
                <div style={{ display:"flex", justifyContent:"center", gap:3, flexWrap:"wrap", marginBottom:4 }}>
                  {col.data.boardCards.split(" ").filter(Boolean).map((c,i) => <Pip key={i} card={c} />)}
                </div>
              )}
              {col.data?.potSize && (
                <div style={{ display:"inline-flex", background:"rgba(201,168,76,.07)", border:"1px solid rgba(201,168,76,.16)", color:"#7a6030", fontSize:8, fontWeight:700, padding:"1px 7px", borderRadius:9, letterSpacing:.2 }}>
                  {col.data.potSize}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action cells */}
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${allCols.length},1fr)` }}>
          {allCols.map((col, ci) => {
            let actions = col.data?.actions ?? [];

            if (col.key === "PREFLOP" && blindsMatch) {
              const sb = blindsMatch[1], bb = blindsMatch[2];
              actions = actions.filter((a, i) => {
                if (i > 1) return true;
                if (a.actionType==="BET" && (a.position==="SB"||a.position===hand.heroPosition) && a.amount===`${sb}bb`) return false;
                if (a.actionType==="BET" && (a.position==="BB"||a.position===hand.heroPosition) && a.amount===`${bb}bb`) return false;
                return true;
              });
            }

            return (
              <div key={col.key} style={{ padding:"8px 7px", borderRight: ci < allCols.length-1 ? "1px solid rgba(255,255,255,.04)" : "none", minWidth:0 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>

                  {/* Actions */}
                  {actions.map((a, i) => {
                    const isHero = a.position === hand.heroPosition;
                    return (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", gap:3, flexWrap:"wrap", minWidth:0,
                        padding: isHero ? "2px 3px" : "0 1px",
                        borderRadius:4,
                        background: isHero ? "rgba(201,168,76,.05)" : "transparent",
                        borderLeft: isHero ? "2px solid rgba(201,168,76,.32)" : "2px solid transparent",
                      }}>
                        <PosBadge label={isHero ? hand.heroPosition : a.position} isHero={isHero} />
                        <ActionBadge action={a} />
                      </div>
                    );
                  })}

                  {/* Result */}
                  {col.key===availableStreets[availableStreets.length-1] && hand.result && resultDisplay.text && (
                    <div
                      style={{
                        marginTop:2, padding:"3px 6px", borderRadius:3,
                        textAlign:"center", fontSize:9, fontWeight:700, letterSpacing:.4,
                        ...(resultDisplay.showAsWon
                          ? { background:"rgba(201,168,76,.12)", color:"#c9a84c", border:"1px solid rgba(201,168,76,.25)" }
                          : resultDisplay.showAsLost
                            ? { background:"rgba(176,48,48,.1)", color:"#905050", border:"1px solid rgba(176,48,48,.2)" }
                            : { background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.32)" }),
                      }}
                    >
                      {resultDisplay.text}
                    </div>
                  )}

                  {actions.length===0 && (
                    <div style={{ textAlign:"center", color:"rgba(255,255,255,.1)", fontSize:14, padding:"4px 0" }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
