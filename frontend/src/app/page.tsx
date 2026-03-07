"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CardSelector from "./components/CardSelector";
import { type PokerAction } from "./components/PokerHandDisplay";
import AuthForm from "./components/AuthForm";
import PostItem from "./components/PostItem";
import PostSkeleton from "./components/PostSkeleton";
import AdCard from "./components/AdCard";
import AffiliateCard from "./components/AffiliateCard";
import { API_BASE, fetchWithAuth, getValidTokenAsync } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import type { User, Post, Notification, Ad, AffiliatePartner } from "../lib/types";


export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1009]" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const quotePostId = searchParams.get("quote") || null;
  const { auth, isInitialized, setAuth, clearAuth } = useAuth();
  const token = auth?.token ?? null;
  const currentUser = auth?.user ?? null;
  const { showToast } = useToast();
  const isPremium = currentUser?.subscriptionStatus === "active" || currentUser?.subscriptionStatus === "canceled";
  const charLimit = isPremium ? 1000 : 280;
  const charWarnThreshold = isPremium ? 950 : 250;

  // Helper: update a single post in the local list
  const updatePost = (postId: string, updater: (p: Post) => Post) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? updater(p) : p));
  };

  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [timelineCursor, setTimelineCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLElement | null>(null);
  const timelineCursorRef = useRef<string | null>(null);
  const timelineHasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [xPending, setXPending] = useState<{ xProfile: { id: string; name: string; username: string; avatarUrl: string | null }; xToken: string } | null>(null);
  const [xEmail, setXEmail] = useState("");
  const [xEmailError, setXEmailError] = useState<string | null>(null);
  const [xEmailSubmitting, setXEmailSubmitting] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [showPokerForm, setShowPokerForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rightSidebarSearch, setRightSidebarSearch] = useState("");
  const [ads, setAds] = useState<Ad[]>([]);
  const [featuredPartners, setFeaturedPartners] = useState<AffiliatePartner[]>([]);

  // Poker hand form state
  const [pokerTableType, setPokerTableType] = useState<"CASH" | "MTT" | "SNG" | "ZOOM">("CASH");
  const [pokerBlinds, setPokerBlinds] = useState("");
  const [pokerTableSize, setPokerTableSize] = useState("");
  const [pokerHeroStack, setPokerHeroStack] = useState("");
  const [pokerHeroPosition, setPokerHeroPosition] = useState<"UTG" | "UTG1" | "UTG2" | "MP" | "MP1" | "MP2" | "CO" | "BTN" | "SB" | "BB">("BTN");
  const [pokerHeroHand, setPokerHeroHand] = useState("");
  const [pokerResult, setPokerResult] = useState("");
  const [pokerStreets, setPokerStreets] = useState<{
    street: "PREFLOP" | "FLOP" | "TURN" | "RIVER";
    boardCards?: string;
    actions: PokerAction[];
    potSize?: string;
  }[]>([
    { street: "PREFLOP", actions: [] },
    { street: "FLOP", actions: [], boardCards: "" },
    { street: "TURN", actions: [], boardCards: "" },
    { street: "RIVER", actions: [], boardCards: "" },
  ]);

  // テーブルサイズに応じた有効ポジション一覧
  const getPositionsForTableSize = (): string[] => {
    switch (pokerTableSize) {
      case "Heads-up":
        return ["SB", "BB"];
      case "6-max":
        return ["UTG", "MP", "CO", "BTN", "SB", "BB"];
      case "9-max":
        return ["UTG", "UTG1", "UTG2", "MP", "MP1", "MP2", "CO", "BTN", "SB", "BB"];
      default:
        return ["UTG", "UTG1", "UTG2", "MP", "MP1", "MP2", "CO", "BTN", "SB", "BB"];
    }
  };

  // テーブルサイズ変更時、Heroポジションが有効でなければ先頭にリセット
  useEffect(() => {
    const validPositions = getPositionsForTableSize();
    if (pokerTableSize && !validPositions.includes(pokerHeroPosition)) {
      setPokerHeroPosition(validPositions[0] as typeof pokerHeroPosition);
    }
  }, [pokerTableSize]);

  // ブラインドの正規化: 1bb = SB額。SB=1bb, BB=BB額/SB額 (通常2bb)
  const getNormalizedBlinds = (): { sb: number; bb: number } => {
    const blindsMatch = pokerBlinds?.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
    if (!blindsMatch) return { sb: 1, bb: 2 };
    const sbAmount = parseFloat(blindsMatch[1]);
    const bbAmount = parseFloat(blindsMatch[2]);
    if (sbAmount === 0) return { sb: 1, bb: 2 };
    return { sb: 1, bb: bbAmount / sbAmount };
  };

  // プレイヤーがこのストリートで既に置いている額
  const getPlayerAlreadyPutIn = (streetIndex: number, _actionIndex: number, position: string): number => {
    if (streetIndex !== 0) return 0;
    const { sb, bb } = getNormalizedBlinds();
    const actualPos = position === "Hero" ? pokerHeroPosition : position;
    if (actualPos === "SB") return sb;
    if (actualPos === "BB") return bb;
    return 0;
  };

  const isFacingBet = (streetIndex: number, actionIndex: number, position: string, streetActions?: PokerAction[]): boolean => {
    const maxBet = getPreviousMaxBet(streetIndex, actionIndex, position, streetActions);
    if (maxBet <= 0) return false;
    const alreadyPut = getPlayerAlreadyPutIn(streetIndex, actionIndex, position);
    return maxBet > alreadyPut;
  };

  const getValidActionTypes = (streetIndex: number, actionIndex: number, position: string): Array<"FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN"> => {
    const maxBet = getPreviousMaxBet(streetIndex, actionIndex, position);
    const actualPos = position === "Hero" ? pokerHeroPosition : position;
    const facingBet = maxBet > 0 && getPlayerAlreadyPutIn(streetIndex, actionIndex, position) < maxBet;

    if (facingBet) {
      return ["FOLD", "CALL", "RAISE", "ALL_IN"];
    }
    if (streetIndex === 0 && actualPos === "BB") {
      const street = pokerStreets[0];
      if (street?.actions) {
        const hasRaise = street.actions.some((a, i) => {
          if (i >= actionIndex) return false;
          return a.actionType === "BET" || a.actionType === "RAISE" || a.actionType === "ALL_IN";
        });
        if (!hasRaise) return ["FOLD", "CHECK", "RAISE", "ALL_IN"];
      }
    }
    return ["FOLD", "CHECK", "BET", "ALL_IN"];
  };

  const getDefaultActionType = (streetIndex: number, actions: PokerAction[]): "FOLD" | "CHECK" => {
    const nextPos = getNextToAct(streetIndex, actions);
    if (!nextPos) return "CHECK";
    const pos = nextPos === pokerHeroPosition ? pokerHeroPosition : nextPos;
    return isFacingBet(streetIndex, actions.length, pos, actions) ? "FOLD" : "CHECK";
  };

  const getPreviousMaxBet = (streetIndex: number, actionIndex: number, _currentPosition?: string, streetActions?: PokerAction[]): number => {
    if (!pokerBlinds) return 0;
    const { bb } = getNormalizedBlinds();
    const actions = streetActions ?? pokerStreets[streetIndex]?.actions ?? [];

    let maxBet = streetIndex === 0 ? bb : 0;
    for (let i = 0; i < actionIndex && i < actions.length; i++) {
      const action = actions[i];
      if (action.amount) {
        const amount = parseFloat(action.amount.replace("bb", ""));
        if (!isNaN(amount)) {
          if (action.actionType === "BET" || action.actionType === "RAISE") {
            maxBet = amount;
          } else if (action.actionType === "ALL_IN" && amount > maxBet) {
            maxBet = amount;
          }
        }
      }
    }
    return maxBet;
  };

  const calculatePotSize = (streetIndex: number): string => {
    const pot = calculatePotSizeValue(streetIndex);
    if (pot <= 0) return "";
    const potValue = pot % 1 === 0 ? pot.toFixed(0) : pot.toFixed(1);
    return `${potValue}bb`;
  };

  const calculatePotSizeValue = (streetIndex: number): number => {
    if (!pokerBlinds) return 0;
    const { sb, bb } = getNormalizedBlinds();
    let pot = 0;
    for (let i = 0; i <= streetIndex; i++) {
      const playerBets = new Map<string, number>();
      if (i === 0) {
        const tablePositions = getPositionsForTableSize();
        if (tablePositions.includes("SB")) playerBets.set("SB", sb);
        if (tablePositions.includes("BB")) playerBets.set("BB", bb);
      }
      const street = pokerStreets[i];
      if (street?.actions) {
        street.actions.forEach((action) => {
          if (action.amount) {
            const amount = parseFloat(action.amount.replace("bb", ""));
            const pos = action.position === "Hero" ? pokerHeroPosition : action.position;
            if (!isNaN(amount)) {
              if (action.actionType === "BET" || action.actionType === "RAISE" || action.actionType === "ALL_IN" || action.actionType === "CALL") {
                playerBets.set(pos, amount);
              }
            }
          }
        });
      }
      playerBets.forEach((amount) => { pot += amount; });
    }
    return pot;
  };

  const handleUnauthorized = () => {
    clearAuth();
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.")) {
      return "サーバーに接続できません。ネットワーク接続を確認してください。";
    }
    return err instanceof Error ? err.message : "エラーが発生しました";
  };

  useEffect(() => {
    if (!token) return;
    fetchTimeline();
    fetchNotifications();

    // SSE for real-time notifications（トークンを最新にして接続）
    let eventSource: EventSource | null = null;
    let closed = false;

    const connectSSE = async () => {
      if (closed) return;
      const validToken = await getValidTokenAsync();
      if (!validToken || closed) return;
      eventSource = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(validToken)}`);
      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev]);
        } catch {
          // ignore parse errors
        }
      };
      eventSource.onerror = () => {
        // 切断時に古い接続を閉じて再接続
        eventSource?.close();
        if (!closed) {
          setTimeout(connectSSE, 5000);
        }
      };
    };

    connectSSE();
    return () => {
      closed = true;
      eventSource?.close();
    };
  }, [token]);

  // プリフロップ初期セットアップ
  useEffect(() => {
    if (!pokerBlinds) return;
    const blindsMatch = pokerBlinds.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
    if (!blindsMatch) return;
    setPokerStreets(prev => {
      const newStreets = prev.map((s, i) => i === 0 ? { ...s, actions: [] } : s);
      const tablePositions = getPositionsForTableSize();
      const actions: PokerAction[] = tablePositions.map((pos, idx) => ({
        position: (pos === pokerHeroPosition ? "Hero" : pos) as PokerAction["position"],
        actionType: "FOLD" as const,
        amount: "",
        order: idx,
      }));
      newStreets[0].actions = actions;
      return newStreets;
    });
  }, [pokerBlinds, pokerHeroPosition, pokerTableSize]);

  // 無効なアクションタイプを自動修正
  useEffect(() => {
    setPokerStreets((prev) => {
      let changed = false;
      const next = prev.map((street, streetIdx) => {
        const newActions = street.actions.map((action, actionIdx) => {
          const pos = action.position === "Hero" ? pokerHeroPosition : action.position;
          const validTypes = getValidActionTypes(streetIdx, actionIdx, pos);
          if (!validTypes.includes(action.actionType as typeof validTypes[number])) {
            changed = true;
            const fallback = validTypes[0];
            const updated = { ...action, actionType: fallback };
            if (fallback === "FOLD" || fallback === "CHECK") updated.amount = "";
            return updated;
          }
          return action;
        });
        return { ...street, actions: newActions };
      });
      return changed ? next : prev;
    });
  }, [pokerStreets]);

  const updateCallAmounts = (streetIndex: number, updatedStreets: typeof pokerStreets) => {
    const street = updatedStreets[streetIndex];
    let hasChange = false;
    const newActions = street.actions.map((action, actionIndex) => {
      if (action.actionType === "CALL") {
        const actionPosition = action.position === "Hero" ? pokerHeroPosition : action.position;
        const prevMaxBet = getPreviousMaxBet(streetIndex, actionIndex, actionPosition, street.actions);
        const newAmount = `${prevMaxBet}bb`;
        if (action.amount !== newAmount) {
          hasChange = true;
          return { ...action, amount: newAmount };
        }
      }
      return action;
    });
    if (!hasChange) return updatedStreets;
    return updatedStreets.map((s, i) =>
      i === streetIndex ? { ...s, actions: newActions } : s
    );
  };

  const addNextAction = (streetIndex: number, streets: typeof pokerStreets): typeof pokerStreets => {
    const street = streets[streetIndex];
    const nextPlayer = getNextToAct(streetIndex, street.actions);
    if (!nextPlayer) return streets;

    const foldedInStreet = new Set<string>();
    street.actions.forEach((a) => {
      if (a.actionType === "FOLD") {
        foldedInStreet.add(a.position === "Hero" ? pokerHeroPosition : a.position);
      }
    });
    const nextActual = nextPlayer === "Hero" ? pokerHeroPosition : nextPlayer;
    if (foldedInStreet.has(nextActual)) return streets;

    const defaultAction = getDefaultActionType(streetIndex, street.actions);
    const newAction: PokerAction = {
      position: (nextPlayer === pokerHeroPosition ? "Hero" : nextPlayer) as PokerAction["position"],
      actionType: defaultAction,
      amount: "",
      order: street.actions.length,
    };

    return streets.map((s, i) => {
      if (i !== streetIndex) return s;
      return { ...s, actions: [...s.actions, newAction] };
    });
  };

  const isValidCard = (card: string): boolean => {
    if (!card || card.length < 2) return false;
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    return ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"].includes(rank) &&
      ["s", "h", "d", "c"].includes(suit);
  };

  const getDisabledCards = (streetIndex: number): string[] => {
    const disabled: string[] = [];
    if (pokerHeroHand) {
      const heroCards = pokerHeroHand.split(" ").filter(Boolean);
      disabled.push(...heroCards);
    }
    for (let i = 0; i < streetIndex; i++) {
      const street = pokerStreets[i];
      if (street.boardCards) {
        const boardCards = street.boardCards.split(" ").filter(Boolean);
        disabled.push(...boardCards);
      }
    }
    return disabled;
  };

  const getFoldedPlayers = (upToStreetIndex: number): string[] => {
    const folded: string[] = [];
    for (let i = 0; i <= upToStreetIndex; i++) {
      const street = pokerStreets[i];
      if (!street?.actions) continue;
      street.actions.forEach((action) => {
        if (action.actionType === "FOLD") {
          const position = action.position === "Hero" ? pokerHeroPosition : action.position;
          if (!folded.includes(position)) folded.push(position);
        }
      });
    }
    return folded;
  };

  const getActivePlayerCount = (upToStreetIndex: number): number => {
    const folded = new Set<string>();
    for (let j = 0; j <= upToStreetIndex; j++) {
      pokerStreets[j]?.actions?.forEach((a) => {
        if (a.actionType === "FOLD") folded.add(a.position === "Hero" ? pokerHeroPosition : a.position);
      });
    }
    const activeInPreflop = new Set<string>();
    pokerStreets[0]?.actions?.forEach((a) => {
      const pos = a.position === "Hero" ? pokerHeroPosition : a.position;
      if (a.actionType !== "FOLD") activeInPreflop.add(pos);
    });
    let count = 0;
    activeInPreflop.forEach((pos) => { if (!folded.has(pos)) count++; });
    return count;
  };

  const areAllPlayersAllIn = (upToStreetIndex: number): boolean => {
    const folded = new Set<string>();
    const allIn = new Set<string>();
    for (let j = 0; j <= upToStreetIndex; j++) {
      pokerStreets[j]?.actions?.forEach((a) => {
        const pos = a.position === "Hero" ? pokerHeroPosition : a.position;
        if (a.actionType === "FOLD") folded.add(pos);
        if (a.actionType === "ALL_IN") allIn.add(pos);
      });
    }
    const activeInPreflop = new Set<string>();
    pokerStreets[0]?.actions?.forEach((a) => {
      const pos = a.position === "Hero" ? pokerHeroPosition : a.position;
      if (a.actionType !== "FOLD") activeInPreflop.add(pos);
    });
    let nonAllInCount = 0;
    activeInPreflop.forEach((pos) => {
      if (!folded.has(pos) && !allIn.has(pos)) nonAllInCount++;
    });
    return nonAllInCount <= 1;
  };

  const canEditStreet = (streetIndex: number): boolean => {
    if (streetIndex === 0) return true;
    if (areAllPlayersAllIn(streetIndex - 1)) return false;
    if (streetIndex === 1) {
      const preflop = pokerStreets[0];
      if (!preflop?.actions || preflop.actions.length < 2) return false;
      return getActivePlayerCount(0) >= 2;
    }
    if (streetIndex === 2) {
      const flop = pokerStreets[1];
      const flopBoard = flop?.boardCards?.trim().split(/\s+/).filter(Boolean) || [];
      if (flopBoard.length < 3) return false;
      return getActivePlayerCount(1) >= 2;
    }
    if (streetIndex === 3) {
      const turn = pokerStreets[2];
      const turnBoard = turn?.boardCards?.trim().split(/\s+/).filter(Boolean) || [];
      if (turnBoard.length < 1) return false;
      return getActivePlayerCount(2) >= 2;
    }
    return false;
  };

  const getPositionOrder = (streetIndex: number): string[] => {
    const tablePositions = getPositionsForTableSize();
    const withHero = tablePositions.map((p) => (p === pokerHeroPosition ? "Hero" : p));
    if (streetIndex === 0) return withHero;
    const postflopOrder = ["SB", "BB", "UTG", "UTG1", "UTG2", "MP", "MP1", "MP2", "CO", "BTN"];
    return withHero.sort((a, b) => {
      const pa = a === "Hero" ? pokerHeroPosition : a;
      const pb = b === "Hero" ? pokerHeroPosition : b;
      const ia = postflopOrder.indexOf(pa);
      const ib = postflopOrder.indexOf(pb);
      return (ia >= 0 ? ia : 999) - (ib >= 0 ? ib : 999);
    });
  };

  const getActiveInStreet = (_streetIndex: number, actions: PokerAction[]): Set<string> => {
    const folded = new Set<string>();
    actions.forEach((a) => {
      if (a.actionType === "FOLD") folded.add(a.position === "Hero" ? pokerHeroPosition : a.position);
    });
    return folded;
  };

  const getNextToAct = (streetIndex: number, actions: PokerAction[]): string | null => {
    const activePlayers = getActivePlayers(streetIndex);
    if (activePlayers.length === 0) return null;
    const posOrder = getPositionOrder(streetIndex);
    const foldedInStreet = getActiveInStreet(streetIndex, actions);
    const activeSet = new Set(activePlayers.map((p) => (p === "Hero" ? pokerHeroPosition : p)));

    const allInPlayers = new Set<string>();
    actions.forEach((a) => {
      if (a.actionType === "ALL_IN") allInPlayers.add(a.position === "Hero" ? pokerHeroPosition : a.position);
    });

    if (actions.length === 0) {
      return posOrder.find((p) => activeSet.has(p === "Hero" ? pokerHeroPosition : p)) ?? null;
    }

    let lastAggressorIdx = -1;
    for (let i = actions.length - 1; i >= 0; i--) {
      const t = actions[i].actionType;
      if (t === "BET" || t === "RAISE" || t === "ALL_IN") { lastAggressorIdx = i; break; }
    }

    if (lastAggressorIdx < 0) {
      const actedPlayers = new Set<string>();
      actions.forEach((a) => actedPlayers.add(a.position === "Hero" ? pokerHeroPosition : a.position));
      const notActed = posOrder.find((p) => {
        const actual = p === "Hero" ? pokerHeroPosition : p;
        return activeSet.has(actual) && !foldedInStreet.has(actual) && !actedPlayers.has(actual) && !allInPlayers.has(actual);
      });
      return notActed ?? null;
    }

    const lastAggressorPos = actions[lastAggressorIdx].position === "Hero" ? pokerHeroPosition : actions[lastAggressorIdx].position;
    const orderIdx = posOrder.findIndex((p) => (p === "Hero" ? pokerHeroPosition : p) === lastAggressorPos);
    const startOrderIdx = orderIdx >= 0 ? (orderIdx + 1) % posOrder.length : 0;

    const actedAfterAggressor = new Set<string>();
    for (let i = lastAggressorIdx + 1; i < actions.length; i++) {
      actedAfterAggressor.add(actions[i].position === "Hero" ? pokerHeroPosition : actions[i].position);
    }

    for (let i = 0; i < posOrder.length; i++) {
      const idx = (startOrderIdx + i) % posOrder.length;
      const pos = posOrder[idx];
      const actualPos = pos === "Hero" ? pokerHeroPosition : pos;
      if (actualPos === lastAggressorPos) continue;
      if (!activeSet.has(actualPos) || foldedInStreet.has(actualPos)) continue;
      if (allInPlayers.has(actualPos)) continue;
      if (!actedAfterAggressor.has(actualPos)) return pos;
    }
    return null;
  };

  const getActivePlayers = (streetIndex: number): string[] => {
    const tablePositions = getPositionsForTableSize();
    const positionsWithHero = tablePositions.map((p) => (p === pokerHeroPosition ? "Hero" : p));
    if (streetIndex === 0) return positionsWithHero;

    const folded = getFoldedPlayers(streetIndex - 1);
    const activeInPreflop: string[] = [];
    const preflopStreet = pokerStreets[0];
    if (preflopStreet?.actions) {
      preflopStreet.actions.forEach((action) => {
        const position = action.position === "Hero" ? pokerHeroPosition : action.position;
        if (action.actionType !== "FOLD" && !activeInPreflop.includes(position)) activeInPreflop.push(position);
      });
    }
    return positionsWithHero.filter((pos) => {
      const actualPos = pos === "Hero" ? pokerHeroPosition : pos;
      return !folded.includes(actualPos) && activeInPreflop.includes(actualPos);
    });
  };

  // フロップ以降のリセット
  useEffect(() => {
    setPokerStreets((prev) => {
      let changed = false;
      const next = prev.map((street, idx) => {
        if (idx === 0) return street;
        if (!canEditStreet(idx)) {
          if (street.actions.length > 0) { changed = true; return { ...street, actions: [] }; }
          return street;
        }
        const active = getActivePlayers(idx);
        if (active.length < 2 || areAllPlayersAllIn(idx - 1)) {
          if (street.actions.length > 0) { changed = true; return { ...street, actions: [] }; }
          return street;
        }
        if (street.actions.length > 0) {
          const activeSet = new Set<string>(active.map((p) => (p === "Hero" ? pokerHeroPosition : p)));
          const hasInvalid = street.actions.some((a) => {
            const pos = a.position === "Hero" ? pokerHeroPosition : a.position;
            return !activeSet.has(pos);
          });
          if (hasInvalid) {
            changed = true;
            const posOrder = getPositionOrder(idx);
            const actSet = new Set(active.map((p) => (p === "Hero" ? pokerHeroPosition : p)));
            const actions: PokerAction[] = posOrder
              .filter((p) => actSet.has(p === "Hero" ? pokerHeroPosition : p))
              .map((p, i) => ({
                position: (p === pokerHeroPosition ? "Hero" : p) as PokerAction["position"],
                actionType: "CHECK" as const,
                amount: "",
                order: i,
              }));
            return { ...street, actions };
          }
          return street;
        }
        changed = true;
        const posOrder = getPositionOrder(idx);
        const actSet = new Set(active.map((p) => (p === "Hero" ? pokerHeroPosition : p)));
        const actions: PokerAction[] = posOrder
          .filter((p) => actSet.has(p === "Hero" ? pokerHeroPosition : p))
          .map((p, i) => ({
            position: (p === pokerHeroPosition ? "Hero" : p) as PokerAction["position"],
            actionType: "CHECK" as const,
            amount: "",
            order: i,
          }));
        if (actions.length > 0) return { ...street, actions };
        return street;
      });
      return changed ? next : prev;
    });
  }, [pokerStreets, pokerBlinds, pokerHeroPosition, pokerTableSize]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications`);
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // 通知取得失敗は無視
    }
  };

  useEffect(() => {
    if (token && currentUser) fetchNotifications();
  }, [token, currentUser]);

  const fetchAds = async () => {
    try {
      const res = await fetch(`${API_BASE}/ads/feed?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch {
      // 広告取得失敗は無視
    }
  };

  const fetchFeaturedPartners = async () => {
    try {
      const res = await fetch(`${API_BASE}/affiliates?featured=true`);
      if (res.ok) {
        const data = await res.json();
        setFeaturedPartners(Array.isArray(data) ? data.slice(0, 3) : []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAds();
      fetchFeaturedPartners();
    }
  }, [currentUser]);

  const handleAuthSuccess = (newToken: string, user: User) => {
    setAuth(newToken, user);
  };

  // OAuth コールバック処理 (?oauthSession=xxx)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthSession = params.get("oauthSession");
    const authError = params.get("authError");

    if (authError) {
      if (authError === "magiclink") {
        setOauthError("ログインリンクが無効または期限切れです。もう一度お試しください。");
      } else {
        setOauthError("ログインに失敗しました。もう一度お試しください。");
      }
      window.history.replaceState({}, "", "/");
      return;
    }

    if (!oauthSession) return;

    // URLからセッションIDを即座に除去してからAPIで安全に取得
    window.history.replaceState({}, "", "/");

    fetch(`${API_BASE}/auth/oauth-session?id=${encodeURIComponent(oauthSession)}`)
      .then((res) => {
        if (!res.ok) throw new Error("session_invalid");
        return res.json();
      })
      .then((data: { kind: string; accessToken?: string; refreshToken?: string; user?: User; xProfile?: { id: string; name: string; username: string; avatarUrl: string | null }; xToken?: string }) => {
        if (data.kind === "auth" && data.accessToken && data.refreshToken && data.user) {
          localStorage.setItem("refreshToken", data.refreshToken);
          handleAuthSuccess(data.accessToken, data.user);
        } else if (data.kind === "x_pending" && data.xProfile && data.xToken) {
          setXPending({ xProfile: data.xProfile, xToken: data.xToken });
        } else {
          setOauthError("ログイン処理に失敗しました。もう一度お試しください。");
        }
      })
      .catch(() => {
        setOauthError("ログイン処理に失敗しました。もう一度お試しください。");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleXComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xPending) return;
    if (!xEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(xEmail)) {
      setXEmailError("正しいメールアドレスを入力してください");
      return;
    }
    setXEmailError(null);
    setXEmailSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/x/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xToken: xPending.xToken, email: xEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "登録に失敗しました");
      }
      const data = await res.json();
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      handleAuthSuccess(data.accessToken, data.user);
      setXPending(null);
    } catch (err: unknown) {
      setXEmailError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setXEmailSubmitting(false);
    }
  };

  const fetchTimeline = async (cursor?: string, append = false) => {
    if (!token) return;
    if (append) setLoadingMore(true);
    else setLoadingPosts(true);
    setError(null);
    try {
      const url = cursor
        ? `${API_BASE}/posts/timeline?cursor=${encodeURIComponent(cursor)}&limit=15`
        : `${API_BASE}/posts/timeline?limit=15`;
      const res = await fetchWithAuth(url);
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "タイムラインの取得に失敗しました");
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.posts ?? data);
      const hasMore = Array.isArray(data) ? false : (data.hasMore ?? false);
      if (append) {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const newItems = items.filter((p: Post) => !seen.has(p.id));
          return [...prev, ...newItems];
        });
      } else {
        setPosts(items);
      }
      setTimelineHasMore(hasMore);
      timelineHasMoreRef.current = hasMore;
      const newCursor = items.length > 0 ? (items[items.length - 1] as Post).id : null;
      setTimelineCursor(newCursor);
      timelineCursorRef.current = newCursor;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && timelineHasMoreRef.current && timelineCursorRef.current && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          fetchTimeline(timelineCursorRef.current, true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [token, currentUser]);

  const validatePokerHand = (): string | null => {
    let lastActiveStreetIdx = -1;
    for (let i = 0; i < pokerStreets.length; i++) {
      const street = pokerStreets[i];
      if (street.actions.length > 0 || (street.boardCards && street.boardCards.trim())) lastActiveStreetIdx = i;
      if (street.actions.length > 0 && i < 3) {
        const activeAfter = getActivePlayerCount(i);
        if (activeAfter < 2) break;
      }
    }
    const streetsToValidate = pokerStreets.filter((s, idx) => {
      if (idx > lastActiveStreetIdx) return false;
      return s.actions.length > 0 || (s.boardCards && s.boardCards.trim());
    });
    if (streetsToValidate.length === 0) return "少なくとも1つのストリートにアクションを追加してください";

    const streetOrder = ["PREFLOP", "FLOP", "TURN", "RIVER"] as const;
    const orderedStreets = [...streetsToValidate].sort((a, b) => streetOrder.indexOf(a.street) - streetOrder.indexOf(b.street));
    for (let i = 1; i < orderedStreets.length; i++) {
      if (streetOrder.indexOf(orderedStreets[i].street) - streetOrder.indexOf(orderedStreets[i - 1].street) > 1) {
        return "ストリートが飛ばされています";
      }
    }
    const validPositions = new Set(getPositionsForTableSize());

    for (const street of streetsToValidate) {
      if (street.street !== "PREFLOP") {
        const cards = (street.boardCards || "").trim().split(/\s+/).filter(Boolean);
        const expected = street.street === "FLOP" ? 3 : 1;
        const streetLabel = street.street === "FLOP" ? "フロップ" : street.street === "TURN" ? "ターン" : "リバー";
        if (cards.length !== expected) return `${streetLabel}のボードカードは${expected}枚必要です`;
        for (const c of cards) {
          if (!isValidCard(c)) return `不正なカード表記: ${c}`;
        }
      }
      const seen = new Set<string>();
      for (const card of (street.boardCards || "").split(/\s+/).filter(Boolean)) {
        if (seen.has(card)) return `ボードに重複カード: ${card}`;
        seen.add(card);
      }
      for (const a of street.actions) {
        const pos = a.position === "Hero" ? pokerHeroPosition : a.position;
        if (!validPositions.has(pos)) return `不正なポジション: ${pos}`;
        if ((a.actionType === "BET" || a.actionType === "RAISE" || a.actionType === "CALL" || a.actionType === "ALL_IN") && (!a.amount || !a.amount.match(/\d/))) {
          return `${pos}の${a.actionType}に金額を入力してください`;
        }
      }
    }

    if (pokerHeroHand) {
      const heroCards = pokerHeroHand.split(" ").filter(Boolean);
      const heroSeen = new Set<string>();
      const boardCards = new Set<string>();
      for (const street of pokerStreets) {
        if (street.boardCards) street.boardCards.split(" ").filter(Boolean).forEach((c) => boardCards.add(c));
      }
      for (const c of heroCards) {
        if (!isValidCard(c)) return `Heroハンドに不正なカード: ${c}`;
        if (heroSeen.has(c)) return `Heroハンドに重複カード: ${c}`;
        if (boardCards.has(c)) return `Heroハンドとボードで重複カード: ${c}`;
        heroSeen.add(c);
      }
    }
    return null;
  };

  const resetPokerForm = () => {
    setPokerBlinds("");
    setPokerTableSize("");
    setPokerHeroStack("");
    setPokerHeroHand("");
    setPokerResult("");
    setPokerStreets([
      { street: "PREFLOP", actions: [] },
      { street: "FLOP", actions: [], boardCards: "" },
      { street: "TURN", actions: [], boardCards: "" },
      { street: "RIVER", actions: [], boardCards: "" },
    ]);
    setShowPokerForm(false);
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const hasPokerHand = showPokerForm && pokerBlinds && pokerTableSize && pokerHeroStack;
    if (hasPokerHand && imageFile) {
      setError("画像とハンドは同時に投稿できません。どちらか一方を選んでください。");
      return;
    }
    if (!content.trim() && !hasPokerHand && !imageFile) return;
    setError(null);

    if (hasPokerHand) {
      const streetsWithActions = pokerStreets.filter((s, idx) => {
        if (idx === 0) return s.actions.length > 0;
        return (s.actions.length > 0 || (s.boardCards && s.boardCards.trim())) && (canEditStreet(idx) || areAllPlayersAllIn(idx - 1));
      });
      const validationError = validatePokerHand();
      if (validationError) { setError(validationError); return; }
      try {
        const streetOrder = ["PREFLOP", "FLOP", "TURN", "RIVER"] as const;
        const res = await fetchWithAuth(`${API_BASE}/posts/poker-hand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim() || undefined,
            tableType: pokerTableType,
            blinds: pokerBlinds,
            tableSize: pokerTableSize,
            heroStack: pokerHeroStack,
            heroPosition: pokerHeroPosition,
            heroHand: pokerHeroHand || undefined,
            result: pokerResult || undefined,
            streets: streetsWithActions.map((street) => {
              const actualStreetIndex = streetOrder.indexOf(street.street);
              return {
                street: street.street,
                boardCards: street.boardCards || undefined,
                potSize: calculatePotSize(actualStreetIndex) || undefined,
                actions: street.actions.map((action) => ({
                  position: action.position === "Hero" ? pokerHeroPosition : action.position,
                  actionType: action.actionType,
                  amount: action.amount || undefined,
                })),
              };
            }),
          }),
        });
        if (res.status === 401) { handleUnauthorized(); return; }
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message ?? "投稿に失敗しました"); }
        setContent("");
        resetPokerForm();
        setShowComposeModal(false);
        if (quotePostId && typeof window !== "undefined") window.history.replaceState({}, "", "/");
        await fetchTimeline();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "エラーが発生しました";
        setError(message);
      }
    } else {
      try {
        let imageUrl: string | undefined;
        if (imageFile) {
          const formData = new FormData();
          formData.append("image", imageFile);
          const uploadRes = await fetchWithAuth(`${API_BASE}/posts/upload-image`, {
            method: "POST",
            body: formData,
          });
          if (uploadRes.status === 401) { handleUnauthorized(); return; }
          if (!uploadRes.ok) throw new Error("画像のアップロードに失敗しました");
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.imageUrl;
        }
        const res = await fetchWithAuth(`${API_BASE}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, ...(imageUrl && { imageUrl }), ...(quotePostId && { parentPostId: quotePostId }) }),
        });
        if (res.status === 401) { handleUnauthorized(); return; }
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message ?? "投稿に失敗しました"); }
        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setShowComposeModal(false);
        if (quotePostId && typeof window !== "undefined") window.history.replaceState({}, "", "/");
        await fetchTimeline();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "エラーが発生しました";
        setError(message);
        showToast(message, "error");
      }
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!token || actionLoading) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    // Optimistic update
    updatePost(postId, (p) => ({
      ...p,
      isLiked: !wasLiked,
      _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? -1 : 1), replies: p._count?.replies ?? 0 },
    }));
    showToast(wasLiked ? "いいねを取り消しました" : "いいねしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      updatePost(postId, (p) => ({
        ...p,
        isLiked: wasLiked,
        _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? 1 : -1), replies: p._count?.replies ?? 0 },
      }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleRepost = async (postId: string) => {
    if (!token || actionLoading) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasReposted = post.isReposted;
    updatePost(postId, (p) => ({
      ...p,
      isReposted: !wasReposted,
      _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? -1 : 1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
    }));
    showToast(wasReposted ? "リポストを取り消しました" : "リポストしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({
        ...p,
        isReposted: wasReposted,
        _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? 1 : -1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
      }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!token || actionLoading) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    updatePost(postId, (p) => ({ ...p, isBookmarked: !wasBookmarked }));
    showToast(wasBookmarked ? "ブックマークを解除しました" : "ブックマークに追加しました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/bookmark`, { method: "POST" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({ ...p, isBookmarked: wasBookmarked }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleReply = async (postId: string) => {
    if (!token || !replyContent.trim()) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message ?? "返信に失敗しました"); }
      setReplyContent("");
      setReplyingTo(null);
      updatePost(postId, (p) => ({
        ...p,
        _count: { ...p._count!, replies: (p._count?.replies ?? 0) + 1, likes: p._count?.likes ?? 0 },
      }));
      showToast("返信しました");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!token) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: "DELETE" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message ?? "削除に失敗しました"); }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("投稿を削除しました");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleFollow = async (username: string) => {
    if (!token || actionLoading) return;
    // Optimistic update: toggle follow state on all posts by this author
    const targetPost = posts.find((p) => p.author.username === username);
    const wasFollowing = targetPost?.isFollowingAuthor ?? false;
    setPosts((prev) => prev.map((p) =>
      p.author.username === username ? { ...p, isFollowingAuthor: !wasFollowing } : p
    ));
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/follow`, { method: "POST" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.author.username === username ? { ...p, isFollowingAuthor: wasFollowing } : p
      ));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch {
      // ignore - still clear local state
    }
    setPosts([]);
    clearAuth();
  };

  // ---- Compose Form JSX ----
  const hasPokerHandData = showPokerForm && pokerBlinds && pokerTableSize && pokerHeroStack;
  const canSubmit = content.trim().length > 0 || !!hasPokerHandData || !!imageFile;

  const composeFormJSX = (
    <div>
      {error && (
        <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(176,48,48,0.12)", border: "1px solid rgba(176,48,48,0.3)", color: "#f09090" }}>{error}</div>
      )}
      {quotePostId && (
        <div className="mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
          <span>投稿を引用してコメントします</span>
          <button type="button" onClick={() => typeof window !== "undefined" && window.history.replaceState({}, "", "/")} className="font-medium hover:underline" style={{ color: "#c9a84c" }}>キャンセル</button>
        </div>
      )}
      <form onSubmit={handleCreatePost} className="space-y-3">
        <textarea
          className="w-full resize-none rounded-lg border-0 bg-transparent px-1 py-2 text-[15px] leading-relaxed outline-none"
          style={{ color: "#ddd6c8" }}
          rows={3}
          placeholder="今日のハンドを共有する..."
          maxLength={charLimit}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="プレビュー" className="max-h-40 rounded-lg object-cover" style={{ border: "1px solid #1f2a1e" }} />
            <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ background: "#131a14", border: "1px solid #2a3828", color: "#ddd6c8" }}>✕</button>
          </div>
        )}
        {showPokerForm && (
          <div
            className="space-y-4 rounded-xl p-4"
            style={{ background: "#0c1a0a", border: "1px solid #1a3018", boxShadow: "0 4px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: "#c8a030", fontSize: 18, lineHeight: 1 }}>♠</span>
                <span className="text-sm font-bold tracking-wide" style={{ color: "#e8f0e6" }}>ポーカーハンド</span>
              </div>
              <button
                type="button"
                onClick={() => resetPokerForm()}
                className="rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:text-red-400"
                style={{ color: "#6b9468", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}
              >削除</button>
            </div>

            {/* Setup grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>テーブルタイプ *</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerTableType} onChange={(e) => setPokerTableType(e.target.value as "CASH" | "MTT" | "SNG" | "ZOOM")}>
                    <option value="CASH">Cash</option><option value="MTT">MTT</option><option value="SNG">SNG</option><option value="ZOOM">Zoom</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>ブラインド *</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerBlinds} onChange={(e) => setPokerBlinds(e.target.value)}>
                    <option value="">選択してください</option>
                    <option value="0.01/0.02">0.01/0.02</option><option value="0.02/0.05">0.02/0.05</option><option value="0.05/0.10">0.05/0.10</option><option value="0.10/0.25">0.10/0.25</option><option value="0.25/0.50">0.25/0.50</option><option value="0.50/1.00">0.50/1.00</option><option value="1/2">1/2</option><option value="2/5">2/5</option><option value="5/10">5/10</option><option value="10/20">10/20</option><option value="25/50">25/50</option><option value="50/100">50/100</option><option value="100/200">100/200</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>テーブルサイズ *</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerTableSize} onChange={(e) => setPokerTableSize(e.target.value)}>
                    <option value="">選択してください</option><option value="Heads-up">Heads-up</option><option value="6-max">6-max</option><option value="9-max">9-max</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>Hero スタック *</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerHeroStack} onChange={(e) => setPokerHeroStack(e.target.value)}>
                    <option value="">選択してください</option><option value="20bb">20bb</option><option value="30bb">30bb</option><option value="50bb">50bb</option><option value="75bb">75bb</option><option value="100bb">100bb</option><option value="150bb">150bb</option><option value="200bb">200bb</option><option value="300bb">300bb</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>Hero ポジション *</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerHeroPosition} onChange={(e) => setPokerHeroPosition(e.target.value as typeof pokerHeroPosition)}>
                    {getPositionsForTableSize().map((pos) => (
                      <option key={pos} value={pos}>{pos === "UTG1" ? "UTG+1" : pos === "UTG2" ? "UTG+2" : pos === "MP1" ? "MP+1" : pos === "MP2" ? "MP+2" : pos}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                </div>
              </div>
              <div>
                <CardSelector label="Hero ハンド（任意）" value={pokerHeroHand} onChange={setPokerHeroHand} multiple={true} maxCards={2} disabledCards={(() => { const disabled: string[] = []; pokerStreets.forEach((street) => { if (street.boardCards) disabled.push(...street.boardCards.split(" ").filter(Boolean)); }); return disabled; })()} />
              </div>
            </div>

            {/* Streets */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>ストリート別アクション</label>
              {pokerStreets.map((street, index) => {
                const STREET_INFO: Record<string, { bg: string; border: string; text: string; label: string }> = {
                  PREFLOP: { bg: "rgba(59,130,246,.1)",  border: "rgba(59,130,246,.3)",  text: "#93c5fd", label: "プリフロ"   },
                  FLOP:    { bg: "rgba(16,185,129,.1)",  border: "rgba(16,185,129,.3)",  text: "#6ee7b7", label: "フロップ"   },
                  TURN:    { bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.3)",  text: "#fcd34d", label: "ターン"     },
                  RIVER:   { bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.3)",   text: "#fca5a5", label: "リバー"     },
                };
                const si = STREET_INFO[street.street];
                return (
                  <div key={index} className="rounded-xl p-3 space-y-3" style={{ background: "#101c0e", border: "1px solid #1e3020" }}>
                    {/* Street badge */}
                    <div className="flex items-center">
                      <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: si.bg, border: `1px solid ${si.border}`, color: si.text }}>{si.label}</span>
                    </div>

                    {/* Board cards */}
                    {(street.street === "FLOP" || street.street === "TURN" || street.street === "RIVER") && (
                      <CardSelector label="ボードカード" value={street.boardCards || ""} onChange={(value) => setPokerStreets(pokerStreets.map((st, i) => i === index ? { ...st, boardCards: value } : st))} multiple={street.street === "FLOP"} maxCards={street.street === "FLOP" ? 3 : 1} disabledCards={getDisabledCards(index)} />
                    )}

                    {/* Actions */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>アクション</span>
                        <button type="button" disabled={!canEditStreet(index)} onClick={() => setPokerStreets(addNextAction(index, pokerStreets))} className="rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: "#14b8a6", border: "1px solid rgba(20,184,166,.25)", background: "rgba(20,184,166,.06)" }}>+ 追加</button>
                      </div>
                      <div className="space-y-2">
                        {street.actions.map((action, actionIndex) => {
                          const A_CLR: Record<string, { bg: string; fg: string; bd: string }> = {
                            FOLD:   { bg: "rgba(74,82,69,.13)",    fg: "#6b7a66",  bd: "rgba(74,82,69,.25)" },
                            CHECK:  { bg: "rgba(100,110,90,.14)",  fg: "#5e6e56",  bd: "rgba(100,110,90,.28)" },
                            CALL:   { bg: "rgba(120,110,75,.14)",  fg: "#7a7050",  bd: "rgba(120,110,75,.28)" },
                            BET:    { bg: "rgba(201,168,76,.14)",  fg: "#a89040",  bd: "rgba(201,168,76,.3)" },
                            RAISE:  { bg: "rgba(201,168,76,.22)",  fg: "#c9a84c",  bd: "rgba(201,168,76,.42)" },
                            ALL_IN: { bg: "rgba(201,168,76,.32)",  fg: "#d4b85a",  bd: "rgba(201,168,76,.55)" },
                          };
                          const isHeroAction = action.position === "Hero";
                          const posKey = isHeroAction ? pokerHeroPosition : action.position;
                          const posLabel = posKey === "UTG1" ? "UTG+1" : posKey === "UTG2" ? "UTG+2" : posKey === "MP1" ? "MP+1" : posKey === "MP2" ? "MP+2" : posKey;
                          const aCfg = A_CLR[action.actionType] ?? A_CLR.CALL;
                          return (
                            <div key={actionIndex} className="flex items-center gap-2">
                              {/* Position badge */}
                              <div className="flex-none rounded-md px-2 py-1.5 text-center text-[11px] font-bold whitespace-nowrap" style={{ minWidth: 50, background: isHeroAction ? "rgba(201,168,76,.1)" : "rgba(42,56,40,.4)", color: isHeroAction ? "#c9a84c" : "#6b7a66", border: `1px solid ${isHeroAction ? "rgba(201,168,76,.22)" : "#1f2a1e"}` }}>
                                {posLabel}
                              </div>
                              {/* Action type select */}
                              <div className="relative flex-1">
                                <select
                                  className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold outline-none"
                                  style={{ background: aCfg.bg, color: aCfg.fg, border: `1px solid ${aCfg.bd}` }}
                                  value={action.actionType}
                                  onChange={(e) => {
                                    const newActionType = e.target.value as PokerAction["actionType"];
                                    let newActions = pokerStreets[index].actions.map((a, ai) => {
                                      if (ai !== actionIndex) return { ...a };
                                      const updated = { ...a, actionType: newActionType };
                                      if (newActionType === "FOLD" || newActionType === "CHECK") updated.amount = "";
                                      return updated;
                                    });
                                    if (newActionType === "CALL") {
                                      const pos = newActions[actionIndex].position === "Hero" ? pokerHeroPosition : newActions[actionIndex].position;
                                      const prevMaxBet = getPreviousMaxBet(index, actionIndex, pos, newActions);
                                      newActions = newActions.map((a, ai) => ai === actionIndex ? { ...a, amount: `${prevMaxBet}bb` } : a);
                                    }
                                    const isAggressive = newActionType === "BET" || newActionType === "RAISE" || newActionType === "ALL_IN";
                                    if (isAggressive) newActions = newActions.slice(0, actionIndex + 1);
                                    let newStreets = pokerStreets.map((st, i) => i === index ? { ...st, actions: newActions } : st);
                                    let updatedStreets = updateCallAmounts(index, newStreets);
                                    if (isAggressive) {
                                      for (let safety = 0; safety < 10; safety++) {
                                        const next = addNextAction(index, updatedStreets);
                                        if (next === updatedStreets) break;
                                        updatedStreets = next;
                                      }
                                    } else if (index > 0) {
                                      const postActions = updatedStreets[index].actions.slice(0, actionIndex + 1);
                                      updatedStreets = updatedStreets.map((st, i) => i === index ? { ...st, actions: postActions } : st);
                                      updatedStreets = updateCallAmounts(index, updatedStreets);
                                      updatedStreets = addNextAction(index, updatedStreets);
                                    }
                                    setPokerStreets(updatedStreets);
                                  }}
                                >
                                  {getValidActionTypes(index, actionIndex, action.position === "Hero" ? pokerHeroPosition : action.position).map((t) => (
                                    <option key={t} value={t}>{t === "FOLD" ? "Fold" : t === "CHECK" ? "Check" : t === "CALL" ? "Call" : t === "BET" ? "Bet" : t === "RAISE" ? "Raise" : "All-in"}</option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                  <svg className="h-3 w-3" style={{ color: aCfg.fg, opacity: .6 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                </div>
                              </div>
                              {/* Amount */}
                              {(action.actionType === "BET" || action.actionType === "RAISE" || action.actionType === "CALL" || action.actionType === "ALL_IN") && (
                                <div className="flex-1">
                                  {action.actionType === "CALL" ? (
                                    <div className="rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.18)", color: "#7a6030" }}>
                                      {action.amount || "計算中..."}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input type="text" className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: "#0d1009", border: "1px solid #1f2a1e", color: "#c9a84c" }} placeholder={action.actionType === "RAISE" ? "レイズ先" : "ベット額"} value={action.amount?.replace("bb", "") || ""} onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, "");
                                        const newActions = pokerStreets[index].actions.map((a, ai) => ai === actionIndex ? { ...a, amount: value ? `${value}bb` : "" } : { ...a });
                                        const newStreets = pokerStreets.map((st, i) => i === index ? { ...st, actions: newActions } : st);
                                        setPokerStreets(updateCallAmounts(index, newStreets));
                                      }} />
                                      <span className="flex-none text-xs font-semibold" style={{ color: "#6b7a66" }}>bb</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Delete */}
                              <button type="button" onClick={() => {
                                const newActions = pokerStreets[index].actions.slice(0, actionIndex);
                                const newStreets = pokerStreets.map((st, i) => i === index ? { ...st, actions: newActions } : st);
                                setPokerStreets(updateCallAmounts(index, newStreets));
                              }} className="flex-none rounded-md p-1.5" style={{ color: "#6b7280", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pot size */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(200,160,48,.06)", border: "1px solid rgba(200,160,48,.18)" }}>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9d8030" }}>ポット</span>
                      <span className="text-xs font-bold" style={{ color: "#c8a030" }}>{calculatePotSize(index) || "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b9468" }}>結果</label>
              <div className="relative">
                <select className="w-full appearance-none rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/20" style={{ background: "#131f11", border: "1px solid #253823", color: "#e8f0e6" }} value={pokerResult} onChange={(e) => setPokerResult(e.target.value)}>
                  <option value="">選択してください（任意）</option>
                  <optgroup label="勝利"><option value="Won 10bb">Won 10bb</option><option value="Won 20bb">Won 20bb</option><option value="Won 50bb">Won 50bb</option><option value="Won 100bb">Won 100bb</option><option value="Won 200bb">Won 200bb</option><option value="Won 500bb">Won 500bb</option></optgroup>
                  <optgroup label="敗北"><option value="Lost 10bb">Lost 10bb</option><option value="Lost 20bb">Lost 20bb</option><option value="Lost 50bb">Lost 50bb</option><option value="Lost 100bb">Lost 100bb</option><option value="Lost 200bb">Lost 200bb</option><option value="Lost 500bb">Lost 500bb</option></optgroup>
                  <optgroup label="その他"><option value="Split pot">Split pot</option><option value="All-in">All-in</option></optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"><svg className="h-3 w-3" style={{ color: "#4a6b46" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "#1f2a1e" }}>
          <div className="flex items-center gap-1">
            <label
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${showPokerForm ? "cursor-not-allowed opacity-40 pointer-events-none" : "cursor-pointer"}`}
              style={imageFile ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" } : { color: "#6b7a66", border: "1px solid #1f2a1e" }}
              title={showPokerForm ? "ハンドを削除してから画像を添付できます" : "画像を添付"}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              <span>画像</span>
              {!showPokerForm && (
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setImagePreview(reader.result as string);
                  reader.readAsDataURL(file);
                }
                  e.target.value = "";
                }} />
              )}
            </label>
            <button
              type="button"
              onClick={() => {
                if (imageFile) {
                  setImageFile(null);
                  setImagePreview(null);
                }
                setShowPokerForm(!showPokerForm);
              }}
              disabled={!!imageFile}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all"
              style={showPokerForm ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" } : { color: "#6b7a66", border: "1px solid #1f2a1e", opacity: imageFile ? 0.4 : 1 }}
              title={imageFile ? "画像を削除してからハンドを添付できます" : "ポーカーハンドを添付"}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
              <span>ハンド</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="relative h-5 w-5">
                  <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#1f2a1e" strokeWidth="2" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke={content.length >= charLimit ? "#e05050" : content.length >= charWarnThreshold ? "#c9a84c" : "#c9a84c"} strokeWidth="2" strokeDasharray={`${(content.length / charLimit) * 50.3} 50.3`} strokeLinecap="round" />
                  </svg>
                </div>
                <span className={`text-xs tabular-nums ${content.length >= charLimit ? "font-semibold" : ""}`} style={{ color: content.length >= charLimit ? "#e05050" : content.length >= charWarnThreshold ? "#c9a84c" : "#6b7a66" }}>{charLimit - content.length}</span>
              </div>
            )}
            <button
              type="submit"
              className="rounded px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: "#c9a84c", color: "#0d1009" }}
              disabled={!canSubmit || content.length > charLimit}
            >
              投稿する
            </button>
          </div>
        </div>
        {/* Premium upsell: show when free user exceeds 250 chars */}
        {!isPremium && content.length > 250 && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs animate-fade-in" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span style={{ color: "#9a7c35" }}>プレミアムなら1,000文字まで投稿可能</span>
            <a href="/settings" className="font-semibold whitespace-nowrap" style={{ color: "#c9a84c" }}>PRO になる</a>
          </div>
        )}
      </form>
    </div>
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // --- 認証未確定時は背景のみ（読み込み画面なし、useLayoutEffectで即時に確定）---
  if (!isInitialized) {
    return <div className="min-h-screen bg-[#0d1009]" />;
  }

  // --- Not logged in: ランディングページ + Auth フォーム ---
  if (!currentUser) {
    return (
      <div className="min-h-screen" style={{ background: "#0d1009" }}>
        {/* Hero */}
        <div className="relative overflow-hidden px-4 pb-10 pt-16 text-center">
          <div className="relative mx-auto max-w-2xl">
            <div className="mb-8 flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(154,124,53,0.08))",
                  border: "1.5px solid rgba(201,168,76,0.3)",
                  boxShadow: "0 0 40px rgba(201,168,76,0.12)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#c9a84c" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
            </div>
            <h1
              className="font-[family-name:var(--font-playfair)] text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: "#ddd6c8" }}
            >
              Poker SNS
            </h1>
            <p className="mt-4 text-lg leading-relaxed sm:text-xl" style={{ color: "#6b7a66" }}>
              ポーカーハンドを共有して、もっと上手くなる
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["ハンドを記録", "仲間と議論", "戦略を磨く", "成長を実感"].map((text) => (
                <span
                  key={text}
                  className="rounded px-3 py-1.5 text-sm"
                  style={{
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.18)",
                    color: "#9a7c35",
                  }}
                >
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Auth フォーム */}
        <div className="flex flex-col items-center px-4 pb-16">
          {oauthError && (
            <div
              className="mb-4 w-full max-w-sm rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(176,48,48,0.15)",
                border: "1px solid rgba(176,48,48,0.35)",
                color: "#f09090",
              }}
            >
              {oauthError}
            </div>
          )}
          {xPending ? (
            /* X メール補完モーダル */
            <div
              className="w-full max-w-sm rounded-xl p-8"
              style={{
                background: "#0f1410",
                border: "1px solid #1f2a1e",
                boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
              }}
            >
              <div className="mb-5 text-center">
                <div
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-white text-xl font-bold"
                  style={{ background: "#111", border: "1px solid #333" }}
                >
                  𝕏
                </div>
                <h2 className="text-[15px] font-semibold" style={{ color: "#ddd6c8" }}>
                  メールアドレスを登録
                </h2>
                <p className="mt-1 text-xs" style={{ color: "#9a8e7a" }}>
                  <span className="font-medium">{xPending.xProfile.name}</span> (@{xPending.xProfile.username}) でXログイン中。<br />
                  アカウントに紐付けるメールアドレスを入力してください。
                </p>
              </div>
              {xEmailError && (
                <div
                  className="mb-3 rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "rgba(176,48,48,0.15)",
                    border: "1px solid rgba(176,48,48,0.35)",
                    color: "#f09090",
                  }}
                >
                  {xEmailError}
                </div>
              )}
              <form onSubmit={handleXComplete} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={xEmail}
                    onChange={(e) => setXEmail(e.target.value)}
                    placeholder="例：taro@example.com"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                    style={{
                      background: "#0d1009",
                      border: "1px solid #1f2a1e",
                      color: "#ddd6c8",
                    }}
                    autoComplete="email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={xEmailSubmitting}
                  className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "#c9a84c", color: "#0d1009" }}
                >
                  {xEmailSubmitting ? "処理中..." : "登録してログイン"}
                </button>
              </form>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => { setXPending(null); setXEmail(""); setXEmailError(null); }}
                  className="text-xs hover:underline"
                  style={{ color: "#6b7a66" }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          )}
        </div>
        {/* フッター */}
        <div className="border-t px-4 py-6 text-center" style={{ borderColor: "#1f2a1e" }}>
          <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ color: "#2a3828" }}>
            <a href="/terms" className="transition-colors hover:underline" style={{ color: "#6b7a66" }}>利用規約</a>
            <a href="/privacy" className="transition-colors hover:underline" style={{ color: "#6b7a66" }}>プライバシーポリシー</a>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "#2a3828" }}>© 2026 Poker SNS</p>
        </div>
      </div>
    );
  }

  // --- Logged in: 3-column layout (左サイドバー + メイン + 右サイドバー) ---
  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto flex min-h-screen max-w-[1280px]">
        {/* Left Sidebar */}
        <aside
          className="sticky top-0 hidden h-screen w-20 flex-col justify-between p-2 md:flex lg:w-64 lg:px-3 lg:py-3"
          style={{ background: "#080a08", borderRight: "1px solid #1f2a1e" }}
        >
          <div>
            <div className="mb-6 flex items-center gap-2.5 px-2 py-2">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(154,124,53,0.1))",
                  border: "1px solid rgba(201,168,76,0.25)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#c9a84c" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <span
                className="hidden font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-tight lg:inline"
                style={{ color: "#ddd6c8" }}
              >
                Poker SNS
              </span>
            </div>
            <nav className="space-y-0.5">
              {/* ホーム */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 lg:text-sm" style={{ color: "#c9a84c", background: "rgba(201,168,76,0.06)" }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                <span className="hidden lg:inline">ホーム</span>
              </button>
              {/* 検索 */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/search"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <span className="hidden lg:inline">検索</span>
              </button>
              {/* 通知 */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/notifications"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <div className="relative">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "#c9a84c", color: "#0d1009" }}>{unreadCount}</span>}
                </div>
                <span className="hidden lg:inline">通知</span>
              </button>
              {/* トレンド */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/explore"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>
                <span className="hidden lg:inline">トレンド</span>
              </button>
              {/* ブックマーク */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/bookmarks"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                <span className="hidden lg:inline">ブックマーク</span>
              </button>
              {/* サロン */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/salons"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                <span className="hidden lg:inline">サロン</span>
              </button>
              {/* トーナメント */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/tournaments"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" /></svg>
                <span className="hidden lg:inline">トーナメント</span>
              </button>
              {/* コーチング */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/coaching"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                <span className="hidden lg:inline">コーチング</span>
              </button>
              {/* おすすめ */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/partners"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                <span className="hidden lg:inline">おすすめ</span>
              </button>
              {/* 設定 */}
              <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/settings"; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="hidden lg:inline">設定</span>
              </button>
            </nav>
            <button
              onClick={() => { if (currentUser && !currentUser.emailVerified) { showToast("メールアドレスの認証が必要です", "error"); return; } setShowComposeModal(true); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
              style={{ background: "#c9a84c", color: "#0d1009" }}
            >
              <svg className="h-5 w-5 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden lg:inline">投稿する</span>
            </button>
          </div>
          <div className="border-t pt-2" style={{ borderColor: "#1f2a1e" }}>
            <button
              onClick={() => { if (typeof window !== "undefined") window.location.href = `/profile/${currentUser.username}`; }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={`${API_BASE}${currentUser.avatarUrl}`}
                  alt={currentUser.name}
                  className="h-8 w-8 rounded-full object-cover"
                  style={{ border: "1px solid rgba(201,168,76,0.2)" }}
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    color: "#c9a84c",
                  }}
                >
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="hidden flex-1 text-left lg:block">
                <div className="text-sm font-semibold" style={{ color: "#ddd6c8" }}>{currentUser.name}</div>
                <div className="text-xs" style={{ color: "#6b7a66" }}>@{currentUser.username}</div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-red-900/20"
              style={{ color: "#6b7a66" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e05050"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              <span className="hidden lg:inline">ログアウト</span>
            </button>
            <div className="mt-2 hidden border-t pt-2 lg:block" style={{ borderColor: "#1f2a1e" }}>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-2">
                <a href="/terms" className="text-[10px] transition-colors hover:underline" style={{ color: "#2a3828" }}>利用規約</a>
                <span className="text-[10px]" style={{ color: "#2a3828" }}>·</span>
                <a href="/privacy" className="text-[10px] transition-colors hover:underline" style={{ color: "#2a3828" }}>プライバシー</a>
              </div>
              <p className="mt-0.5 px-2 text-[9px]" style={{ color: "#1f2a1e" }}>© 2026 Poker SNS</p>
            </div>
          </div>
        </aside>

        {/* Main Column */}
        <main className="min-h-screen flex-1 pb-20 md:max-w-xl md:pb-0" style={{ background: "#0d1009" }}>
          <div className="sticky top-0 z-50 border-b px-4 py-3.5" style={{ background: "#080a08", borderColor: "#1f2a1e" }}>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight" style={{ color: "#ddd6c8" }}>ホーム</h1>
          </div>
          {currentUser && !currentUser.emailVerified && (
            <div className="relative z-[45] flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.06)" }}>
              <p className="text-xs" style={{ color: "#c9a84c" }}>メールアドレスが未認証です。投稿するには認証が必要です。</p>
              <button
                type="button"
                disabled={resendVerificationLoading}
                onClick={async () => {
                  setResendVerificationLoading(true);
                  try {
                    const res = await fetchWithAuth(`${API_BASE}/auth/resend-verification`, { method: "POST" });
                    const data = await res.json().catch(() => ({}));
                    if (data.verificationLink) {
                      if (typeof window !== "undefined") window.location.href = data.verificationLink;
                      return;
                    }
                    if (!res.ok) {
                      showToast(data.message ?? "再送信に失敗しました", "error");
                      return;
                    }
                    showToast("確認メールを再送信しました");
                  } catch {
                    showToast("再送信に失敗しました。通信またはログイン状態を確認してください。", "error");
                  } finally {
                    setResendVerificationLoading(false);
                  }
                }}
                className="ml-2 flex-shrink-0 cursor-pointer rounded px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                {resendVerificationLoading ? "送信中…" : "再送信"}
              </button>
            </div>
          )}
          {/* past_due payment warning banner */}
          {currentUser?.subscriptionStatus === "past_due" && (
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)" }}>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                <p className="text-xs" style={{ color: "#c9a84c" }}>お支払いに問題があります。プレミアム機能を維持するには支払い情報を更新してください。</p>
              </div>
              <a href="/settings" className="ml-2 flex-shrink-0 rounded px-3 py-1 text-xs font-semibold" style={{ background: "#c9a84c", color: "#0d1009" }}>更新</a>
            </div>
          )}
          <div
            className="mx-3 mt-3 cursor-pointer rounded-lg px-4 py-3.5 transition-all"
            style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
            onClick={() => { if (currentUser && !currentUser.emailVerified) { showToast("メールアドレスの認証が必要です", "error"); return; } setShowComposeModal(true); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1f2a1e"; }}
          >
            <div className="flex items-center gap-3">
              {currentUser.avatarUrl ? (
                <img
                  src={`${API_BASE}${currentUser.avatarUrl}`}
                  alt={currentUser.name}
                  className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                  style={{ border: "1px solid rgba(201,168,76,0.2)" }}
                />
              ) : (
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    color: "#c9a84c",
                  }}
                >
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <span className="text-[15px]" style={{ color: "#3a4238" }}>今日のハンドを共有する...</span>
            </div>
          </div>
          {error && (
            <div className="mx-3 mt-3 rounded-lg px-4 py-3" style={{ background: "rgba(176,48,48,0.12)", border: "1px solid rgba(176,48,48,0.3)" }}>
              <p className="text-sm" style={{ color: "#f09090" }}>{error}</p>
              <button
                onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}
                className="mt-2 rounded px-3 py-1 text-xs font-medium transition-colors"
                style={{ border: "1px solid rgba(176,48,48,0.4)", color: "#f09090" }}
              >
                再試行
              </button>
            </div>
          )}
          {loadingPosts ? (
            <ul className="space-y-3 px-3 py-3">
              {Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)}
            </ul>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-16 text-center">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#6b7a66" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: "#ddd6c8" }}>まだ投稿がありません</p>
              <p className="mt-1 text-sm" style={{ color: "#6b7a66" }}>最初のハンドを共有してみましょう</p>
              <button
                onClick={() => setShowComposeModal(true)}
                className="mt-5 rounded px-6 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "#c9a84c", color: "#0d1009" }}
              >
                投稿する
              </button>
            </div>
          ) : (
            <ul className="space-y-3 px-3 py-3">
              {(() => {
                const AD_INSERT_EVERY = 3;
                const isPremium = currentUser?.subscriptionStatus === "active" || currentUser?.subscriptionStatus === "canceled";
                const items: Array<{ type: "post"; post: Post } | { type: "ad"; ad: Ad }> = [];
                posts.forEach((post, i) => {
                  items.push({ type: "post", post });
                  if (!isPremium && (i + 1) % AD_INSERT_EVERY === 0 && ads.length > 0) {
                    const adIndex = Math.floor((i + 1) / AD_INSERT_EVERY) - 1;
                    items.push({ type: "ad", ad: ads[adIndex % ads.length] });
                  }
                });
                return items.map((item, idx) =>
                  item.type === "post" ? (
                    <PostItem key={item.post.id} post={item.post} currentUser={currentUser} replyingTo={replyingTo} replyContent={replyContent} actionLoading={actionLoading} onSetReplyingTo={setReplyingTo} onSetReplyContent={setReplyContent} onToggleLike={handleToggleLike} onToggleRepost={handleToggleRepost} onToggleBookmark={handleToggleBookmark} onToggleFollow={handleToggleFollow} onReply={handleReply} onDelete={handleDeletePost} />
                  ) : (
                    <AdCard key={`ad-${idx}-${item.ad.id}`} ad={item.ad} />
                  ),
                );
              })()}
              {timelineHasMore && (
                <li ref={(el) => { loadMoreRef.current = el; }} className="flex justify-center py-3">
                  {loadingMore && <span className="text-sm" style={{ color: "#6b7a66" }}>読み込み中...</span>}
                </li>
              )}
            </ul>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-shrink-0 overflow-y-auto px-4 xl:block xl:w-80 xl:pt-3">
          <div
            className="rounded-lg px-4 py-2.5 transition-all"
            style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = rightSidebarSearch.trim();
                if (q && typeof window !== "undefined") {
                  window.location.href = `/search?q=${encodeURIComponent(q)}`;
                }
              }}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#6b7a66" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input
                type="text"
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="検索"
                style={{ color: "#ddd6c8" }}
                value={rightSidebarSearch}
                onChange={(e) => setRightSidebarSearch(e.target.value)}
              />
            </form>
          </div>
          {featuredPartners.length > 0 && (
            <div className="mt-3 rounded-lg p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>
                おすすめサービス
              </h3>
              <div className="space-y-2">
                {featuredPartners.map((partner) => (
                  <AffiliateCard key={partner.id} partner={partner} referrer="sidebar" compact />
                ))}
              </div>
              <button
                onClick={() => { if (typeof window !== "undefined") window.location.href = "/partners"; }}
                className="mt-3 w-full text-center text-xs font-medium transition-colors hover:underline"
                style={{ color: "#c9a84c" }}
              >
                すべて見る
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div
            className="animate-fade-in relative mx-4 max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-xl p-5"
            style={{
              background: "#0f1410",
              border: "1px solid #1f2a1e",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
            }}
          >
            <button
              onClick={() => { setShowComposeModal(false); setError(null); }}
              className="absolute right-3 top-3 rounded p-1.5 transition-colors"
              style={{ color: "#6b7a66" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {composeFormJSX}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 md:hidden"
        style={{
          background: "#080a08",
          borderTop: "1px solid #1f2a1e",
          boxShadow: "0 -2px 20px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} className="flex flex-col items-center gap-0.5 p-2" style={{ color: "#c9a84c" }}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        </button>
        <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/search"; }} className="flex flex-col items-center gap-0.5 p-2 transition-colors" style={{ color: "#6b7a66" }}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        </button>
        <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/notifications"; }} className="relative flex flex-col items-center gap-0.5 p-2 transition-colors" style={{ color: "#6b7a66" }}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "#c9a84c", color: "#0d1009" }}>{unreadCount}</span>}
        </button>
        <button onClick={() => { if (typeof window !== "undefined") window.location.href = `/profile/${currentUser.username}`; }} className="flex flex-col items-center gap-0.5 p-2 transition-colors" style={{ color: "#6b7a66" }}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
        </button>
      </nav>

      {/* Mobile FAB */}
      <button
        onClick={() => { if (currentUser && !currentUser.emailVerified) { showToast("メールアドレスの認証が必要です", "error"); return; } setShowComposeModal(true); }}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-all md:hidden"
        style={{ background: "#c9a84c", color: "#0d1009", boxShadow: "0 4px 20px rgba(201,168,76,0.35)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </button>

    </div>
  );
}
