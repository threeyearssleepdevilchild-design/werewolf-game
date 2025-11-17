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
    this.nightActions = new Map(); // プレイヤーIDごとの夜行動
    this.nightActionsCompleted = new Set(); // 完了したプレイヤーID
    this.nightResults = new Map(); // プレイヤーIDごとの結果
    this.sealedPlayerId = null; // 警察が封じたプレイヤーID
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
    this.nightActions = new Map();
    this.nightActionsCompleted = new Set();
    this.nightResults = new Map();
    this.sealedPlayerId = null;
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

  // 夜行動を記録
  recordNightAction(playerId, action) {
    this.nightActions.set(playerId, action);
  }

  // プレイヤーが完了したことを記録
  markPlayerCompleted(playerId) {
    this.nightActionsCompleted.add(playerId);
  }

  // 全員が完了したかチェック
  isAllPlayersCompleted() {
    return this.players.every(p => this.nightActionsCompleted.has(p.id));
  }

  // 起床順に従って夜行動を処理
  processNightActions() {
    console.log('夜行動の処理を開始...');

    // 0. 警察の処理 - 能力封じ
    this.players.forEach(player => {
      if (player.role === 'police') {
        const action = this.nightActions.get(player.id);
        if (action && action.type === 'seal' && action.targetId) {
          this.sealedPlayerId = action.targetId;
          console.log(`警察が ${action.targetId} を封じました`);
          
          // 警察に結果を返す
          this.nightResults.set(player.id, {
            type: 'police',
            sealed: true,
            targetId: action.targetId
          });
        } else {
          // 封じなかった
          this.nightResults.set(player.id, {
            type: 'police',
            sealed: false
          });
        }
      }
    });

    // 1. 人狼の処理
    this.players.forEach(player => {
      if (player.role === 'werewolf') {
        // 封じられているかチェック
        if (player.id === this.sealedPlayerId) {
          console.log(`人狼 ${player.id} は封じられています`);
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          // 封じられていない - 通常処理
          const werewolves = this.players.filter(p => p.role === 'werewolf');
          
          if (werewolves.length > 1) {
            // 複数人狼 - 仲間を確認
            const teammates = werewolves
              .filter(w => w.id !== player.id)
              .map(w => ({ id: w.id, name: w.name }));
            
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'multiple',
              werewolves: teammates
            });
          } else {
            // 孤独な人狼 - 中央カード1枚
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'alone',
              centerCard: this.centerCards[0]
            });
          }
        }
      }
    });

    // 3. 探偵の処理
    this.players.forEach(player => {
      if (player.role === 'detective') {
        // 封じられているかチェック
        if (player.id === this.sealedPlayerId) {
          console.log(`探偵 ${player.id} は封じられています`);
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          // 封じられていない - 通常処理
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkPlayer' && action.targetId) {
            // プレイヤーを調査
            const targetPlayer = this.players.find(p => p.id === action.targetId);
            if (targetPlayer) {
              this.nightResults.set(player.id, {
                type: 'detective',
                subtype: 'player',
                playerName: targetPlayer.name,
                role: targetPlayer.role
              });
            }
          } else if (action && action.type === 'checkCenter') {
            // 中央カードを調査
            this.nightResults.set(player.id, {
              type: 'detective',
              subtype: 'center',
              cards: [this.centerCards[0], this.centerCards[1]]
            });
          }
        }
      }
    });

    // 5. 怪盗の処理
    this.players.forEach(player => {
      if (player.role === 'thief') {
        // 封じられているかチェック
        if (player.id === this.sealedPlayerId) {
          console.log(`怪盗 ${player.id} は封じられています`);
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          // 封じられていない - 通常処理
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'swap' && action.targetId) {
            // カード交換を実行
            this.swapRoles(player.id, action.targetId);
            const newRole = this.getPlayerFinalRole(player.id);
            
            this.nightResults.set(player.id, {
              type: 'thief',
              swapped: true,
              newRole: newRole
            });
          } else {
            // 交換しなかった
            this.nightResults.set(player.id, {
              type: 'thief',
              swapped: false
            });
          }
        }
      }
    });

    // 村人・狂人の処理
    this.players.forEach(player => {
      if (player.role === 'villager' || player.role === 'madman') {
        this.nightResults.set(player.id, {
          type: 'wait'
        });
      }
    });

    console.log('夜行動の処理が完了しました');
    return this.nightResults;
  }

  calculateResults() {
    // 得票数カウント
    const voteCounts = {};
    this.players.forEach(p => voteCounts[p.id] = 0);
    
    // ③投票詳細を作成
    const voteDetails = [];
    for (let voterId in this.votes) {
      const targetId = this.votes[voterId];
      if (voteCounts[targetId] !== undefined) {
        voteCounts[targetId]++;
      }
      
      const voter = this.players.find(p => p.id === voterId);
      const target = this.players.find(p => p.id === targetId);
      
      if (voter && target) {
        voteDetails.push({
          voterId: voterId,
          voterName: voter.name,
          targetId: targetId,
          targetName: target.name
        });
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
      hasWerewolf,
      voteDetails  // ③投票詳細を追加
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

  // 夜行動を送信
  socket.on('submitNightAction', ({ roomId, playerId, action }) => {
    const room = rooms.get(roomId);
    if (room) {
      console.log(`プレイヤー ${playerId} が夜行動を送信:`, action);
      room.recordNightAction(playerId, action);
      room.markPlayerCompleted(playerId);
      
      // 全員が完了したかチェック
      if (room.isAllPlayersCompleted()) {
        console.log('全員が夜行動を完了しました。処理を開始します。');
        
        // 起床順に処理
        const results = room.processNightActions();
        
        // 各プレイヤーに個別の結果を送信
        room.players.forEach(player => {
          const result = results.get(player.id);
          if (result) {
            io.to(player.socketId).emit('nightResult', result);
          }
        });
        
        console.log('全員に夜行動の結果を送信しました');
      } else {
        // まだ全員完了していない
        const completedCount = room.nightActionsCompleted.size;
        const totalCount = room.players.length;
        console.log(`夜行動完了: ${completedCount}/${totalCount}`);
        
        // 完了したプレイヤーに待機状態を通知
        socket.emit('waitingForOthers', {
          completedCount,
          totalCount
        });
      }
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

  // ①再試合機能
  socket.on('rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      console.log(`ルーム ${roomId} で再試合を開始`);
      
      // 役職設定はそのまま、ゲームを再スタート
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