import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

interface XTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class XAutopostService {
  private readonly logger = new Logger(XAutopostService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly encryptionKey: Buffer | null;
  private readonly anthropicKey: string;
  private readonly siteUrl: string;

  // OAuth 1.0a credentials for media upload
  private readonly oauth1ConsumerKey: string;
  private readonly oauth1ConsumerSecret: string;
  private readonly oauth1AccessToken: string;
  private readonly oauth1AccessSecret: string;

  private readonly pkceStore = new Map<
    string,
    { codeVerifier: string; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {
    this.clientId = (process.env.X_AUTOPOST_CLIENT_ID || '').trim();
    this.clientSecret = (process.env.X_AUTOPOST_CLIENT_SECRET || '').trim();
    this.anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    this.siteUrl =
      process.env.X_AUTOPOST_SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.pokersns.com';

    // OAuth 1.0a (media upload requires this)
    this.oauth1ConsumerKey = (process.env.X_OAUTH1_CONSUMER_KEY || '').trim();
    this.oauth1ConsumerSecret = (
      process.env.X_OAUTH1_CONSUMER_SECRET || ''
    ).trim();
    this.oauth1AccessToken = (process.env.X_OAUTH1_ACCESS_TOKEN || '').trim();
    this.oauth1AccessSecret = (process.env.X_OAUTH1_ACCESS_SECRET || '').trim();

    const encKeyHex = (process.env.TOKEN_ENCRYPTION_KEY || '').trim();
    this.encryptionKey =
      encKeyHex.length === 64 ? Buffer.from(encKeyHex, 'hex') : null;
  }

  private isReady(): boolean {
    return !!(this.clientId && this.clientSecret && this.encryptionKey);
  }

  // ─── OAuth (初回セットアップ用) ───

  getOAuthUrl(): string {
    if (!this.clientId) throw new Error('X_AUTOPOST_CLIENT_ID is not set');

    const state = randomBytes(16).toString('hex');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    this.pkceStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const callbackBase =
      process.env.X_AUTOPOST_CALLBACK_BASE ||
      process.env.API_URL ||
      'http://localhost:3001';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: `${callbackBase}/x-autopost/auth/callback`,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<string> {
    const stored = this.pkceStore.get(state);
    if (!stored || stored.expiresAt < Date.now()) {
      this.pkceStore.delete(state);
      throw new Error('OAuth state expired');
    }
    this.pkceStore.delete(state);

    const callbackBase =
      process.env.X_AUTOPOST_CALLBACK_BASE ||
      process.env.API_URL ||
      'http://localhost:3001';
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${callbackBase}/x-autopost/auth/callback`,
        code_verifier: stored.codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok)
      throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
    const tokenData = (await tokenRes.json()) as XTokenData;

    // ユーザー情報取得
    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=username',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const userData = userRes.ok
      ? ((await userRes.json()) as { data: { id: string; username: string } })
      : null;

    await this.storeTokens(tokenData, userData?.data);
    const username = userData?.data?.username || 'unknown';
    this.logger.log(`X autopost connected: @${username}`);
    return username;
  }

  // ─── トークン暗号化・管理 ───

  private encrypt(text: string): string {
    if (!this.encryptionKey) throw new Error('TOKEN_ENCRYPTION_KEY not set');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(data: string): string {
    if (!this.encryptionKey) throw new Error('TOKEN_ENCRYPTION_KEY not set');
    const [ivHex, tagHex, encHex] = data.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return (
      decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') +
      decipher.final('utf8')
    );
  }

  private async storeTokens(
    tokenData: XTokenData,
    xUser?: { id: string; username: string },
  ): Promise<void> {
    const data = {
      accessToken: this.encrypt(tokenData.access_token),
      refreshToken: this.encrypt(tokenData.refresh_token),
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      xUserId: xUser?.id,
      xUsername: xUser?.username,
    };

    const existing = await this.prisma.xAutoPostToken.findFirst();
    if (existing) {
      await this.prisma.xAutoPostToken.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.xAutoPostToken.create({ data });
    }
  }

  private async getAccessToken(): Promise<string> {
    const token = await this.prisma.xAutoPostToken.findFirst();
    if (!token) throw new Error('X not connected');

    // 期限5分前ならリフレッシュ
    if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const refreshToken = this.decrypt(token.refreshToken);
      const credentials = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');

      const res = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!res.ok) throw new Error('Token refresh failed');
      const tokenData = (await res.json()) as XTokenData;
      await this.storeTokens(tokenData);
      return tokenData.access_token;
    }

    return this.decrypt(token.accessToken);
  }

  // ─── ツイート投稿 ───

  private async postTweet(text: string, mediaIds?: string[]): Promise<string> {
    const accessToken = await this.getAccessToken();

    const body: Record<string, unknown> = { text };
    if (mediaIds?.length) {
      body.media = { media_ids: mediaIds };
    }

    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Tweet failed: ${await res.text()}`);
    const data = (await res.json()) as { data: { id: string } };
    return data.data.id;
  }

  // ─── 画像アップロード ───

  // ─── OAuth 1.0a 署名 (media upload用) ───

  private oauth1Header(
    method: string,
    url: string,
    params: Record<string, string> = {},
  ): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.oauth1ConsumerKey,
      oauth_nonce: randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.oauth1AccessToken,
      oauth_version: '1.0',
    };

    const allParams = { ...oauthParams, ...params };
    const paramString = Object.keys(allParams)
      .sort()
      .map(
        (k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`,
      )
      .join('&');

    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString),
    ].join('&');

    const signingKey = `${encodeURIComponent(this.oauth1ConsumerSecret)}&${encodeURIComponent(this.oauth1AccessSecret)}`;
    const signature = createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    oauthParams.oauth_signature = signature;

    return (
      'OAuth ' +
      Object.keys(oauthParams)
        .sort()
        .map(
          (k) =>
            `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`,
        )
        .join(', ')
    );
  }

  private async uploadMedia(imageBuffer: Buffer): Promise<string> {
    if (!this.oauth1ConsumerKey || !this.oauth1AccessToken) {
      throw new Error('OAuth 1.0a credentials not configured for media upload');
    }

    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const mediaData = imageBuffer.toString('base64');

    // OAuth 1.0a signature does NOT include body params for multipart,
    // but for application/x-www-form-urlencoded it does
    const bodyParams = {
      media_data: mediaData,
      media_category: 'tweet_image',
    };

    const authHeader = this.oauth1Header('POST', url, bodyParams);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      this.logger.error(`Media upload failed (${res.status}): ${errorBody}`);
      throw new Error(`Media upload failed: ${errorBody}`);
    }
    const data = (await res.json()) as { media_id_string: string };
    return data.media_id_string;
  }

  // ─── 最近のポーカーハンド投稿を取得 ───

  private async findRecentPokerHand() {
    // 直近30日のハンド投稿から、いいね順で1件取得
    const posts = await this.prisma.post.findMany({
      where: {
        isPokerHand: true,
        isPremiumOnly: false,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: { select: { username: true, name: true } },
        pokerHand: {
          select: {
            heroHand: true,
            result: true,
            tableType: true,
            blinds: true,
            tableSize: true,
            heroPosition: true,
          },
        },
        _count: { select: { likes: true, replies: true } },
      },
    });

    if (!posts.length) return null;

    // ランダムに1件選ぶ（毎日同じにならないように）
    return posts[Math.floor(Math.random() * posts.length)];
  }

  // ─── ハンド画像をスクリーンショットで取得 ───

  private async fetchPostImage(postId: string): Promise<Buffer | null> {
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!chromePath) {
      this.logger.warn('PUPPETEER_EXECUTABLE_PATH not set, skipping image');
      return null;
    }

    let browser;
    try {
      const puppeteer = await import('puppeteer-core');
      browser = await puppeteer.default.launch({
        executablePath: chromePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: 660,
        height: 1200,
        deviceScaleFactor: 2,
      });

      const frontendUrl =
        process.env.INTERNAL_FRONTEND_URL || 'http://frontend:3000';
      await page.goto(`${frontendUrl}/hand-render/${postId}`, {
        waitUntil: 'networkidle0',
        timeout: 20000,
      });

      // ハンドが描画されるのを待つ
      const ready = await page
        .waitForSelector('#hand-ready', { timeout: 15000 })
        .catch(() => null);

      if (!ready) {
        this.logger.warn('Hand render page did not become ready');
        return null;
      }

      // 少し待って描画を安定させる
      await new Promise((r) => setTimeout(r, 500));

      const element = await page.$('#hand-ready');
      if (!element) return null;

      const screenshot = await element.screenshot({
        type: 'png',
        omitBackground: false,
      });

      this.logger.log(`Hand screenshot captured for post ${postId}`);
      return Buffer.from(screenshot);
    } catch (e) {
      this.logger.warn(`Failed to capture hand screenshot: ${e}`);
      return null;
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  // ─── AIでツイート内容を生成 ───

  private async generateTweetContent(
    handPost?: {
      id: string;
      content: string;
      author: { username: string; name: string | null };
      pokerHand: {
        heroHand: string | null;
        result: string | null;
        tableType: string;
        blinds: string;
        tableSize: string;
        heroPosition: string;
      } | null;
      _count: { likes: number; replies: number };
    } | null,
  ): Promise<string> {
    const postUrl = handPost
      ? `${this.siteUrl}/post/${handPost.id}`
      : this.siteUrl;

    if (handPost?.pokerHand) {
      const h = handPost.pokerHand;
      const prompt = `あなたはポーカーSNS「Poker SNS」の公式Xアカウント運営者です。
「今日の一問」として、実際のユーザーが投稿したポーカーハンドをXで紹介するツイートを作成してください。

## ハンド情報
- テーブル: ${h.tableType} ${h.blinds} ${h.tableSize}
- ヒーローポジション: ${h.heroPosition}
- ヒーローハンド: ${h.heroHand || '非公開'}
- 結果: ${h.result || '非公開'}
- 投稿者: ${handPost.author.name || handPost.author.username}
- いいね: ${handPost._count.likes}件
- 投稿本文の一部: ${handPost.content.slice(0, 80)}

## ルール
- 280文字以内（URLは23文字としてカウント）
- 「今日の一問」「あなたならどうする？」のような問いかけ形式
- ハンドのシチュエーションを簡潔に紹介し、読者に考えさせる
- 「みんなの意見を聞かせて」「議論はこちら」のようにアプリへ誘導
- 最後に投稿URL(${postUrl})を含める
- ハッシュタグは2つまで（#ポーカー は必ず含める）
- 絵文字は1-2個まで
- 画像は別途添付するので、画像について言及しなくてよい

ツイート本文のみを出力してください。`;

      return this.callClaude(prompt);
    }

    // ハンド投稿がない場合は通常のプロモーション
    const [totalUsers, totalPosts, totalHands] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isPokerHand: true } }),
    ]);

    const prompt = `あなたはポーカーSNS「Poker SNS」のマーケティング担当です。
X (Twitter) に投稿する1ツイートを日本語で作成してください。

## サービス情報
- Poker SNS: ポーカープレイヤー専用のSNS
- URL: ${this.siteUrl}
- ユーザー数: ${totalUsers}人
- 投稿数: ${totalPosts}件
- ハンド共有数: ${totalHands}件
- 機能: ハンド履歴の共有・議論、AI分析、プレミアム機能、コーチング

## ルール
- 280文字以内（URLは23文字としてカウント）
- ポーカープレイヤーが興味を持つ内容にする
- 以下からランダムに1つ選んでテーマにする:
  - ポーカー戦略のワンポイントアドバイス
  - プラットフォームの魅力紹介
  - ポーカーコミュニティへの呼びかけ
  - ポーカーあるある
- 最後にURL(${this.siteUrl})を含める
- ハッシュタグは2つまで（#ポーカー は必ず含める）
- 絵文字は1-2個まで、自然に使う
- 宣伝臭くなりすぎない、自然な投稿にする

ツイート本文のみを出力してください。`;

    return this.callClaude(prompt);
  }

  private async callClaude(prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API failed: ${await res.text()}`);

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content[0].text.trim();
  }

  // ─── 接続ステータス ───

  async getConnectionStatus(): Promise<{
    connected: boolean;
    username: string | null;
    configured: boolean;
  }> {
    const configured = this.isReady();
    const token = await this.prisma.xAutoPostToken.findFirst();
    return {
      connected: !!token,
      username: token?.xUsername || null,
      configured,
    };
  }

  // ─── 手動投稿 ───

  async manualPost(): Promise<{
    tweetId: string;
    text: string;
    hasImage: boolean;
  }> {
    if (!this.isReady() || !this.anthropicKey) {
      throw new Error('X autopost not configured');
    }
    const token = await this.prisma.xAutoPostToken.findFirst();
    if (!token) throw new Error('X not connected');

    const { tweetText, mediaIds } = await this.buildTweet();
    const tweetId = await this.postTweet(tweetText, mediaIds);
    this.logger.log(`Manual post done: ${tweetId}\n${tweetText}`);
    return { tweetId, text: tweetText, hasImage: mediaIds.length > 0 };
  }

  // ─── 連携解除 ───

  async disconnect(): Promise<{ disconnected: boolean }> {
    await this.prisma.xAutoPostToken.deleteMany();
    this.logger.log('X autopost disconnected');
    return { disconnected: true };
  }

  // ─── ツイート組み立て (ハンド検索 → 画像取得 → テキスト生成) ───

  private async buildTweet(): Promise<{
    tweetText: string;
    mediaIds: string[];
  }> {
    const handPost = await this.findRecentPokerHand();
    const tweetText = await this.generateTweetContent(handPost);

    const mediaIds: string[] = [];
    if (handPost) {
      try {
        const image = await this.fetchPostImage(handPost.id);
        if (image) {
          const mediaId = await this.uploadMedia(image);
          mediaIds.push(mediaId);
          this.logger.log(`Image uploaded for post ${handPost.id}`);
        }
      } catch (e) {
        this.logger.warn(`Image upload failed, posting without image: ${e}`);
      }
    }

    return { tweetText, mediaIds };
  }

  // ─── 毎日自動投稿 (12:00 UTC = 21:00 JST) ───

  @Cron('0 12 * * *')
  async dailyAutoPost(): Promise<void> {
    // 本番環境のみで自動投稿
    if (process.env.X_AUTOPOST_CRON_ENABLED !== 'true') {
      this.logger.debug(
        'X autopost cron disabled (set X_AUTOPOST_CRON_ENABLED=true to enable)',
      );
      return;
    }
    if (!this.isReady() || !this.anthropicKey) {
      this.logger.debug('X autopost not configured, skipping');
      return;
    }

    const token = await this.prisma.xAutoPostToken.findFirst();
    if (!token) return;

    try {
      const { tweetText, mediaIds } = await this.buildTweet();
      const tweetId = await this.postTweet(tweetText, mediaIds);
      this.logger.log(
        `Daily auto-post done: ${tweetId} (image: ${mediaIds.length > 0})\n${tweetText}`,
      );
    } catch (e) {
      this.logger.error(`Daily auto-post failed: ${e}`);
    }
  }
}
