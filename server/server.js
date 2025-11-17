const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

const roleTeams = {
  werewolf: 'werewolf',
  villager: 'villager',
  fortune_teller: 'villager',
  thief: 'villager',
  police: 'villager',
  madman: 'werewolf',
  medium: 'villager',
  fool: 'villager',
  gravekeeper: 'villager',
  witch: 'villager',
  hanged: 'hanged'
};

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.host = null;
    this.gameState = 'lobby';
    this.roles = {
      werewolf: 2,
      villager: 2,
      fortune_teller: 1,
      thief: 1,
      police: 1,
      madman: 0,
      medium: 0,
      fool: 0,
      gravekeeper: 0,
      witch: 0,
      hanged: 0
    };
    this.centerCards = [];
    this.nightActions = new Map();
    this.nightActionsCompleted = new Set();
    this.nightResults = new Map();
    this.sealedPlayerId = null;
    this.votes = {};
    this.foolDisguiseRole = null;
    this.foolDisplayRole = null; // ばかに見せる役職
  }

  addPlayer(playerId, playerName, socketId) {
    const player = {
      id: playerId,
      name: playerName,
      socketId: socketId,
      role: null,
      finalRole: null,
      displayRole: null, // ばか用の表示役職
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
    const deck = [];
    for (let role in this.roles) {
      for (let i = 0; i < this.roles[role]; i++) {
        deck.push(role);
      }
    }

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.players.forEach((player, index) => {
      player.role = deck[index];
      player.finalRole = deck[index];
      player.displayRole = deck[index]; // 初期値は実際の役職
    });

    this.centerCards = deck.slice(this.players.length, this.players.length + 2);

    // ばかの演じる役職を決定
    const foolPlayer = this.players.find(p => p.role === 'fool');
    if (foolPlayer) {
      const villagerRoles = ['fortune_teller', 'thief', 'police', 'gravekeeper', 'witch', 'medium'];
      this.foolDisplayRole = villagerRoles[Math.floor(Math.random() * villagerRoles.length)];
      foolPlayer.displayRole = this.foolDisplayRole;
      console.log(`ばかは ${this.foolDisplayRole} を演じます`);
    }

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

  recordNightAction(playerId, action) {
    this.nightActions.set(playerId, action);
  }

  markPlayerCompleted(playerId) {
    this.nightActionsCompleted.add(playerId);
  }

  isAllPlayersCompleted() {
    return this.players.every(p => this.nightActionsCompleted.has(p.id));
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

  swapWithCenter(playerId, centerIndex) {
    const player = this.players.find(p => p.id === playerId);
    
    if (player && centerIndex >= 0 && centerIndex < this.centerCards.length) {
      const temp = player.finalRole;
      player.finalRole = this.centerCards[centerIndex];
      this.centerCards[centerIndex] = temp;
      return true;
    }
    return false;
  }

  generateFoolInfo(disguiseRole) {
    const allRoles = ['werewolf', 'villager', 'fortune_teller', 'thief', 'police', 'madman', 'medium', 'fool', 'gravekeeper', 'witch', 'hanged'];
    
    if (disguiseRole === 'fortune_teller' || disguiseRole === 'medium' || disguiseRole === 'witch') {
      const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      
      if (disguiseRole === 'fortune_teller') {
        return {
          type: 'fortune_teller',
          subtype: 'player',
          playerName: randomPlayer.name,
          role: randomRole
        };
      } else if (disguiseRole === 'medium') {
        const randomTeam = Math.random() < 0.5 ? '村人陣営' : '人狼陣営';
        return {
          type: 'medium',
          playerName: randomPlayer.name,
          team: randomTeam
        };
      } else if (disguiseRole === 'witch') {
        return {
          type: 'witch',
          playerName: randomPlayer.name,
          role: randomRole
        };
      }
    } else if (disguiseRole === 'thief') {
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      return {
        type: 'thief',
        swapped: true,
        newRole: randomRole
      };
    } else if (disguiseRole === 'police') {
      const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
      return {
        type: 'police',
        sealed: true,
        targetId: randomPlayer.id
      };
    } else if (disguiseRole === 'gravekeeper') {
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      return {
        type: 'gravekeeper',
        viewed: true,
        card: randomRole,
        swapped: false
      };
    }
    
    return { type: 'wait' };
  }

  processNightActions() {
    console.log('夜行動の処理を開始...');

    // 0. 警察の処理
    this.players.forEach(player => {
      if (player.role === 'police') {
        const action = this.nightActions.get(player.id);
        if (action && action.type === 'seal' && action.targetId) {
          this.sealedPlayerId = action.targetId;
          console.log(`警察が ${action.targetId} を封じました`);
          
          this.nightResults.set(player.id, {
            type: 'police',
            sealed: true,
            targetId: action.targetId
          });
        } else {
          this.nightResults.set(player.id, {
            type: 'police',
            sealed: false
          });
        }
      }
    });

    // 1. 人狼の処理（修正: 中央カードは見ない）
    this.players.forEach(player => {
      if (player.role === 'werewolf') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const werewolves = this.players.filter(p => p.role === 'werewolf');
          
          if (werewolves.length > 1) {
            const teammates = werewolves
              .filter(w => w.id !== player.id)
              .map(w => ({ id: w.id, name: w.name }));
            
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'multiple',
              werewolves: teammates
            });
          } else {
            // 孤独な人狼 - 中央カードは見ない
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'alone'
            });
          }
        }
      }
    });

    // 2. 審神者の処理
    this.players.forEach(player => {
      if (player.role === 'medium') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkTeam' && action.targetId) {
            const targetPlayer = this.players.find(p => p.id === action.targetId);
            if (targetPlayer) {
              const team = roleTeams[targetPlayer.role];
              let teamName = '村人陣営';
              if (team === 'werewolf') teamName = '人狼陣営';
              if (team === 'hanged') teamName = '第三陣営';
              
              this.nightResults.set(player.id, {
                type: 'medium',
                playerName: targetPlayer.name,
                team: teamName
              });
            }
          }
        }
      }
    });

    // 3. 占い師の処理（修正: 中央の狂人は村人と表示）
    this.players.forEach(player => {
      if (player.role === 'fortune_teller') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkPlayer' && action.targetId) {
            const targetPlayer = this.players.find(p => p.id === action.targetId);
            if (targetPlayer) {
              this.nightResults.set(player.id, {
                type: 'fortune_teller',
                subtype: 'player',
                playerName: targetPlayer.name,
                role: targetPlayer.role
              });
            }
          } else if (action && action.type === 'checkCenter') {
            // 中央カードの狂人は村人と表示
            const cards = this.centerCards.map(card => 
              card === 'madman' ? 'villager' : card
            );
            
            this.nightResults.set(player.id, {
              type: 'fortune_teller',
              subtype: 'center',
              cards: cards
            });
          }
        }
      }
    });

    // 4. ばかの処理
    this.players.forEach(player => {
      if (player.role === 'fool') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const foolInfo = this.generateFoolInfo(this.foolDisplayRole);
          this.nightResults.set(player.id, foolInfo);
        }
      }
    });

    // 5. 怪盗の処理（修正: 盗まれた側に通知なし）
    this.players.forEach(player => {
      if (player.role === 'thief') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'swap' && action.targetId) {
            this.swapRoles(player.id, action.targetId);
            const newRole = this.getPlayerFinalRole(player.id);
            
            this.nightResults.set(player.id, {
              type: 'thief',
              swapped: true,
              newRole: newRole
            });
            // 盗まれた側には通知なし（削除）
          } else {
            this.nightResults.set(player.id, {
              type: 'thief',
              swapped: false
            });
          }
        }
      }
    });

    // 6. 墓守の処理
    this.players.forEach(player => {
      if (player.role === 'gravekeeper') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'viewCenter' && action.centerIndex !== undefined) {
            const card = this.centerCards[action.centerIndex];
            
            if (action.shouldSwap) {
              this.swapWithCenter(player.id, action.centerIndex);
              const newRole = this.getPlayerFinalRole(player.id);
              
              this.nightResults.set(player.id, {
                type: 'gravekeeper',
                viewed: true,
                card: card,
                swapped: true,
                newRole: newRole
              });
            } else {
              this.nightResults.set(player.id, {
                type: 'gravekeeper',
                viewed: true,
                card: card,
                swapped: false
              });
            }
          } else {
            this.nightResults.set(player.id, {
              type: 'gravekeeper',
              viewed: false
            });
          }
        }
      }
    });

    // 7. 魔女っ子の処理
    this.players.forEach(player => {
      if (player.role === 'witch') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkOriginal' && action.targetId) {
            const targetPlayer = this.players.find(p => p.id === action.targetId);
            if (targetPlayer) {
              this.nightResults.set(player.id, {
                type: 'witch',
                playerName: targetPlayer.name,
                role: targetPlayer.role
              });
            }
          }
        }
      }
    });

    // 能力なし役職の処理
    this.players.forEach(player => {
      if (player.role === 'villager' || player.role === 'madman' || player.role === 'hanged') {
        this.nightResults.set(player.id, {
          type: 'wait'
        });
      }
    });

    console.log('夜行動の処理が完了しました');
    return this.nightResults;
  }

  addVote(playerId, targetId) {
    this.votes[playerId] = targetId;
  }

  calculateResults() {
    const voteCounts = {};
    this.players.forEach(p => voteCounts[p.id] = 0);
    voteCounts['peace'] = 0; // 平和村の票数
    
    const voteDetails = [];
    for (let voterId in this.votes) {
      const targetId = this.votes[voterId];
      
      if (targetId === 'peace') {
        voteCounts['peace']++;
      } else if (voteCounts[targetId] !== undefined) {
        voteCounts[targetId]++;
      }
      
      const voter = this.players.find(p => p.id === voterId);
      const target = targetId === 'peace' ? null : this.players.find(p => p.id === targetId);
      
      if (voter) {
        voteDetails.push({
          voterId: voterId,
          voterName: voter.name,
          targetId: targetId,
          targetName: targetId === 'peace' ? '平和村' : (target ? target.name : '不明')
        });
      }
    }

    const hasWerewolf = this.players.some(p => p.finalRole === 'werewolf');

    // 人狼がいない場合
    if (!hasWerewolf) {
      const totalVotes = Object.keys(this.votes).length;
      const peaceVotes = voteCounts['peace'];
      
      if (peaceVotes === totalVotes) {
        // 全員が平和村に投票
        return {
          voteCounts,
          executed: [],
          winners: this.players.filter(p => p.finalRole !== 'hanged'),
          resultType: 'peace',
          hasWerewolf: false,
          voteDetails
        };
      } else {
        // 一部が平和村、一部がプレイヤー
        // プレイヤーへの投票のみで最多得票者を決定
        const playerVoteCounts = {};
        this.players.forEach(p => playerVoteCounts[p.id] = 0);
        
        for (let voterId in this.votes) {
          const targetId = this.votes[voterId];
          if (targetId !== 'peace' && playerVoteCounts[targetId] !== undefined) {
            playerVoteCounts[targetId]++;
          }
        }
        
        const maxVotes = Math.max(...Object.values(playerVoteCounts));
        const executed = this.players.filter(p => 
          playerVoteCounts[p.id] === maxVotes && maxVotes > 0
        );
        
        // 処刑された人のみ勝利
        return {
          voteCounts,
          executed,
          winners: executed,
          resultType: 'peace_executed',
          hasWerewolf: false,
          voteDetails
        };
      }
    }

    // 人狼がいる場合（平和村票は無視）
    const playerVoteCounts = {};
    this.players.forEach(p => playerVoteCounts[p.id] = 0);
    
    for (let voterId in this.votes) {
      const targetId = this.votes[voterId];
      if (targetId !== 'peace' && playerVoteCounts[targetId] !== undefined) {
        playerVoteCounts[targetId]++;
      }
    }

    const maxVotes = Math.max(...Object.values(playerVoteCounts));
    const executed = this.players.filter(p => 
      playerVoteCounts[p.id] === maxVotes && maxVotes > 0
    );

    // 吊人判定
    const hangedExecuted = executed.some(p => p.finalRole === 'hanged');
    if (hangedExecuted) {
      const hangedWinner = executed.find(p => p.finalRole === 'hanged');
      return {
        voteCounts: playerVoteCounts,
        executed,
        winners: [hangedWinner],
        resultType: 'hanged_win',
        hasWerewolf: true,
        voteDetails
      };
    }

    const werewolvesExecuted = executed.filter(p => p.finalRole === 'werewolf').length;

    let winners = [];
    let resultType = '';

    if (werewolvesExecuted > 0) {
      resultType = 'villager_win';
      winners = this.players.filter(p => 
        roleTeams[p.finalRole] === 'villager'
      );
    } else {
      resultType = 'werewolf_win';
      winners = this.players.filter(p => 
        roleTeams[p.finalRole] === 'werewolf'
      );
    }

    return {
      voteCounts: playerVoteCounts,
      executed,
      winners,
      resultType,
      hasWerewolf: true,
      voteDetails
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

io.on('connection', (socket) => {
  console.log('新しいクライアント接続:', socket.id);

  socket.on('joinRoom', ({ roomId, playerId, playerName }) => {
    console.log(`プレイヤー ${playerName} がルーム ${roomId} に参加`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new GameRoom(roomId));
    }

    const room = rooms.get(roomId);
    
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (!existingPlayer) {
      room.addPlayer(playerId, playerName, socket.id);
    } else {
      existingPlayer.socketId = socket.id;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;

    io.to(roomId).emit('roomUpdate', room.getRoomData());
    
    socket.emit('joinSuccess', {
      playerId: playerId,
      isHost: room.host === playerId,
      roomData: room.getRoomData()
    });
  });

  socket.on('updateRoles', ({ roomId, roles }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.updateRoles(roles);
      io.to(roomId).emit('rolesUpdated', roles);
    }
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.data.playerId) {
      room.startGame();
      
      room.players.forEach(player => {
        io.to(player.socketId).emit('gameStarted', {
          role: player.displayRole, // ばかには偽装役職を送信
          gameState: room.gameState,
          roles: room.roles // 役職一覧を送信
        });
      });

      io.to(roomId).emit('phaseChange', { phase: 'night' });
    }
  });

  socket.on('submitNightAction', ({ roomId, playerId, action }) => {
    const room = rooms.get(roomId);
    if (room) {
      console.log(`プレイヤー ${playerId} が夜行動を送信:`, action);
      room.recordNightAction(playerId, action);
      room.markPlayerCompleted(playerId);
      
      if (room.isAllPlayersCompleted()) {
        console.log('全員が夜行動を完了しました。処理を開始します。');
        
        const results = room.processNightActions();
        
        room.players.forEach(player => {
          const result = results.get(player.id);
          if (result) {
            io.to(player.socketId).emit('nightResult', result);
          }
        });
        
        // 自動的に議論フェーズへ移行
        setTimeout(() => {
          room.gameState = 'discussion';
          
          room.players.forEach(player => {
            io.to(player.socketId).emit('discussionStarted', {
              finalRole: player.displayRole, // ばかには偽装役職を送信
              roles: room.roles // 役職一覧を送信
            });
          });
          
          io.to(roomId).emit('phaseChange', { phase: 'discussion' });
        }, 3000); // 3秒後に自動移行
        
        console.log('全員に夜行動の結果を送信しました');
      } else {
        const completedCount = room.nightActionsCompleted.size;
        const totalCount = room.players.length;
        console.log(`夜行動完了: ${completedCount}/${totalCount}`);
        
        socket.emit('waitingForOthers', {
          completedCount,
          totalCount
        });
      }
    }
  });

  socket.on('vote', ({ roomId, playerId, targetId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.addVote(playerId, targetId);
      
      const allVoted = room.players.every(p => room.votes[p.id] !== undefined);
      
      if (allVoted) {
        const results = room.calculateResults();
        room.gameState = 'result';
        
        io.to(roomId).emit('gameResults', {
          ...results,
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            initialRole: p.role, // 真の初期役職
            finalRole: p.finalRole // 真の最終役職
          }))
        });
      }
    }
  });

  socket.on('rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      console.log(`ルーム ${roomId} で再試合を開始`);
      
      room.startGame();
      
      room.players.forEach(player => {
        io.to(player.socketId).emit('gameStarted', {
          role: player.displayRole,
          gameState: room.gameState,
          roles: room.roles
        });
      });

      io.to(roomId).emit('phaseChange', { phase: 'night' });
    }
  });

  socket.on('disconnect', () => {
    console.log('クライアント切断:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});