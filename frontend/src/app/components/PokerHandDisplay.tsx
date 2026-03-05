"use client";

import { useState } from "react";

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

const SUIT: Record<string, { sym: string; color: string }> = {
  s: { sym: "♠", color: "#6a7a68" },
  h: { sym: "♥", color: "#b84040" },
  d: { sym: "♦", color: "#3d6ba0" },
  c: { sym: "♣", color: "#3a8060" },
};

const ACTION: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
  FOLD:   { label: "Fold",   bg: "rgba(74,82,69,.13)",    fg: "#6b7a66",  bd: "rgba(74,82,69,.25)" },
  CHECK:  { label: "Check",  bg: "rgba(100,110,90,.14)",  fg: "#5e6e56",  bd: "rgba(100,110,90,.28)" },
  CALL:   { label: "Call",   bg: "rgba(120,110,75,.14)",  fg: "#7a7050",  bd: "rgba(120,110,75,.28)" },
  BET:    { label: "Bet",    bg: "rgba(201,168,76,.14)",  fg: "#a89040",  bd: "rgba(201,168,76,.3)" },
  RAISE:  { label: "Raise",  bg: "rgba(201,168,76,.22)",  fg: "#c9a84c",  bd: "rgba(201,168,76,.42)" },
  ALL_IN: { label: "All-In", bg: "rgba(201,168,76,.32)",  fg: "#d4b85a",  bd: "rgba(201,168,76,.55)" },
};

// ── Playing card ─────────────────────────────────────────────────
function Card({ card, size = "md" }: { card: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const cfg = SUIT[suit] ?? { sym: "?", color: "#888" };
  const d = {
    xs: { w: 20, h: 28, pip: 7,  ctr: 12 },
    sm: { w: 26, h: 36, pip: 8,  ctr: 15 },
    md: { w: 36, h: 50, pip: 10, ctr: 21 },
    lg: { w: 48, h: 66, pip: 12, ctr: 27 },
  }[size];
  return (
    <div style={{
      width: d.w, height: d.h, background: "#f5f2ec",
      borderRadius: 4, border: `1.5px solid ${cfg.color}28`,
      boxShadow: "0 2px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.9)",
      position: "relative", display: "flex", alignItems: "center",
      justifyContent: "center", color: cfg.color, userSelect: "none", flexShrink: 0,
    }}>
      <div style={{ position:"absolute", top:1.5, left:2.5, display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1.05, fontWeight:800 }}>
        <span style={{ fontSize: d.pip }}>{rank}</span>
        <span style={{ fontSize: d.pip }}>{cfg.sym}</span>
      </div>
      <span style={{ fontSize: d.ctr, lineHeight: 1, fontWeight: 700 }}>{cfg.sym}</span>
      <div style={{ position:"absolute", bottom:1.5, right:2.5, display:"flex", flexDirection:"column", alignItems:"center", lineHeight:1.05, fontWeight:800, transform:"rotate(180deg)" }}>
        <span style={{ fontSize: d.pip }}>{rank}</span>
        <span style={{ fontSize: d.pip }}>{cfg.sym}</span>
      </div>
    </div>
  );
}

// ── Suit-colored inline text card ────────────────────────────────
function Pip({ card, bright = false }: { card: string; bright?: boolean }) {
  const cfg = SUIT[card.slice(-1)] ?? { sym: "?", color: "#888" };
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color: bright ? "#c9a84c" : cfg.color, letterSpacing: -0.2 }}>
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

// ── Action badge ─────────────────────────────────────────────────
function ActionBadge({ action }: { action: PokerAction }) {
  const cfg = ACTION[action.actionType] ?? ACTION.CALL;
  const label = cfg.label + (action.amount ? ` ${action.amount}` : "");
  return (
    <span style={{
      background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.bd}`,
      fontSize: 8, fontWeight: 700, padding: "1.5px 5px",
      borderRadius: 3, letterSpacing: 0.1,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
    }}>
      {label}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────
export default function PokerHandDisplay({ hand }: { hand: PokerHand }) {
  const STREET_ORDER = ["PREFLOP", "FLOP", "TURN", "RIVER"] as const;
  const STREET_NAME: Record<string, string> = { PREFLOP:"Preflop", FLOP:"Flop", TURN:"Turn", RIVER:"River" };

  const availableStreets = STREET_ORDER.filter((s) => hand.streets?.find((st) => st.street === s));
  const [idx, setIdx] = useState(0);
  const curStreet = availableStreets[idx] ?? "PREFLOP";

  // ── Player data ──────────────────────────────────────────────
  const players = Array.from(new Set(
    (hand.streets ?? []).flatMap((s) =>
      (s.actions ?? []).map((a) => a.position === hand.heroPosition ? "Hero" : a.position)
    )
  ));
  const info = Object.fromEntries(players.map((p) => {
    const pos = p === "Hero" ? hand.heroPosition : p;
    return [p, {
      pos,
      cards: p === "Hero" && hand.heroHand ? hand.heroHand.split(" ").filter(Boolean) : [],
      isDealer: pos === "BTN",
      isWinner: /won|win/i.test(hand.result ?? ""),
    }];
  }));

  // ── Seat positions (ellipse) ─────────────────────────────────
  const posOrder: Record<string, number> = { UTG:0,UTG1:1,UTG2:2,MP:3,MP1:4,MP2:5,CO:6,BTN:7,SB:8,BB:9 };
  const hero = "Hero";
  const others = players.filter(p=>p!==hero).sort((a,b)=>(posOrder[info[a]?.pos??a]??99)-(posOrder[info[b]?.pos??b]??99));
  const total = players.length;
  const CX=50, CY=50, RX=43, RY=39;
  const seats: Record<string, {x:number;y:number}> = {};
  const H_ANGLE = 90;
  if (players.includes(hero)) {
    const r = (H_ANGLE*Math.PI)/180;
    seats[hero] = { x: CX+RX*Math.cos(r), y: CY+RY*Math.sin(r) };
  }
  others.forEach((p,i) => {
    const angle = H_ANGLE + ((i+1)*360)/total;
    const r = (angle*Math.PI)/180;
    seats[p] = { x: CX+RX*Math.cos(r), y: CY+RY*Math.sin(r) };
  });

  // ── Board cards ──────────────────────────────────────────────
  const getBoardForStreet = (sk: string) => {
    const cards: string[] = [];
    const get = (s: string) => hand.streets?.find(x=>x.street===s)?.boardCards;
    const flop = get("FLOP"); const turn = get("TURN"); const river = get("RIVER");
    if (sk==="PREFLOP") return cards;
    if (flop) cards.push(...flop.split(" ").filter(Boolean));
    if (sk==="FLOP") return cards;
    if (turn) cards.push(...turn.split(" ").filter(Boolean));
    if (sk==="TURN") return cards;
    if (river) cards.push(...river.split(" ").filter(Boolean));
    return cards;
  };

  const boardCards = getBoardForStreet(curStreet);
  const curPot = hand.streets?.find(s=>s.street===curStreet)?.potSize ?? null;
  const isLast = idx === availableStreets.length-1;

  // ── Action columns ───────────────────────────────────────────
  const allCols: { key:string; name:string; data:PokerStreet|null }[] = [{ key:"BLINDS", name:"Blinds", data:null }];
  for (const s of STREET_ORDER) {
    const data = hand.streets?.find(st=>st.street===s) ?? null;
    if (data) allCols.push({ key:s, name:STREET_NAME[s], data });
  }

  const blindsMatch = hand.blinds.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
  const blindEntries: { player:string; pos:string; amount:string }[] = [];
  if (blindsMatch) {
    players.forEach(p => {
      const pos = info[p]?.pos;
      if (pos==="SB") blindEntries.push({ player:p, pos, amount:blindsMatch[1] });
      if (pos==="BB") blindEntries.push({ player:p, pos, amount:blindsMatch[2] });
    });
  }

  const won  = /won|win/i.test(hand.result ?? "");
  const lost = /lost/i.test(hand.result ?? "");

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
        {hand.result && (
          <span style={{ marginLeft:"auto" }}>
            <span style={{
              fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:3, letterSpacing:.4,
              ...(won
                ? { background:"rgba(201,168,76,.14)", color:"#c9a84c", border:"1px solid rgba(201,168,76,.28)" }
                : lost
                  ? { background:"rgba(176,48,48,.1)", color:"#905050", border:"1px solid rgba(176,48,48,.2)" }
                  : { background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.32)", border:"1px solid rgba(255,255,255,.08)" }),
            }}>
              {hand.result}
            </span>
          </span>
        )}
      </div>

      {/* ── Street tabs ── */}
      <div style={{ display:"flex", justifyContent:"center", padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
        <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,.03)", borderRadius:8, padding:3 }}>
          {availableStreets.map((s,i) => {
            const active = i===idx;
            const streetData = hand.streets?.find(st=>st.street===s);
            const tabCards = streetData?.boardCards ? streetData.boardCards.split(" ").filter(Boolean) : [];
            return (
              <button key={s} onClick={(e)=>{ e.stopPropagation(); setIdx(i); }} style={{
                display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:5,
                border: active ? "1px solid rgba(201,168,76,.25)" : "1px solid transparent",
                cursor:"pointer", transition:"all .15s",
                background: active ? "rgba(201,168,76,.1)" : "transparent",
                color: active ? "#c9a84c" : "rgba(255,255,255,.25)",
                fontSize:11, fontWeight:700, letterSpacing:.3,
              }}>
                {STREET_NAME[s]}
                {tabCards.length > 0 && (
                  <span style={{ display:"flex", gap:2 }}>
                    {tabCards.map((c,ci) => <Pip key={ci} card={c} bright={active} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ position:"relative", width:"100%", aspectRatio:"8/5", overflow:"hidden" }}>
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
            <div style={{ display:"flex", gap:5 }}>
              {boardCards.map((c,i) => <Card key={`${c}-${i}`} card={c} size="md" />)}
            </div>
          </div>
        )}

        {/* Pot */}
        {curPot && (
          <div style={{ position:"absolute", inset:0, zIndex:10, display:"flex", alignItems:"center", justifyContent:"center", paddingTop: boardCards.length > 0 ? "18%" : "0", pointerEvents:"none" }}>
            <Chip label={`POT  ${curPot}`} />
          </div>
        )}

        {/* Seats */}
        {players.map((player) => {
          const pi = info[player]; if (!pi) return null;
          const seat = seats[player]; if (!seat) return null;
          const isHero = player === "Hero";
          return (
            <div key={player} style={{ position:"absolute", zIndex:20, left:`${seat.x}%`, top:`${seat.y}%`, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              {pi.isWinner && isLast && (
                <div style={{
                  background:"rgba(201,168,76,.12)", color:"#c9a84c",
                  border:"1px solid rgba(201,168,76,.28)",
                  fontSize:7, fontWeight:800, padding:"1px 6px", borderRadius:3, letterSpacing:.6,
                }}>
                  WIN
                </div>
              )}

              {/* Avatar — clean dark circle with position text */}
              <div style={{
                width:34, height:34, borderRadius:"50%",
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

              {pi.cards.length > 0 && (
                <div style={{ display:"flex", gap:2 }}>
                  {pi.cards.map((c,i) => <Card key={i} card={c} size="xs" />)}
                </div>
              )}
              <span style={{
                fontSize:7, color: isHero ? "rgba(201,168,76,.55)" : "rgba(255,255,255,.22)",
                background:"rgba(0,0,0,.38)", padding:"1px 5px", borderRadius:3, letterSpacing:.2,
              }}>
                100bb
              </span>
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
            const isBlinds = col.key === "BLINDS";
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

                  {/* Blind posts */}
                  {isBlinds && blindEntries.map((e,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <PosBadge label={e.pos} isHero={e.player === "Hero"} />
                      <span style={{ fontSize:9, color:"#7a6030", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{e.amount}</span>
                    </div>
                  ))}

                  {/* Actions */}
                  {!isBlinds && actions.map((a, i) => {
                    const isHero = a.position === hand.heroPosition;
                    return (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", gap:3, flexWrap:"nowrap", minWidth:0,
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
                  {!isBlinds && col.key===availableStreets[availableStreets.length-1] && hand.result && (
                    <div style={{
                      marginTop:2, padding:"3px 6px", borderRadius:3,
                      textAlign:"center", fontSize:9, fontWeight:700, letterSpacing:.4,
                      ...(won
                        ? { background:"rgba(201,168,76,.12)", color:"#c9a84c", border:"1px solid rgba(201,168,76,.25)" }
                        : lost
                          ? { background:"rgba(176,48,48,.1)", color:"#905050", border:"1px solid rgba(176,48,48,.2)" }
                          : { background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.32)" }),
                    }}>
                      {hand.result}
                    </div>
                  )}

                  {!isBlinds && actions.length===0 && (
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
