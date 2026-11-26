# Prismarine Mobile Client

ブラウザで動く Minecraft Java Edition クライアントです。
[prismarine-web-client](https://github.com/PrismarineJS/prismarine-web-client) をベースに、
**スマートフォン/タブレット向けの操作系**、**Microsoft 公式アカウントでのログイン**、
そしてロードマップにあった未実装機能を追加しています。

- フロントエンド: Webpack + Lit + three.js + mineflayer + prismarine-viewer
- バックエンド (Vercel Functions): Microsoft 認証と Mojang session join の代理
- TCP トンネル: net-browserify 互換の外部プロキシ（デモと同じ方式）
- デプロイ: Vercel（静的フロント + `/api` 関数）

> 本プロジェクトは Mojang / Microsoft とは関係ありません。Minecraft は Mojang Studios の商標です。

## 追加した機能

### 1. モバイル操作（全面的に対応）
- 画面左のバーチャルジョイスティック（8 方向移動、大きく倒すと自動ダッシュ）
- 画面ドラッグで視点操作（タッチ専用、感度は Options から変更可能）
- 画面下の大型アクションボタン: `JUMP` / `SNEAK` / `RUN` / `HIT` / `USE` / `MINE`
- 画面右上の `CHAT` / `BAG` / `MENU`
- ホットバーをタップしてスロット選択（キーボード不要）
- 画面タップで攻撃 / ブロックやエンティティとのインタラクト
- セーフエリア（iPhone のノッチ・ホームインジケーター）対応
- メニュー・ボタン・入力欄をタッチ向けに拡大（`pointer: coarse` 判定）
- ゲームパッド的な二重入力を防ぐため、UI 表示中はタッチ操作を自動で無効化

### 2. Microsoft 公式アカウントでログイン
- 公式の **device code flow** を使用（パスワードをアプリに入力しない）
- 「Sign in」→ 表示されたコードを `microsoft.com/link` で入力するだけ
- 取得した Minecraft セッションで online-mode サーバーに参加
- リフレッシュトークンを localStorage に保存し、次回から自動更新
- Xbox Live / XSTS / Minecraft Services のトークン交換はサーバー側で実行
- Mojang の session server (`join`) も CORS 回避のためサーバー経由

### 3. シングルプレイ（外部サーバー不要）
- タイトル画面の **Singleplayer** から、ワールドを生成して遊べます
- セルフホスト時は Node サーバー内の `flying-squid` を使用します
- セルフホスト API が無い場合（Vercel / GitHub Pages などの静的ホスティング）は、
  同じ `flying-squid` を**ブラウザ内**で起動して自動的にフォールバックします
- `/?singleplayer=1` または `/singleplayer` を開くと、最初からブラウザ内モードを強制できます
- ブラウザ内モードのワールドは IndexedDB に保存され、次回続きから再開できます
- ブラウザ内エンジンは `singleplayer-server.js` として別ファイル・遅延読み込みされるため、
  通常のクライアント起動時の読み込み量は増えません
- サバイバル / クリエイティブ、ワールド名、オフラインユーザー名を選択可能
- セルフホスト時のワールドは `data/singleplayer/<ワールド名>/` に Anvil 形式で保存され、
  シングルプレイ用の埋め込みサーバーだけはプロキシのプライベート IP 制限の例外になります

### 4. 未実装だった機能
| ロードマップ | 状態 | 内容 |
| --- | --- | --- |
| Containers / Inventory | 実装 | インベントリ、チェスト等の汎用コンテナ UI。左クリック / 右クリック / Shift クリック相当、アイテム数表示 |
| Sounds | 実装 | Web Audio による効果音（採掘・設置・ヒット・ダメージ・レベルアップ・チャット等）。著作権のある音源は同梱していません |
| More world interactions | 実装 | エンティティ攻撃、`USE` でブロック/エンティティ操作、アイテム使用 |
| Cosmetic rendering | 実装 | 昼夜サイクル（太陽・月・星空）、時間に応じた空色・フォグ・ライティング |

## クイックスタート（ローカル）

```bash
npm install
npm start          # http://localhost:8080 （開発モード・自動ビルド）
# または
npm run build && npm run serve   # 本番ビルドを配信
```

ローカルでは認証 API と TCP プロキシも同じ Node サーバーが提供します。
`localhost` や `127.0.0.1` の Minecraft サーバーに接続する場合は、
接続画面の Proxy 欄を空にして（同一オリジンのプロキシを使用）、
SSRF 対策でプライベート IP が拒否されるため `PROXY_ALLOW_PRIVATE=1 npm start` で起動してください。

## Vercel へのデプロイ

1. このリポジトリを GitHub に push
2. Vercel で **Add New → Project** → リポジトリを選択
3. Framework Preset: **Other**
4. Build Command: `npm run build`
5. Output Directory: `public`
6. Deploy

`vercel.json` にビルド設定、Functions の `maxDuration`、Mojang session join 用の rewrite を定義済みです。
`api/` 配下が自動的に Vercel Functions になります。

### GitHub Actions で push 時に自動デプロイ

`.github/workflows/deploy-vercel.yml` を用意済みです。`main` / `master` への push で本番へデプロイします。

1. Vercel でプロジェクトを作成し、ローカルでリンクして ID を取得

   ```bash
   npm i -g vercel
   vercel login
   cd prismarine-mobile
   vercel link
   cat .vercel/project.json   # orgId / projectId を確認
   ```

2. Vercel の **Account Settings → Tokens** でアクセストークンを作成
3. GitHub リポジトリの **Settings → Secrets and variables → Actions** に登録
   - **Secrets**: `VERCEL_TOKEN`
   - **Variables**: `VERCEL_ORG_ID`（`orgId`）, `VERCEL_PROJECT_ID`（`projectId`）
   - （`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` は Secrets に入れても動作します）
4. `main` へ push（または Actions 画面から `Deploy to Vercel` を手動実行）

Workflow は `npm ci` → `npm test` → `vercel pull` → `vercel build --prod` →
`vercel deploy --prebuilt --prod` を実行し、デプロイ URL を Job Summary に出力します。

> Vercel 側の Git 連携を有効にしたままだと push ごとに二重デプロイされます。
> Actions で運用する場合は Git 連携を無効化するか、Ignored Build Step でスキップしてください。
> PR のプレビューデプロイは含んでいません（必要なら別 workflow を追加できます）。

### TCP プロキシについて

ブラウザから Minecraft サーバーへ直接 TCP 接続はできないため、
net-browserify 互換の WebSocket プロキシが必要です。
このアプリは prismarine-web-client のデモと同じ方式で、
既定では公開コミュニティプロキシ `proxy.mcraft.fun` を使用します。

> 旧デモの `pproxy.rom1504.fr` は現在 TLS 証明書不一致で接続できません。
> そのため、動作を確認済みの `proxy.mcraft.fun` を既定値にしています。
> 公開プロキシは第三者が運営しており、可用性・レート制限・通信の秘匿性は保証されません。

自分でプロキシを運用する場合:

```bash
# 単体プロキシとして起動（net-browserify 互換）
PORT=8080 node proxy-server.js

# Docker の場合
docker build -f Dockerfile.proxy -t minecraft-proxy .
docker run -p 8080:8080 -e PROXY_ALLOWED_HOSTS=*.example.com minecraft-proxy
```

Render / Fly.io / Railway / VPS などにデプロイし、クライアントの
「Proxy」欄に `wss://your-proxy.example.com` を入力してください。
プロキシは `PROXY_ALLOWED_HOSTS` で接続先を制限できます。
Vercel は WebSocket の最大実行時間が短いため、TCP プロキシ用途には使用していません。

### 環境変数（任意）

| 変数 | 説明 |
| --- | --- |
| `PROXY_ALLOWED_HOSTS` | 接続を許可するホスト。カンマ区切り。`*.example.com` 形式も可。未設定は全パブリックホスト許可 |
| `PROXY_MAX_CONNECTIONS` | 1 インスタンスあたりの最大同時 TCP 接続数（既定 200） |
| `MSA_CLIENT_ID` | Microsoft のパブリッククライアント ID（既定は prismarine-auth と同じ Nintendo Switch タイトル `00000000441cc96b`） |
| `PROXY_ALLOW_PRIVATE` | `1` でプライベート IP への接続を許可。**ローカル開発専用** |

プロキシは SSRF 対策としてプライベート/ループバック/リンクローカル宛の接続を拒否します。

## アーキテクチャ

```
ブラウザ
  ├─ mineflayer / prismarine-viewer（Web Worker で描画）
  ├─ POST <proxy>/api/vm/net/connect   → TCP 接続 + token
  ├─ WS   <proxy>/api/vm/net/socket    → 生 TCP をトンネル
  ├─ POST /api/auth/device  → Microsoft device code
  ├─ POST /api/auth/poll    → トークン交換（Xbox → XSTS → Minecraft）
  ├─ POST /api/auth/refresh → セッション更新
  ├─ POST /api/sessionserver/session/minecraft/join → Mojang join の代理
  └─ シングルプレイ
      ├─ セルフホスト時
      │   ├─ POST /api/singleplayer/start  → サーバー内サーバー起動 (flying-squid)
      │   ├─ POST /api/singleplayer/stop   → サーバー内サーバー停止
      │   └─ GET  /api/singleplayer/status → 起動状態
      └─ API が無い場合は singleplayer-server.js を遅延読み込みし、
         ブラウザ内の仮想 TCP (net.createServer) で同じページ内の
         flying-squid に接続する（ワールドは IndexedDB に保存）
```

- `lib/net.js`: ブラウザ用 `net` 実装（TCP プロキシ + ブラウザ内ループバック）
- `server-lib/proxy.js`: セルフホスト用 TCP ↔ WebSocket プロキシ
- `server-lib/auth.js`: prismarine-auth を使ったサーバー側トークン交換
- `server-lib/singleplayer.js`: セルフホスト時の flying-squid 管理
- `embedded/`: ブラウザ内シングルプレイエンジン（flying-squid + memfs + IndexedDB）
- `api/`: Vercel Functions（auth / session join）

## モバイル操作一覧

| 操作 | 動作 |
| --- | --- |
| 左スティック | 移動（大きく倒すとダッシュ） |
| 画面ドラッグ | 視点 |
| `JUMP` | ジャンプ（押し続け可） |
| `SNEAK` | スニーク切替 |
| `RUN` | ダッシュ切替 |
| `HIT` | クロスヘアの敵を攻撃 / 素振り |
| `USE` | ブロック・エンティティ操作 / アイテム使用 |
| `MINE` | 押している間、クロスヘアのブロックを採掘 |
| `CHAT` | チャット（`SEND` で送信、空欄で閉じる） |
| `BAG` | インベントリ |
| `MENU` | ポーズメニュー |
| ホットバー | タップでスロット選択 |

## 既知の制限

- 既定の TCP プロキシは公開コミュニティプロキシです。停止・混雑・仕様変更の可能性があります。
  安定運用には `proxy-server.js` を自前ホストし、接続画面の「Proxy」に指定してください。
- 接続画面の「Game Version」で 1.16.5〜26.3（1.20.1 など）を選べます。Minecraft 1.19 以降の「署名付きチャット」には未対応です。
- シングルプレイの「World Version」は 1.18.2 / 1.20.1 / 1.21.4 に対応しています（ブラウザ内エンジンはこの3つのデータを同梱）。
- 26.3 用の描画アセット（テクスチャ / ブロックモデル）はまだ上流に無いため、確認できている最新アセット（26.1 / 1.21.4）で代替描画します。26.3 で追加されたブロックは未テクスチャ表示になります。
- 26.3 対応の一部（mineflayer / minecraft-protocol / 26.3 データ）は上流の未マージ PR を固定して使用しています。上流でリリースされたら通常のバージョン指定に戻せます。
- Render distance はブラウザのメモリと GPU に依存します（モバイルでは 2〜4 推奨）。
- 公式アカウントログインは `/api` が動作している必要があります（GitHub Pages 等の静的ホスティング単体では不可）。
- ブラウザ内シングルプレイは、初回プレイ時に約 8MB のエンジン
  （`singleplayer-server.js`）を読み込みます。通常のクライアント起動には含まれません。
- ブラウザ内シングルプレイのワールドは、そのブラウザの IndexedDB に保存されます。
  ブラウザのデータを消去するとワールドも消えます。
- セルフホストしたシングルプレイのワールドはサーバー側（`data/`）に保存されるため、
  複数人が同じインスタンスを使う場合は同じワールドを共有します。

## ライセンス / クレジット

MIT License。ベースとなった
[PrismarineJS/prismarine-web-client](https://github.com/PrismarineJS/prismarine-web-client)
および PrismarineJS の各ライブラリに感謝します。
