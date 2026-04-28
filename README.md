# Search 大村市消防団 - 行方不明者捜索支援アプリ

このアプリは、消防団員が捜索したルートを地図上で塗りつぶし、未捜索エリアを可視化するためのプロトタイプです。

## 主な機能
- **GPSトラッキング**: 1秒おきの座標記録（オフライン対応）。
- **バッチ同期**: 10分おき、または捜索終了時にまとめてFirebaseへアップロード。
- **捜索済みエリアの可視化**: Turf.jsを使用して軌跡から半径15mのバッファポリゴンを自動生成。
- **疑似ライブ配信**: 3秒おきの静止画送信による低帯域ライブ配信機能。

## 技術スタック
- **Frontend**: React (Vite), Tailwind CSS, MapLibre GL JS, Turf.js
- **Backend**: Firebase (Firestore, Auth)
- **Hosting**: Cloudflare Pages

## セットアップ手順

### 1. Firebaseの設定
1. [Firebase Console](https://console.firebase.google.com/) で新しいプロジェクトを作成します。
2. **Firestore Database** を有効にします。
3. **Authentication** で「匿名認証」または「メール/パスワード認証」を有効にします。
4. プロジェクト設定からウェブアプリを追加し、SDK設定（`apiKey`等）をコピーします。
5. `src/lib/firebase.js` の `firebaseConfig` を書き換えます。

#### Firestore セキュリティルール設定
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // 開発用。本番では要制限
    }
  }
}
```

### 2. GitHubへのプッシュ
1. GitHubで新しいリポジトリを作成します。
2. ローカルで以下のコマンドを実行します：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin [YOUR_REPO_URL]
git push -u origin main
```

### 3. Cloudflare Pagesでのデプロイ
1. Cloudflareダッシュボードにログインし、「Workers & Pages」->「Create application」->「Pages」を選択。
2. 「Connect to Git」をクリックし、上記のリポジトリを選択。
3. ビルド設定を以下のように指定：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 「Save and Deploy」をクリック。

## 開発用コマンド
```bash
npm install
npm run dev
```
