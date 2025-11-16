const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // すべてのオリジンを許可 (スマホ対応)
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// ゲームルーム管理
const rooms = new Map();

// ゲームルームクラス
class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.host = null;
    this.gameState = 'lobby'; // lobby, night, discussion, voting, result
    this.roles = {
      werewolf: 2,
      villager: 2,
      detective: 1,
      thief: 1,
      police: 1,
      madman: 0
    };
    this.centerCards = [];
    this.nightActions = {};
    this.votes = {};
  }

  addPlayer(playerId, playerName, socketId) {
    const player = {
      id: playerId,
      name: playerName,
      socketId: socketId,
      role: null,
      finalRole: null,
      isHost: this.players.length === 0,
      isReady: false
    };
    
    this.players.push(player);
    
    if (this.players.length === 1) {
      this.host = playerId;
    }
    
    return player;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      
      // ホストが退出した場合、次の人をホストにする
      if (this.host === playerId && this.players.length > 0) {
        this.host = this.players[0].id;
        this.players[0].isHost = true;
      }
    }
  }

  updateRoles(roles) {
    this.roles = { ...roles };
  }

  startGame() {
    // カードデッキ作成
    const deck = [];
    for (let role in this.roles) {
      for (let i = 0; i < this.roles[role]; i++) {
        deck.push(role);
      }
    }

    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // プレイヤーに配布
    this.players.forEach((player, index) => {
      player.role = deck[index];
      player.finalRole = deck[index];
    });

    // 中央カード設定
    this.centerCards = deck.slice(this.players.length);

    // 初期化
    this.nightActions = {};
    this.votes = {};
    this.gameState = 'night';

    return true;
  }

  getPlayerRole(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.role : null;
  }

  getPlayerFinalRole(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.finalRole : null;
  }

  setNightAction(action, data) {
    this.nightActions[action] = data;
  }

  swapRoles(playerId1, playerId2) {
    const player1 = this.players.find(p => p.id === playerId1);
    const player2 = this.players.find(p => p.id === playerId2);
    
    if (player1 && player2) {
      const temp = player1.finalRole;
      player1.finalRole = player2.finalRole;
      player2.finalRole = temp;
      return true;
    }
    return false;
  }

  addVote(playerId, targetId) {
    this.votes[playerId] = targetId;
  }

  calculateResults() {
    // 得票数カウント
    const voteCounts = {};
    this.players.forEach(p => voteCounts[p.id] = 0);
    
    for (let voterId in this.votes) {
      const targetId = this.votes[voterId];
      if (voteCounts[targetId] !== undefined) {
        voteCounts[targetId]++;
      }
    }

    // 最多得票者を見つける
    const maxVotes = Math.max(...Object.values(voteCounts));
    const executed = this.players.filter(p => 
      voteCounts[p.id] === maxVotes && maxVotes > 0
    );

    // 勝利判定
    const werewolvesExecuted = executed.filter(p => p.finalRole === 'werewolf').length;
    const hasWerewolf = this.players.some(p => p.finalRole === 'werewolf');

    let winners = [];
    let resultType = '';

    if (!hasWerewolf && executed.length === 0) {
      // 平和村
      resultType = 'peace';
      winners = this.players.filter(p => p.finalRole !== 'madman');
    } else if (werewolvesExecuted > 0) {
      // 村人陣営勝利
      resultType = 'villager_win';
      winners = this.players.filter(p => 
        p.finalRole !== 'werewolf' && p.finalRole !== 'madman'
      );
    } else if (hasWerewolf) {
      // 人狼陣営勝利
      resultType = 'werewolf_win';
      winners = this.players.filter(p => 
        p.finalRole === 'werewolf' || p.finalRole === 'madman'
      );
    }

    return {
      voteCounts,
      executed,
      winners,
      resultType,
      hasWerewolf
    };
  }

  getRoomData() {
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady
      })),
      host: this.host,
      gameState: this.gameState,
      roles: this.roles
    };
  }
}

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('新しいクライアント接続:', socket.id);

  // ルーム作成または参加
  socket.on('joinRoom', ({ roomId, playerId, playerName }) => {
    console.log(`プレイヤー ${playerName} がルーム ${roomId} に参加`);

    // ルームが存在しない場合は作成
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new GameRoom(roomId));
    }

    const room = rooms.get(roomId);
    
    // すでに参加しているか確認
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (!existingPlayer) {
      room.addPlayer(playerId, playerName, socket.id);
    } else {
      // Socket IDを更新（再接続の場合）
      existingPlayer.socketId = socket.id;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;

    // ルーム情報を全員に送信
    io.to(roomId).emit('roomUpdate', room.getRoomData());
    
    // 参加成功を送信者に通知
    socket.emit('joinSuccess', {
      playerId: playerId,
      isHost: room.host === playerId,
      roomData: room.getRoomData()
    });
  });

  // 役職設定更新
  socket.on('updateRoles', ({ roomId, roles }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.updateRoles(roles);
      io.to(roomId).emit('rolesUpdated', roles);
    }
  });

  // ゲーム開始
  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.data.playerId) {
      room.startGame();
      
      // 各プレイヤーに個別に役職を送信
      room.players.forEach(player => {
        io.to(player.socketId).emit('gameStarted', {
          role: player.role,
          gameState: room.gameState
        });
      });

      // 全体の状態更新
      io.to(roomId).emit('phaseChange', { phase: 'night' });
    }
  });

  // 警察の行動
  socket.on('policeAction', ({ roomId, targetId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.setNightAction('policeTarget', targetId);
      
      // 封じられたプレイヤーに通知
      const targetPlayer = room.players.find(p => p.id === targetId);
      if (targetPlayer) {
        io.to(targetPlayer.socketId).emit('sealed');
      }
    }
  });

  // 人狼情報取得
  socket.on('getWerewolfInfo', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const werewolves = room.players.filter(p => p.role === 'werewolf');
      const isSealed = room.nightActions.policeTarget === playerId;
      
      let info = {};
      
      if (!isSealed) {
        if (werewolves.length > 1) {
          // 複数の人狼
          info = {
            type: 'multiple',
            werewolves: werewolves
              .filter(w => w.id !== playerId)
              .map(w => ({ id: w.id, name: w.name }))
          };
        } else {
          // 孤独な人狼 - 中央カード1枚
          info = {
            type: 'alone',
            centerCard: room.centerCards[0]
          };
        }
      } else {
        info = { type: 'sealed' };
      }
      
      socket.emit('werewolfInfo', info);
    }
  });

  // 探偵の行動（プレイヤー調査）
  socket.on('detectiveCheckPlayer', ({ roomId, targetId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const targetRole = room.getPlayerRole(targetId);
      const targetPlayer = room.players.find(p => p.id === targetId);
      
      socket.emit('detectiveResult', {
        type: 'player',
        playerName: targetPlayer.name,
        role: targetRole
      });
    }
  });

  // 探偵の行動（中央カード調査）
  socket.on('detectiveCheckCenter', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('detectiveResult', {
        type: 'center',
        cards: [room.centerCards[0], room.centerCards[1]]
      });
    }
  });

  // 怪盗の行動
  socket.on('thiefAction', ({ roomId, playerId, targetId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.swapRoles(playerId, targetId);
      const newRole = room.getPlayerFinalRole(playerId);
      
      socket.emit('thiefResult', { newRole });
    }
  });

  // 議論フェーズへ移行
  socket.on('startDiscussion', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.gameState = 'discussion';
      
      // 各プレイヤーに最終役職を送信
      room.players.forEach(player => {
        io.to(player.socketId).emit('discussionStarted', {
          finalRole: player.finalRole
        });
      });
      
      io.to(roomId).emit('phaseChange', { phase: 'discussion' });
    }
  });

  // 投票フェーズへ移行
  socket.on('startVoting', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.gameState = 'voting';
      io.to(roomId).emit('phaseChange', { phase: 'voting' });
    }
  });

  // 投票
  socket.on('vote', ({ roomId, playerId, targetId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.addVote(playerId, targetId);
      
      // 全員が投票したかチェック
      const allVoted = room.players.every(p => room.votes[p.id] !== undefined);
      
      if (allVoted) {
        // 結果計算
        const results = room.calculateResults();
        room.gameState = 'result';
        
        // 結果を全員に送信
        io.to(roomId).emit('gameResults', {
          ...results,
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            initialRole: p.role,
            finalRole: p.finalRole
          }))
        });
      }
    }
  });

  // プレイヤー退出
  socket.on('disconnect', () => {
    console.log('クライアント切断:', socket.id);
    
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // 必要に応じてプレイヤーを削除（または再接続待ち状態にする）
      // room.removePlayer(playerId);
      
      // ルームが空になったら削除
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('roomUpdate', room.getRoomData());
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 ワンナイト人狼サーバー起動: http://localhost:${PORT}`);
  console.log(`📱 スマホからアクセス: http://あなたのIPアドレス:${PORT}`);
});
