import type { PokerHand } from "../app/components/PokerHandDisplay";
import type { SubscriptionStatus } from "./subscription";

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  subscriptionStatus?: SubscriptionStatus;
};

export type Post = {
  id: string;
  content: string;
  imageUrl?: string | null;
  isPokerHand?: boolean;
  pokerHand?: PokerHand | null;
  parentPost?: Post | null;
  isPremiumOnly?: boolean;
  isPinned?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    subscriptionStatus?: SubscriptionStatus;
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
    avatarUrl?: string | null;
  };
};

export type Notification = {
  id: string;
  type: "LIKE" | "FOLLOW" | "REPLY" | "MENTION" | "REPOST" | "TIP" | "CONTENT_PURCHASE" | "SALON_JOIN" | "TOURNAMENT_JOIN" | "COACHING_BOOKING";
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
  subscriptionStatus?: SubscriptionStatus;
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
  /** 検索結果などで、現在ユーザーがこのユーザーをフォローしているか */
  isFollowing?: boolean;
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

// --- Tipping ---
export type Tip = {
  id: string;
  senderId: string;
  receiverId: string;
  postId?: string | null;
  amount: number;
  message?: string | null;
  status: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
};

// --- Paid Content ---
export type PaidContent = {
  id: string;
  postId: string;
  price: number;
  previewText?: string | null;
  content?: string | null;
  hasPurchased?: boolean;
  isAuthor?: boolean;
  post?: Post;
};

// --- Salon ---
export type Salon = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  monthlyPrice: number;
  isActive: boolean;
  createdAt: string;
  owner?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  _count?: {
    members: number;
    posts: number;
  };
  isMember?: boolean;
  isOwner?: boolean;
};

export type SalonPost = {
  id: string;
  salonId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
};

// --- Tournament ---
export type Tournament = {
  id: string;
  organizerId: string;
  name: string;
  description: string;
  entryFee: number;
  maxPlayers: number;
  prizePool?: string | null;
  startAt: string;
  status: string;
  createdAt: string;
  organizer?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
  _count?: {
    participants: number;
  };
  isRegistered?: boolean;
  participants?: TournamentParticipant[];
};

export type TournamentParticipant = {
  id: string;
  userId: string;
  placement?: number | null;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
};

// --- Creator Earnings ---
export type CreatorEarning = {
  id: string;
  creatorId: string;
  type: "SALON_SUBSCRIPTION" | "PAID_CONTENT";
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  description?: string | null;
  stripePaymentId?: string | null;
  salonId?: string | null;
  paidContentId?: string | null;
  payoutId?: string | null;
  createdAt: string;
  salon?: { id: string; name: string; slug: string } | null;
  paidContent?: { id: string; postId: string } | null;
};

export type EarningsSummary = {
  grossTotal: number;
  feeTotal: number;
  netTotal: number;
  transactionCount: number;
  pendingPayout: number;
  monthly: {
    month: string;
    gross: number;
    fee: number;
    net: number;
  }[];
};

export type CreatorPayout = {
  id: string;
  creatorId: string;
  amount: number;
  status: "PENDING" | "COMPLETED";
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

// --- Coaching ---
export type CoachProfile = {
  id: string;
  userId: string;
  title: string;
  description: string;
  hourlyRate: number;
  specialties: string;
  experience?: string | null;
  isActive: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    bio?: string | null;
    subscriptionStatus?: SubscriptionStatus;
  };
  _count?: {
    bookings: number;
  };
};

export type CoachBooking = {
  id: string;
  coachId: string;
  studentId: string;
  scheduledAt: string;
  durationMinutes: number;
  amount: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  coach?: CoachProfile;
  student?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  };
};
