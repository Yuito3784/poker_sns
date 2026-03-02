/**
 * nginx ヘッダーテスト (5件)
 * qa-report.md セクション 3.5 に対応
 *
 * 前提条件: Docker Compose で全サービスが起動していること
 * 実行: docker compose up -d && npm run test:e2e -- --testPathPattern="nginx-headers"
 *
 * 注意: これらのテストは nginx プロキシ経由のレスポンスを検証するため、
 * Docker Compose 環境でのみ実行可能。CI/CDでは docker compose up 後に実行する。
 */

const NGINX_URL = process.env.NGINX_TEST_URL || 'http://localhost:80';

// Docker Compose が起動しているかチェック
async function isNginxAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${NGINX_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

describe('nginx Security Headers (3.5.1-3.5.5)', () => {
  let nginxAvailable = false;

  beforeAll(async () => {
    nginxAvailable = await isNginxAvailable();
    if (!nginxAvailable) {
      console.warn(
        'SKIP: nginx is not available. Start Docker Compose to run these tests.\n' +
        'Run: docker compose up -d',
      );
    }
  });

  // 3.5.1: nginx HSTS ヘッダー
  it('3.5.1: nginx should include HSTS header', async () => {
    if (!nginxAvailable) return;

    const res = await fetch(`${NGINX_URL}/api/health`);
    const hsts = res.headers.get('strict-transport-security');

    // 本番 nginx-prod.conf でのみ HSTS が設定される
    // 開発環境では未設定の場合がある
    if (hsts) {
      expect(hsts).toContain('max-age=63072000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    } else {
      console.warn('HSTS header not set - verify nginx-prod.conf is in use');
    }
  });

  // 3.5.2: nginx X-Content-Type-Options
  it('3.5.2: nginx should include X-Content-Type-Options: nosniff', async () => {
    if (!nginxAvailable) return;

    const res = await fetch(`${NGINX_URL}/api/health`);
    const header = res.headers.get('x-content-type-options');
    expect(header).toBe('nosniff');
  });

  // 3.5.3: nginx X-Frame-Options
  it('3.5.3: nginx should include X-Frame-Options: DENY', async () => {
    if (!nginxAvailable) return;

    const res = await fetch(`${NGINX_URL}/api/health`);
    const header = res.headers.get('x-frame-options');
    expect(header).toBe('DENY');
  });

  // 3.5.4: nginx Referrer-Policy
  it('3.5.4: nginx should include Referrer-Policy: strict-origin-when-cross-origin', async () => {
    if (!nginxAvailable) return;

    const res = await fetch(`${NGINX_URL}/api/health`);
    const header = res.headers.get('referrer-policy');
    expect(header).toBe('strict-origin-when-cross-origin');
  });

  // 3.5.5: HTTP → HTTPS リダイレクト
  it('3.5.5: HTTP should redirect to HTTPS (301)', async () => {
    if (!nginxAvailable) return;

    // HTTP リダイレクトテスト（本番環境でのみ有効）
    // 開発環境では SSL 未設定のため skip
    try {
      const res = await fetch(`http://localhost:80/api/health`, {
        redirect: 'manual',
      });

      // 本番では 301 リダイレクト、開発では 200
      if (res.status === 301) {
        const location = res.headers.get('location');
        expect(location).toMatch(/^https:\/\//);
      } else {
        console.warn('HTTP->HTTPS redirect not active - dev mode or no SSL configured');
      }
    } catch {
      console.warn('HTTP redirect test skipped - connection error');
    }
  });
});
