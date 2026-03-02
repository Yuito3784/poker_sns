# Security & Privacy UI - Current State Mapping & Consolidated IA Design

> Design Team / 不知火 作成 / 2026-03-02
> 宝鐘リーダー指示: セキュリティ関連UI導線の現状マッピングと統合IA設計書

---

## 1. Current State: Security UI Entry Points Map

### 1.1 Screen Inventory

現在のセキュリティ・プライバシー関連UIは以下の7箇所に分散している。

```
                            ┌─────────────────┐
                            │   Home (/)       │
                            │   └ Logout btn   │
                            └────────┬────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Settings         │  │  Profile          │  │  Auth Pages       │
    │  /settings        │  │  /profile/[user]  │  │                   │
    │                   │  │                   │  │  /forgot-password  │
    │  - Password Change│  │  - Block User     │  │  /reset-password   │
    │  - Account Delete │  │  - Mute User      │  │  /verify-email     │
    │  - Subscription   │  │  (三点メニュー内)   │  │                   │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
               │
               ▼
    ┌──────────────────┐
    │  Legal Pages      │
    │  /privacy         │
    │  /terms           │
    └──────────────────┘
```

### 1.2 Detailed Entry Point Analysis

| # | Feature | Current Location | Entry Point | UX Issue |
|---|---------|-----------------|-------------|----------|
| 1 | Password Change | `/settings` 内セクション | サイドバー → Settings → スクロール | 他の設定(Subscription)と混在 |
| 2 | Account Deletion | `/settings` 内セクション | Settings → 最下部 | 重要操作が同一ページ末尾に配置 |
| 3 | Block User | `/profile/[username]` 三点メニュー | プロフィール → ⋯ → Block | 適切（対象ユーザーのコンテキスト内） |
| 4 | Mute User | `/profile/[username]` 三点メニュー | プロフィール → ⋯ → Mute | 適切（同上） |
| 5 | Forgot Password | `/forgot-password` | ログインフォーム → リンク | 適切（認証フロー内） |
| 6 | Reset Password | `/reset-password` | メールリンク → 直接アクセス | 適切（メール経由） |
| 7 | Email Verification | `/verify-email` | メールリンク → 直接アクセス | 適切（メール経由） |
| 8 | Privacy Policy | `/privacy` | フッター / 登録フォーム | 発見性が低い（フッター依存） |
| 9 | Terms of Service | `/terms` | フッター / 登録フォーム | 同上 |
| 10 | Logout | Home page 内 | ユーザーメニュー | OK |
| 11 | OAuth連携管理 | なし | -- | 未実装: どのOAuth連携中か確認不可 |
| 12 | ブロックリスト管理 | なし | -- | 未実装: ブロック済みユーザー一覧なし |
| 13 | ミュートリスト管理 | なし | -- | 未実装: ミュート済みユーザー一覧なし |
| 14 | 通報機能 | なし | -- | 未実装: 投稿/ユーザー通報UI無し |
| 15 | ログインセッション管理 | なし | -- | 未実装: アクティブセッション確認不可 |

### 1.3 Critical Findings

**存在するが分散しているもの (3件)**:
- Password Change, Account Deletion → `/settings` に混在（Subscriptionと同列）
- Block/Mute → 個別プロフィールのみ（一覧管理なし）

**UIから到達不可能なもの (5件)**:
- OAuth連携状態の確認・解除
- ブロック済みユーザー一覧
- ミュート済みユーザー一覧
- 投稿/ユーザー通報
- アクティブログインセッション一覧

---

## 2. Proposed Consolidated IA (Information Architecture)

### 2.1 Settings Page Restructure

現在の`/settings`をセクション分割し、セキュリティ・プライバシーを独立させる。

```
/settings
├── [Tab / Section Navigation]
│
├── Account                          ← 新セクション
│   ├── Profile Edit (将来)
│   └── Subscription Management     ← 既存（現settingsから移動）
│
├── Security                         ← 新セクション（集約）
│   ├── Password Change             ← 既存（現settingsから移動）
│   ├── OAuth Connections            ← 新規: Google/LINE/X連携状態
│   ├── Active Sessions              ← 新規: ログイン中デバイス一覧
│   └── Account Deletion            ← 既存（現settingsから移動）
│
├── Privacy                          ← 新セクション（集約）
│   ├── Blocked Users List           ← 新規: ブロック一覧・解除
│   ├── Muted Users List             ← 新規: ミュート一覧・解除
│   └── Data & Privacy               ← /privacy, /terms へのリンク
│
└── Notifications (将来)
    └── Push / Email preferences
```

### 2.2 Wireframe: Settings with Tab Navigation

```
+================================================================+
|  ♠ Poker SNS                    [@username]  [Notifications]    |
+================================================================+
|          |                                                      |
| Sidebar  |  Settings                                            |
|          |                                                      |
|  Home    |  ┌─────────┬──────────┬──────────┐                 |
|  Explore |  │ Account │ Security │ Privacy  │                 |
|  ...     |  └─────────┴──────────┴──────────┘                 |
|          |                                                      |
|          |  ── Security Tab Selected ──                         |
|          |                                                      |
|          |  Password                                            |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  Current Password  [________________]       │     |
|          |  │  New Password      [________________]       │     |
|          |  │  Confirm           [________________]       │     |
|          |  │                                              │     |
|          |  │              [ Change Password ]             │     |
|          |  │              (gold btn, #c9a84c)             │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
|          |  OAuth Connections                                   |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  [G] Google       Connected    [Disconnect] │     |
|          |  │  [L] LINE         Not linked   [Connect]    │     |
|          |  │  [X] X (Twitter)  Connected    [Disconnect] │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
|          |  Active Sessions (将来実装)                           |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  Chrome / macOS    Current session          │     |
|          |  │  Safari / iOS      2 hours ago  [Revoke]   │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
|          |  ── Danger Zone ──                                  |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  Delete Account                              │     |
|          |  │  border: 1px solid #7a2020                   │     |
|          |  │  (destructive action, requires confirmation)  │     |
|          |  │                                              │     |
|          |  │           [ Delete Account ]                 │     |
|          |  │           (red btn, confirmation modal)       │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
+================================================================+
```

### 2.3 Wireframe: Privacy Tab

```
+================================================================+
|          |  Settings                                            |
|          |                                                      |
|          |  ┌─────────┬──────────┬──────────┐                 |
|          |  │ Account │ Security │ Privacy  │  ← selected     |
|          |  └─────────┴──────────┴──────────┘                 |
|          |                                                      |
|          |  Blocked Users                                       |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  [AVA] @blocked_user1    [ Unblock ]       │     |
|          |  │  [AVA] @blocked_user2    [ Unblock ]       │     |
|          |  │                                              │     |
|          |  │  No blocked users.                          │     |
|          |  │  (empty state, #7a7260)                     │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
|          |  Muted Users                                         |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  [AVA] @muted_user1      [ Unmute ]        │     |
|          |  │                                              │     |
|          |  │  No muted users.                            │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
|          |  Data & Privacy                                     |
|          |  ┌────────────────────────────────────────────┐     |
|          |  │  Privacy Policy           [→]              │     |
|          |  │  Terms of Service         [→]              │     |
|          |  └────────────────────────────────────────────┘     |
|          |                                                      |
+================================================================+
```

### 2.4 Report Feature Wireframe (新規提案)

投稿・ユーザーのコンテキストメニューに「通報」を追加。

```
Profile ⋯ Menu (current + proposed)
┌──────────────────────┐
│  Block @username      │  ← existing
│  Mute @username       │  ← existing
│  ─────────────────── │
│  Report @username     │  ← NEW
└──────────────────────┘

Post ⋯ Menu (proposed)
┌──────────────────────┐
│  Report this post     │  ← NEW
└──────────────────────┘

Report Modal
┌──────────────────────────────────┐
│  Report                           │
│                                    │
│  Reason:                          │
│  ○ Spam                          │
│  ○ Harassment                    │
│  ○ Inappropriate content         │
│  ○ Other                         │
│                                    │
│  Additional details (optional)    │
│  [_____________________________] │
│                                    │
│  [ Cancel ]     [ Submit Report ] │
│  (#7a7260)      (#c9a84c btn)    │
└──────────────────────────────────┘
```

---

## 3. Design Tokens for New Security UI Components

### 3.1 Tab Navigation

| Element | Property | Value |
|---------|----------|-------|
| Tab bar | border-bottom | `1px solid #1f2a1e` |
| Tab inactive | color | `#7a7260` |
| Tab active | color | `#c9a84c` |
| Tab active | border-bottom | `2px solid #c9a84c` |
| Tab hover | color | `#ddd6c8` |
| Tab | padding | `12px 24px` |
| Tab | font-size | `14px` |
| Tab | font-weight | `500` |

### 3.2 Security Card Sections

| Element | Property | Value |
|---------|----------|-------|
| Section card | background | `#131a14` |
| Section card | border | `1px solid #1f2a1e` |
| Section card | border-radius | `12px` |
| Section card | padding | `24px` |
| Section card | margin-bottom | `16px` |
| Section title | color | `#ddd6c8` |
| Section title | font-size | `16px` |
| Section title | font-weight | `600` |
| Section title | margin-bottom | `16px` |

### 3.3 Danger Zone

| Element | Property | Value |
|---------|----------|-------|
| Danger card | border | `1px solid rgba(220,60,60,0.3)` |
| Danger card | background | `rgba(220,60,60,0.05)` |
| Danger title | color | `#dc3c3c` |
| Danger button | background | `#dc3c3c` |
| Danger button | color | `#ffffff` |
| Danger button hover | background | `#b82e2e` |

### 3.4 OAuth Connection Row

| Element | Property | Value |
|---------|----------|-------|
| Row | padding | `12px 0` |
| Row | border-bottom | `1px solid #1f2a1e` |
| Provider icon | size | `24x24` |
| Provider name | color | `#ddd6c8`, 14px |
| Status connected | color | `#4a8c5c` (green-muted) |
| Status not linked | color | `#7a7260` |
| Connect btn | border | `1px solid #c9a84c`, color: `#c9a84c` |
| Disconnect btn | border | `1px solid #7a7260`, color: `#7a7260` |

### 3.5 User List Row (Block/Mute)

| Element | Property | Value |
|---------|----------|-------|
| Row | padding | `12px 16px` |
| Row | display | `flex, items-center, justify-between` |
| Row hover | background | `#192118` |
| Avatar | size | `36x36`, border-radius: 50% |
| Username | color | `#ddd6c8`, 14px |
| Action btn | border | `1px solid #2a3828` |
| Action btn text | color | `#7a7260`, 12px |
| Action btn hover | border-color | `#c9a84c`, color: `#c9a84c` |
| Empty state | color | `#4a5245`, 14px, italic |

---

## 4. Implementation Priority

### 4.1 Phase Map

| Phase | Feature | Priority | Effort | Dependency |
|-------|---------|----------|--------|------------|
| Phase 1 | Settings Tab Navigation (Account/Security/Privacy) | P0 | 0.5d | -- |
| Phase 1 | Password Change → Security tab移動 | P0 | 0.5d | Tab Nav |
| Phase 1 | Account Deletion → Security tab Danger Zone | P0 | 0.5d | Tab Nav |
| Phase 1 | Subscription → Account tab移動 | P0 | 0.5d | Tab Nav |
| Phase 2 | Blocked Users List (Privacy tab) | P1 | 1d | Backend: GET /users/me/blocked |
| Phase 2 | Muted Users List (Privacy tab) | P1 | 1d | Backend: GET /users/me/muted |
| Phase 2 | Data & Privacy links | P1 | 0.25d | -- |
| Phase 3 | OAuth Connections display | P2 | 1d | Backend: OAuth status API |
| Phase 3 | Report feature (UI + backend) | P2 | 2d | Backend: Reports module |
| Phase 4 | Active Sessions | P3 | 2d | Backend: Session tracking |

### 4.2 Backend API Requirements (Dev連携)

| Endpoint | Method | Purpose | Phase |
|----------|--------|---------|-------|
| `/users/me/blocked` | GET | ブロック済みユーザー一覧取得 | Phase 2 |
| `/users/me/muted` | GET | ミュート済みユーザー一覧取得 | Phase 2 |
| `/users/me/oauth-connections` | GET | OAuth連携状態取得 | Phase 3 |
| `/reports` | POST | 通報送信 | Phase 3 |
| `/auth/sessions` | GET | アクティブセッション一覧 | Phase 4 |
| `/auth/sessions/:id` | DELETE | セッション無効化 | Phase 4 |

---

## 5. Navigation Flow Diagram (Proposed)

```
User Menu (Sidebar / Header)
│
├── Settings (/settings)
│   │
│   ├── [Account Tab]
│   │   └── Subscription Management
│   │
│   ├── [Security Tab]
│   │   ├── Password Change
│   │   ├── OAuth Connections
│   │   ├── Active Sessions
│   │   └── Danger Zone: Account Deletion
│   │
│   └── [Privacy Tab]
│       ├── Blocked Users (manage list)
│       ├── Muted Users (manage list)
│       └── Data & Privacy → /privacy, /terms
│
├── Profile (/profile/[username])
│   └── ⋯ Context Menu (other users)
│       ├── Block / Unblock
│       ├── Mute / Unmute
│       └── Report (NEW)
│
├── Post Context Menu
│   └── Report (NEW)
│
└── Auth Flow (unauthenticated)
    ├── Login / Register (AuthForm)
    ├── Forgot Password → Email → Reset Password
    └── Email Verification (via link)
```

---

## 6. Password Mask Toggle Unification (宝鐘指示)

### 6.1 Current State

| Location | Mask Toggle | Implementation |
|----------|-------------|----------------|
| AuthForm (Login/Register) | あり | Show/Hide button |
| Settings Password Change | なし | 常にマスク |
| Reset Password | なし | 常にマスク |

### 6.2 Proposed Unification

全パスワード入力フィールドに統一的なマスクトグルを配置。

```
Password Field Spec:
┌──────────────────────────────────┐
│  [________________]  [👁]        │
│                       toggle     │
│  idle:   type="password"         │
│  toggle: type="text"             │
└──────────────────────────────────┘

Toggle Button:
  - Position: absolute, right: 12px, top: 50%, translateY(-50%)
  - Color idle: #4a5245
  - Color hover: #7a7260
  - Icon: eye (show) / eye-off (hide)
  - Size: 20x20
```

適用箇所:
1. `AuthForm.tsx` - Login/Register password fields (既存、スタイル統一のみ)
2. `/settings` - Current password, New password, Confirm password (追加)
3. `/reset-password` - New password, Confirm password (追加)
