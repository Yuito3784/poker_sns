import type { PokerHand } from "../app/components/PokerHandDisplay";

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  subscriptionStatus?: string;
};

export type Post = {
  id: string;
  content: string;
  imageUrl?: string | null;
  isPokerHand?: boolean;
  pokerHand?: PokerHand | null;
  parentPost?: Post | null;
  isPinned?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    subscriptionStatus?: string;
  };
  _count?: {
    likes: number;
    replies: number;
    reposts?: number;
  };
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  isFollowingAuthor?: boolean;
};

export type Reply = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
  };
};

export type Notification = {
  id: string;
  type: "LIKE" | "FOLLOW" | "REPLY" | "MENTION" | "REPOST";
  isRead: boolean;
  createdAt: string;
  postId?: string | null;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  post?: {
    id: string;
    content: string;
  } | null;
};

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  pinnedPostId: string | null;
  subscriptionStatus?: string;
  createdAt: string;
  _count: {
    followers: number;
    following: number;
    posts: number;
  };
};

export type ProfileUser = {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  _count?: { followers: number; following: number; posts: number };
};

export type SearchResults = {
  users: ProfileUser[];
  posts: Post[];
};

export type Ad = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl: string;
};

export type AffiliatePartner = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  category: "POKER_ROOM" | "TOOL" | "LEARNING" | "GOODS";
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bonus?: string | null;
  sortOrder: number;
};
