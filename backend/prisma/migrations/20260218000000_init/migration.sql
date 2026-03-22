-- 誤って追加された「フル再初期化」用マイグレーション。
-- 20260124〜20260216 のマイグレーションですでに User / TableType / PokerHand 等が存在するため、
-- 元の CREATE TYPE / CREATE TABLE 群は常に重複エラーになる。
-- インクリメンタル DB 向けの不足分は 20260304000000_add_missing_after_old_init で補完する。
-- 本番の P3018/P3009 を解消するため、このファイルは意図的に no-op とする。
SELECT 1;
