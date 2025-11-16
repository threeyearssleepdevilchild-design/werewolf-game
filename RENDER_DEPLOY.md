# 🌟 Render デプロイ完全ガイド

このガイドでは、**遠く離れた友達とオンラインで遊べる**ワンナイト人狼サーバーを、Renderを使って無料で公開する方法を説明します!

**所要時間:** 30〜40分  
**料金:** 完全無料!  
**結果:** 24時間稼働、URLが固定、PCを切っても動く!

---

## 📋 **必要なもの**

- ✅ GitHubアカウント (無料)
- ✅ Renderアカウント (無料)
- ✅ メールアドレス
- ✅ このプロジェクト

---

## 🎯 **ステップ1: GitHubアカウント作成**

### **1-1: GitHubサインアップ**

1. **GitHubにアクセス**
   - https://github.com/ を開く

2. **「Sign up」をクリック**
   - 右上の緑色のボタン

3. **アカウント情報を入力**
   - **Email address**: あなたのメールアドレス
   - **Password**: 強力なパスワード (8文字以上、大文字小文字数字含む)
   - **Username**: ユーザー名 (好きな名前でOK)
   - 「Create account」をクリック

4. **メール認証**
   - メールに届いた認証コードを入力
   - または、メール内のリンクをクリック

5. **完了!**
   - GitHubのホーム画面が表示されます

---

## 📦 **ステップ2: プロジェクトをGitHubにアップロード**

### **2-1: 新しいリポジトリを作成**

1. **GitHubのホーム画面で**
   - 左側の「New」ボタン (緑色) をクリック
   - または、右上の「+」→「New repository」

2. **リポジトリ情報を入力**
   - **Repository name**: `werewolf-game` (好きな名前でOK)
   - **Description**: `ワンナイト人狼オリジナル版`
   - **Public** を選択 (無料プランの場合)
   - ✅ **Add a README file** のチェックは**外す**
   - 「Create repository」をクリック

3. **リポジトリURL をメモ**
   - 表示されるURL (例: `https://github.com/あなたの名前/werewolf-game.git`)
   - このURLを後で使います

---

### **2-2: Gitをインストール (まだの場合)**

**Windowsの場合:**
1. https://git-scm.com/download/win にアクセス
2. インストーラーをダウンロード
3. すべてデフォルト設定でインストール

**Macの場合:**
- 既にインストール済みの可能性が高い
- ターミナルで `git --version` と入力して確認

---

### **2-3: VS Codeでプロジェクトをアップロード**

#### **方法A: VS Code内蔵のGit機能を使う (簡単!)**

1. **VS Codeで werewolf-project を開く**

2. **ターミナルを開く**
   - Ctrl + ` (バッククォート)

3. **Gitの初期設定 (初回のみ)**
   ```bash
   git config --global user.name "あなたの名前"
   git config --global user.email "あなたのメールアドレス"
   ```

4. **Gitリポジトリを初期化**
   ```bash
   git init
   ```

5. **すべてのファイルを追加**
   ```bash
   git add .
   ```

6. **最初のコミット**
   ```bash
   git commit -m "初回コミット: ワンナイト人狼プロジェクト"
   ```

7. **GitHubリポジトリと連携**
   ```bash
   git branch -M main
   git remote add origin https://github.com/あなたの名前/werewolf-game.git
   ```
   ↑ URLを自分のリポジトリのURLに置き換える

8. **GitHubにプッシュ**
   ```bash
   git push -u origin main
   ```

9. **GitHubの認証**
   - ユーザー名とパスワードを聞かれます
   - パスワードの代わりに **Personal Access Token** が必要です

---

### **2-4: Personal Access Token の作成**

GitHubのパスワードの代わりに使用するトークンです。

1. **GitHubのSettings**
   - 右上のプロフィールアイコン → Settings

2. **Developer settings**
   - 左側メニューの一番下
   - 「Developer settings」をクリック

3. **Personal access tokens**
   - 「Personal access tokens」→「Tokens (classic)」
   - 「Generate new token」→「Generate new token (classic)」

4. **トークンの設定**
   - **Note**: `werewolf-game-deploy`
   - **Expiration**: `No expiration` (または好きな期限)
   - **Select scopes**: 
     - ✅ **repo** (すべてにチェック)
   - 「Generate token」をクリック

5. **トークンをコピー**
   - 表示された長い文字列をコピー
   - ⚠️ **このページを閉じると二度と表示されません!**
   - メモ帳などに保存しておく

6. **git push の時に使用**
   - Username: あなたのGitHubユーザー名
   - Password: **コピーしたトークン** (パスワードではない!)

---

### **2-5: アップロード完了を確認**

1. **GitHubのリポジトリページを開く**
   - https://github.com/あなたの名前/werewolf-game

2. **ファイルが表示されているか確認**
   - client フォルダ
   - server フォルダ
   - README.md など

**表示されていればOK!** ✅

---

## 🚀 **ステップ3: Renderアカウント作成**

### **3-1: Renderサインアップ**

1. **Renderにアクセス**
   - https://render.com/

2. **「Get Started」をクリック**
   - または右上の「Sign Up」

3. **GitHubでサインアップ (推奨)**
   - 「GitHub」ボタンをクリック
   - GitHubのアカウントで認証
   - これでGitHubと自動連携されます

4. **完了!**
   - Renderのダッシュボードが表示されます

---

## 🖥️ **ステップ4: サーバー(バックエンド)をデプロイ**

### **4-1: 新しいWeb Serviceを作成**

1. **Renderダッシュボードで**
   - 「New +」ボタンをクリック (右上)
   - 「Web Service」を選択

2. **GitHubリポジトリを選択**
   - 「Connect a repository」の下
   - 自分のGitHubアカウントが表示される
   - 「werewolf-game」を探す
   - 「Connect」をクリック

3. **サービス情報を入力**

   **Name**: `werewolf-server` (好きな名前でOK)
   
   **Region**: `Singapore` (日本から一番近い)
   
   **Branch**: `main`
   
   **Root Directory**: `server` ← **重要!**
   
   **Runtime**: `Node`
   
   **Build Command**: `npm install`
   
   **Start Command**: `npm start`
   
   **Instance Type**: `Free` ← **無料プラン**

4. **環境変数を設定**
   - 「Advanced」ボタンをクリック
   - 「Add Environment Variable」をクリック
   - 今は設定不要 (後で追加可能)

5. **「Create Web Service」をクリック**

6. **デプロイ開始!**
   - 自動的にビルドが始まります
   - 画面にログが流れます (1〜3分かかります)

7. **デプロイ完了を確認**
   - ログの最後に以下が表示されればOK:
   ```
   ==> Your service is live 🎉
   ```

8. **サーバーURLをメモ**
   - 画面上部に表示されるURL
   - 例: `https://werewolf-server.onrender.com`
   - **このURLを後で使います!**

---

## 🌐 **ステップ5: クライアント(フロントエンド)をデプロイ**

### **5-1: 新しいStatic Siteを作成**

1. **Renderダッシュボードで**
   - 「New +」ボタン → 「Static Site」

2. **GitHubリポジトリを選択**
   - 同じ「werewolf-game」を選択
   - 「Connect」をクリック

3. **サービス情報を入力**

   **Name**: `werewolf-client` (好きな名前でOK)
   
   **Branch**: `main`
   
   **Root Directory**: `client` ← **重要!**
   
   **Build Command**: `npm install && npm run build`
   
   **Publish Directory**: `build`

4. **環境変数を設定 (重要!)**
   - 「Advanced」をクリック
   - 「Add Environment Variable」をクリック
   
   **Key**: `REACT_APP_SOCKET_URL`
   
   **Value**: `https://werewolf-server.onrender.com` 
   ↑ **ステップ4-8でメモしたサーバーURLを入力!**

5. **「Create Static Site」をクリック**

6. **デプロイ開始!**
   - ビルドが始まります (3〜5分かかります)

7. **デプロイ完了を確認**
   - ログの最後に以下が表示されればOK:
   ```
   ==> Your site is live 🎉
   ```

8. **クライアントURLを確認**
   - 画面上部に表示されるURL
   - 例: `https://werewolf-client.onrender.com`
   - **これがゲームのURL!**

---

## 🎉 **ステップ6: 動作確認**

### **6-1: ゲームにアクセス**

1. **ブラウザでクライアントURLを開く**
   - 例: `https://werewolf-client.onrender.com`

2. **ゲーム画面が表示される!**
   - 名前入力画面が表示されればOK!

3. **名前を入力してルーム作成**
   - 名前を入力
   - 「新しいルームを作成」
   - ルームIDが表示される

### **6-2: 友達を招待**

**友達に教えるURL:**
```
https://werewolf-client.onrender.com
```

**友達がすること:**
1. 上記URLにアクセス
2. 名前を入力
3. あなたから教えてもらったルームIDを入力
4. 「ルームに参加」

### **6-3: ゲームを遊ぶ!**

1. ホストが役職を設定
2. ゲーム開始
3. **完成!** 🎉

---

## 🔧 **トラブルシューティング**

### 問題1: サーバーのデプロイが失敗する

**症状:** ビルドログにエラーが表示される

**解決策:**
1. **Root Directory** が `server` になっているか確認
2. **Build Command** が `npm install` になっているか確認
3. **Start Command** が `npm start` になっているか確認

### 問題2: クライアントのデプロイが失敗する

**症状:** ビルドログにエラーが表示される

**解決策:**
1. **Root Directory** が `client` になっているか確認
2. **Build Command** が `npm install && npm run build` になっているか確認
3. **Publish Directory** が `build` になっているか確認

### 問題3: ゲームに接続できない

**症状:** 「サーバーに接続できません」というエラー

**解決策:**
1. **環境変数を確認**
   - Renderのクライアント設定ページ
   - 「Environment」タブ
   - `REACT_APP_SOCKET_URL` が正しいサーバーURLか確認

2. **サーバーが起動しているか確認**
   - Renderのサーバー設定ページ
   - 「Logs」タブで確認

3. **再デプロイ**
   - クライアント設定ページで「Manual Deploy」→「Clear build cache & deploy」

### 問題4: 15分で接続が切れる

**症状:** しばらく遊んでいないと接続が切れる

**原因:** Renderの無料プランは、15分アクセスがないとスリープします

**解決策:**
- 無料プランの仕様です
- 再度アクセスすると30秒〜1分で起動します
- 有料プラン($7/月)なら常時起動できます

---

## 🔄 **コードを更新したら**

プロジェクトを修正した場合:

1. **VS Codeのターミナルで**
   ```bash
   git add .
   git commit -m "更新内容の説明"
   git push
   ```

2. **Renderで自動デプロイ**
   - GitHubにプッシュすると自動的にデプロイされます!
   - 何もする必要はありません

---

## 💰 **料金について**

### **無料プラン**
- ✅ 完全無料
- ✅ 月750時間まで稼働 (ほぼ制限なし)
- ⏰ 15分アクセスがないとスリープ
- 🌐 帯域幅: 100GB/月

### **有料プラン (Starter: $7/月)**
- ✅ 常時起動 (スリープなし)
- ✅ より高速
- ✅ カスタムドメイン

**初心者は無料プランで十分です!**

---

## 📊 **完成後のURL**

**プレイヤー用URL (友達に教える):**
```
https://werewolf-client.onrender.com
```

**管理画面:**
- Render Dashboard: https://dashboard.render.com/
- GitHub Repository: https://github.com/あなたの名前/werewolf-game

---

## 🎯 **次のステップ**

1. **友達を招待して遊ぶ!** 🎮
2. **Phase 2の役職を追加** (審神者、墓守、吊人)
3. **Phase 3の役職を追加** (詐欺師、魔女っ子)
4. **デザインをカスタマイズ**

---

## ❓ **よくある質問**

### Q: URLを短くできますか?

A: はい! Renderの設定で Custom Domain を使えます。
または、bit.ly などの短縮URLサービスを使うこともできます。

### Q: パスワード保護できますか?

A: 現在の実装ではできませんが、ルームID機能で限定公開になっています。

### Q: データは保存されますか?

A: 現在はメモリ上のみです。サーバーが再起動すると消えます。
データベースを追加すれば永続化できます。

### Q: 何人まで遊べますか?

A: 無料プランでも100人程度は同時接続できます。
ワンナイト人狼は8人までなので十分です!

---

## 🎉 **完成!**

これで**世界中の友達**と遊べるワンナイト人狼サーバーが完成しました!

**友達に教えるURL:**
```
https://your-app-name.onrender.com
```

楽しいゲームを! 🎮✨

---

**作成者:** ねまこ & Claude  
**バージョン:** Phase 1 - Render対応版  
**更新日:** 2024
