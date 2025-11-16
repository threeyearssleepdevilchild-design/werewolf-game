# 🚀 Render クイックデプロイガイド

**5つのステップで世界公開!**

---

## ステップ1️⃣: GitHubにアップロード

```bash
# VS Codeのターミナルで
git init
git add .
git commit -m "初回コミット"
git branch -M main
git remote add origin https://github.com/あなたの名前/werewolf-game.git
git push -u origin main
```

---

## ステップ2️⃣: Renderでサーバーをデプロイ

1. https://render.com/ → Sign up (GitHubで)
2. New + → **Web Service**
3. GitHubリポジトリを選択
4. 設定:
   - Name: `werewolf-server`
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
5. Create Web Service
6. **URLをメモ!** (例: https://werewolf-server.onrender.com)

---

## ステップ3️⃣: クライアントをデプロイ

1. New + → **Static Site**
2. 同じリポジトリを選択
3. 設定:
   - Name: `werewolf-client`
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
4. **環境変数を追加:**
   - Key: `REACT_APP_SOCKET_URL`
   - Value: ステップ2でメモしたサーバーURL
5. Create Static Site

---

## ステップ4️⃣: デプロイ完了を待つ

- サーバー: 1〜3分
- クライアント: 3〜5分

画面に `Your service is live 🎉` と表示されればOK!

---

## ステップ5️⃣: 遊ぶ!

**クライアントのURLにアクセス:**
```
https://werewolf-client.onrender.com
```

**このURLを友達に教えて一緒に遊ぶ!** 🎉

---

## 📝 設定まとめ

### サーバー (Web Service)
```
Name: werewolf-server
Root Directory: server
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### クライアント (Static Site)
```
Name: werewolf-client
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: build
Environment Variables:
  REACT_APP_SOCKET_URL = https://werewolf-server.onrender.com
```

---

## ⚠️ よくあるミス

❌ **Root Directory を設定し忘れる**
→ サーバーは `server`、クライアントは `client` を指定!

❌ **環境変数を設定し忘れる**
→ クライアントに `REACT_APP_SOCKET_URL` を必ず設定!

❌ **サーバーのURLを間違える**
→ https:// から始まる完全なURLを指定!

---

**詳しくは RENDER_DEPLOY.md を見てください!**
