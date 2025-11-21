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

function hideFool(role) {
  return role === 'fool' ? 'villager' : role;
}

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
    this.foolDisplayRole = null;
    this.gravekeeperPhase = new Map();
    this.discussionTime = 300; // 議論時間（デフォルト5分）
    this.isFoolTrue = false; // ばかの結果が本物かどうか
    this.nightActionHistory = []; // 夜フェーズの行動履歴
  }

  addPlayer(playerId, playerName, socketId) {
    const player = {
      id: playerId,
      name: playerName,
      socketId: socketId,
      role: null,
      finalRole: null,
      displayRole: null,
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
      player.displayRole = deck[index];
    });

    this.centerCards = deck.slice(this.players.length, this.players.length + 2);

    // ✅ ばかの処理を修正
    const foolPlayer = this.players.find(p => p.role === 'fool');
    if (foolPlayer) {
      // 実際にゲームで使用されている村人陣営の役職を抽出
      const villagerRoles = ['fortune_teller', 'thief', 'police', 'gravekeeper', 'witch', 'medium'];
      const availableRoles = villagerRoles.filter(role => {
        // このロールがゲームで使われているかチェック
        return this.roles[role] && this.roles[role] > 0;
      });

      // 使用可能な役職がある場合はその中から選択、なければ村人
      if (availableRoles.length > 0) {
        this.foolDisplayRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      } else {
        // 村人陣営の特殊役職が1つもない場合は村人として表示
        this.foolDisplayRole = 'villager';
      }
      
      foolPlayer.displayRole = this.foolDisplayRole;
      
      // 1/10の確率で本物
      this.isFoolTrue = Math.random() < 0.1;
      console.log(`ばかは ${this.foolDisplayRole} を演じます (本物: ${this.isFoolTrue})`);
    }

    this.nightActions = new Map();
    this.nightActionsCompleted = new Set();
    this.nightResults = new Map();
    this.sealedPlayerId = null;
    this.votes = {};
    this.gravekeeperPhase = new Map();
    this.nightActionHistory = [];
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
    return this.players.every(p => {
      if (p.role === 'gravekeeper') {
        const phase = this.gravekeeperPhase.get(p.id);
        return phase === 'completed';
      }
      return this.nightActionsCompleted.has(p.id);
    });
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
    // 本物の結果を返す場合
    if (this.isFoolTrue) {
      const foolPlayer = this.players.find(p => p.role === 'fool');
      if (!foolPlayer) return { type: 'wait' };

      // 実際の能力を実行
      if (disguiseRole === 'fortune_teller') {
        const otherPlayers = this.players.filter(p => p.id !== foolPlayer.id);
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          type: 'fool',
          abilityType: 'fortune_teller',
          playerName: target.name,
          role: target.finalRole,
          isTrueResult: true
        };
      } else if (disguiseRole === 'medium') {
        const otherPlayers = this.players.filter(p => p.id !== foolPlayer.id);
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const team = roleTeams[target.finalRole] === 'werewolf' ? '人狼陣営' : 
                     roleTeams[target.finalRole] === 'hanged' ? '第三陣営' : '村人陣営';
        return {
          type: 'fool',
          abilityType: 'medium',
          playerName: target.name,
          team: team,
          isTrueResult: true
        };
      } else if (disguiseRole === 'thief') {
        const otherPlayers = this.players.filter(p => p.id !== foolPlayer.id);
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        // 実際に交換
        this.swapRoles(foolPlayer.id, target.id);
        return {
          type: 'fool',
          abilityType: 'thief',
          swapped: true,
          newRole: foolPlayer.finalRole,
          isTrueResult: true
        };
      } else if (disguiseRole === 'witch') {
        const otherPlayers = this.players.filter(p => p.id !== foolPlayer.id);
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          type: 'fool',
          abilityType: 'witch',
          playerName: target.name,
          role: target.role,
          isTrueResult: true
        };
      }
    }

    // 嘘の結果を返す
    const allRoles = ['werewolf', 'villager', 'fortune_teller', 'thief', 'police', 'madman', 'medium', 'fool', 'gravekeeper', 'witch', 'hanged'];
    
    if (disguiseRole === 'fortune_teller') {
      const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      return {
        type: 'fool',
        abilityType: 'fortune_teller',
        playerName: randomPlayer.name,
        role: randomRole,
        isTrueResult: false
      };
    } else if (disguiseRole === 'medium') {
      const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
      const randomTeam = Math.random() < 0.5 ? '村人陣営' : '人狼陣営';
      return {
        type: 'fool',
        abilityType: 'medium',
        playerName: randomPlayer.name,
        team: randomTeam,
        isTrueResult: false
      };
    } else if (disguiseRole === 'thief') {
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      return {
        type: 'fool',
        abilityType: 'thief',
        swapped: true,
        newRole: randomRole,
        isTrueResult: false
      };
    } else if (disguiseRole === 'witch') {
      const randomPlayer = this.players[Math.floor(Math.random() * this.players.length)];
      const randomRole = allRoles[Math.floor(Math.random() * allRoles.length)];
      return {
        type: 'fool',
        abilityType: 'witch',
        playerName: randomPlayer.name,
        role: randomRole,
        isTrueResult: false
      };
    }
    
    return { 
      type: 'fool',
      abilityType: 'wait',
      isTrueResult: false
    };
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

          const targetPlayer = this.players.find(p => p.id === action.targetId);
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'police',
            description: `${targetPlayer ? targetPlayer.name : '不明'}の能力を封じました`
          });
        } else {
          this.nightResults.set(player.id, {
            type: 'police',
            sealed: false
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'police',
            description: '今夜は能力を封じませんでした'
          });
        }
      }
    });

    // 1. 人狼の処理
    this.players.forEach(player => {
      if (player.role === 'werewolf') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'werewolf',
            description: '警察によって能力が封じられました'
          });
        } else {
          const werewolves = this.players.filter(p => p.role === 'werewolf' && p.id !== player.id);
          
          if (werewolves.length > 0) {
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'multiple',
              werewolves: werewolves.map(w => ({ id: w.id, name: w.name }))
            });
            this.nightActionHistory.push({
              playerName: player.name,
              role: 'werewolf',
              description: `仲間の人狼を確認: ${werewolves.map(w => w.name).join(', ')}`
            });
          } else {
            this.nightResults.set(player.id, {
              type: 'werewolf',
              subtype: 'alone'
            });
            this.nightActionHistory.push({
              playerName: player.name,
              role: 'werewolf',
              description: '仲間の人狼はいませんでした'
            });
          }
        }
      }
    });

    // 2. 占い師の処理
    this.players.forEach(player => {
      if (player.role === 'fortune_teller') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'fortune_teller',
            description: '警察によって能力が封じられました'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkPlayer' && action.targetId) {
            const target = this.players.find(p => p.id === action.targetId);
            if (target) {
              this.nightResults.set(player.id, {
                type: 'fortune_teller',
                subtype: 'player',
                playerName: target.name,
                role: hideFool(target.finalRole)
              });
              this.nightActionHistory.push({
                playerName: player.name,
                role: 'fortune_teller',
                description: `${target.name}の役職を占いました: ${hideFool(target.finalRole)}`
              });
            }
          } else if (action && action.type === 'checkCenter') {
            this.nightResults.set(player.id, {
              type: 'fortune_teller',
              subtype: 'center',
              cards: this.centerCards.map(c => hideFool(c))
            });
            this.nightActionHistory.push({
              playerName: player.name,
              role: 'fortune_teller',
              description: `中央カード2枚を占いました`
            });
          } else {
            this.nightResults.set(player.id, {
              type: 'wait'
            });
          }
        }
      }
    });

    // 3. 怪盗の処理
    this.players.forEach(player => {
      if (player.role === 'thief') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'thief',
            description: '警察によって能力が封じられました'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'swap' && action.targetId) {
            const target = this.players.find(p => p.id === action.targetId);
            if (target) {
              const oldRole = player.finalRole;
              this.swapRoles(player.id, action.targetId);
              const newRole = player.finalRole;
              
              this.nightResults.set(player.id, {
                type: 'thief',
                swapped: true,
                newRole: hideFool(newRole)
              });

              this.nightActionHistory.push({
                playerName: player.name,
                role: 'thief',
                description: `${target.name}と役職を交換しました (${oldRole} → ${newRole})`
              });
            }
          } else {
            this.nightResults.set(player.id, {
              type: 'thief',
              swapped: false
            });
            this.nightActionHistory.push({
              playerName: player.name,
              role: 'thief',
              description: '今夜は交換しませんでした'
            });
          }
        }
      }
    });

    // 4. 審神者の処理
    this.players.forEach(player => {
      if (player.role === 'medium') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'medium',
            description: '警察によって能力が封じられました'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkTeam' && action.targetId) {
            const target = this.players.find(p => p.id === action.targetId);
            if (target) {
              const team = roleTeams[target.finalRole] === 'werewolf' ? '人狼陣営' : 
                           roleTeams[target.finalRole] === 'hanged' ? '第三陣営' : '村人陣営';
              
              this.nightResults.set(player.id, {
                type: 'medium',
                playerName: target.name,
                team: team
              });

              this.nightActionHistory.push({
                playerName: player.name,
                role: 'medium',
                description: `${target.name}の陣営を調べました: ${team}`
              });
            }
          } else {
            this.nightResults.set(player.id, {
              type: 'wait'
            });
          }
        }
      }
    });

    // 5. ばかの処理
    this.players.forEach(player => {
      if (player.role === 'fool') {
        if (player.id === this.sealedPlayerId) {
          this.nightResults.set(player.id, {
            type: 'sealed'
          });
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'fool',
            description: '警察によって能力が封じられました'
          });
        } else {
          const foolInfo = this.generateFoolInfo(this.foolDisplayRole);
          this.nightResults.set(player.id, foolInfo);
          
          // 行動履歴に追加
          let description = `${this.foolDisplayRole}の能力を使用`;
          if (foolInfo.isTrueResult) {
            description += '（本物の結果！）';
          } else {
            description += '（嘘の結果）';
          }
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'fool',
            description: description
          });
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
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'gravekeeper',
            description: '警察によって能力が封じられました'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.centerIndex !== undefined) {
            const centerCard = this.centerCards[action.centerIndex];
            
            if (action.shouldSwap) {
              const oldRole = player.finalRole;
              this.swapWithCenter(player.id, action.centerIndex);
              const newRole = player.finalRole;
              
              this.nightResults.set(player.id, {
                type: 'gravekeeper',
                viewed: true,
                card: hideFool(centerCard),
                swapped: true,
                newRole: hideFool(newRole)
              });

              this.nightActionHistory.push({
                playerName: player.name,
                role: 'gravekeeper',
                description: `中央カードを確認して交換しました (${oldRole} → ${newRole})`
              });
            } else {
              this.nightResults.set(player.id, {
                type: 'gravekeeper',
                viewed: true,
                card: hideFool(centerCard),
                swapped: false
              });

              this.nightActionHistory.push({
                playerName: player.name,
                role: 'gravekeeper',
                description: `中央カード(${hideFool(centerCard)})を確認しましたが交換しませんでした`
              });
            }
          } else {
            this.nightResults.set(player.id, {
              type: 'gravekeeper',
              viewed: false
            });
            this.nightActionHistory.push({
              playerName: player.name,
              role: 'gravekeeper',
              description: '今夜は中央カードを見ませんでした'
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
          this.nightActionHistory.push({
            playerName: player.name,
            role: 'witch',
            description: '警察によって能力が封じられました'
          });
        } else {
          const action = this.nightActions.get(player.id);
          
          if (action && action.type === 'checkOriginal' && action.targetId) {
            const target = this.players.find(p => p.id === action.targetId);
            if (target) {
              this.nightResults.set(player.id, {
                type: 'witch',
                playerName: target.name,
                role: hideFool(target.role)
              });

              this.nightActionHistory.push({
                playerName: player.name,
                role: 'witch',
                description: `${target.name}の初期役職を調べました: ${hideFool(target.role)}`
              });
            }
          } else {
            this.nightResults.set(player.id, {
              type: 'wait'
            });
          }
        }
      }
    });

    // 8. 能力のない役職（村人、狂人、吊人）
    this.players.forEach(player => {
      if (['villager', 'madman', 'hanged'].includes(player.role)) {
        this.nightResults.set(player.id, {
          type: 'wait'
        });
        this.nightActionHistory.push({
          playerName: player.name,
          role: player.role,
          description: '夜の能力はありません'
        });
      }
    });

    return this.nightResults;
  }

  addVote(playerId, targetId) {
    this.votes[playerId] = targetId;
  }

  calculateResults() {
    const playerVoteCounts = {};
    const voteDetails = [];
    
    this.players.forEach(p => {
      playerVoteCounts[p.id] = 0;
    });

    for (let voterId in this.votes) {
      const targetId = this.votes[voterId];
      const voter = this.players.find(p => p.id === voterId);
      
      if (targetId === 'peace') {
        voteDetails.push({
          voterName: voter ? voter.name : '不明',
          targetName: '平和村'
        });
      } else {
        if (playerVoteCounts[targetId] !== undefined) {
          playerVoteCounts[targetId]++;
        }
        
        const target = this.players.find(p => p.id === targetId);
        voteDetails.push({
          voterName: voter ? voter.name : '不明',
          targetName: target ? target.name : '不明'
        });
      }
    }

    const allPeaceVotes = Object.values(this.votes).every(v => v === 'peace');

    if (allPeaceVotes) {
      const hasWerewolf = this.players.some(p => p.finalRole === 'werewolf');
      
      if (!hasWerewolf) {
        return {
          voteCounts: playerVoteCounts,
          executed: [],
          winners: this.players,
          resultType: 'peace',
          hasWerewolf: false,
          voteDetails
        };
      } else {
        return {
          voteCounts: playerVoteCounts,
          executed: [],
          winners: this.players.filter(p => roleTeams[p.finalRole] === 'werewolf'),
          resultType: 'peace',
          hasWerewolf: true,
          voteDetails
        };
      }
    }

    const maxVotes = Math.max(...Object.values(playerVoteCounts));
    const executed = this.players.filter(p => playerVoteCounts[p.id] === maxVotes);

    const hangedExecuted = executed.find(p => p.finalRole === 'hanged');
    if (hangedExecuted) {
      return {
        voteCounts: playerVoteCounts,
        executed,
        winners: [hangedExecuted],
        resultType: 'hanged_win',
        hasWerewolf: true,
        voteDetails
      };
    }

    const hasWerewolf = this.players.some(p => p.finalRole === 'werewolf');
    if (!hasWerewolf) {
      return {
        voteCounts: playerVoteCounts,
        executed,
        winners: executed,
        resultType: 'peace_executed',
        hasWerewolf: false,
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
    const isReconnect = existingPlayer !== undefined;
    
    if (!existingPlayer) {
      room.addPlayer(playerId, playerName, socket.id);
    } else {
      existingPlayer.socketId = socket.id;
      console.log(`プレイヤー ${playerName} が再接続しました`);
      
      socket.to(roomId).emit('playerReconnected', {
        playerName: playerName,
        playerId: playerId
      });
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;

    io.to(roomId).emit('roomUpdate', room.getRoomData());
    
    if (isReconnect && room.gameState !== 'lobby') {
      const player = room.players.find(p => p.id === playerId);
      
      socket.emit('reconnectSuccess', {
        playerId: playerId,
        isHost: room.host === playerId,
        roomData: room.getRoomData(),
        gameState: room.gameState,
        role: player.displayRole,
        finalRole: player.displayRole,
        gameRoles: room.roles,
        nightResult: room.nightResults.get(playerId) || null,
        discussionTime: room.discussionTime
      });
    } else {
      socket.emit('joinSuccess', {
        playerId: playerId,
        isHost: room.host === playerId,
        roomData: room.getRoomData()
      });
    }
  });

  socket.on('updateRoles', ({ roomId, roles }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.updateRoles(roles);
      io.to(roomId).emit('rolesUpdated', roles);
    }
  });

  socket.on('startGame', ({ roomId, discussionTime }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.data.playerId) {
      // 議論時間を保存
      room.discussionTime = discussionTime || 300;
      console.log(`議論時間: ${room.discussionTime}秒`);
      
      room.startGame();
      
      room.players.forEach(player => {
        io.to(player.socketId).emit('gameStarted', {
          role: player.displayRole,
          gameState: room.gameState,
          roles: room.roles,
          discussionTime: room.discussionTime,
          isFoolTrue: room.isFoolTrue
        });
      });

      io.to(roomId).emit('phaseChange', { phase: 'night' });
    }
  });

  socket.on('submitNightAction', ({ roomId, playerId, action }) => {
    const room = rooms.get(roomId);
    if (room) {
      console.log(`プレイヤー ${playerId} が夜行動を送信:`, action);
      
      const player = room.players.find(p => p.id === playerId);
      
      if (player && player.role === 'gravekeeper') {
        const currentPhase = room.gravekeeperPhase.get(playerId);
        
        if (!currentPhase || currentPhase === 'selecting') {
          room.recordNightAction(playerId, action);
          room.markPlayerCompleted(playerId);
          room.gravekeeperPhase.set(playerId, 'selecting');
          console.log(`墓守 ${playerId} がカードを選択しました（フェーズ: selecting）`);
        } else if (currentPhase === 'confirming') {
          room.recordNightAction(playerId, action);
          room.gravekeeperPhase.set(playerId, 'completed');
          room.markPlayerCompleted(playerId);
          console.log(`墓守 ${playerId} が交換を選択しました（フェーズ: completed）`);
        }
      } else {
        room.recordNightAction(playerId, action);
        room.markPlayerCompleted(playerId);
      }
      
      if (room.isAllPlayersCompleted()) {
        console.log('全員が夜行動を完了しました。処理を開始します。');
        
        const results = room.processNightActions();
        
        const gravekeepers = room.players.filter(p => p.role === 'gravekeeper' && room.gravekeeperPhase.get(p.id) === 'selecting');
        
        if (gravekeepers.length > 0) {
          console.log('墓守にカード情報を送信し、確認フェーズに移行します');
          
          gravekeepers.forEach(gk => {
            const result = results.get(gk.id);
            const action = room.nightActions.get(gk.id);
            
            if (result.type === 'sealed') {
              io.to(gk.socketId).emit('gravekeeperViewResult', {
                type: 'sealed'
              });
              room.gravekeeperPhase.set(gk.id, 'completed');
            } else if (result.viewed && action.centerIndex !== undefined) {
              io.to(gk.socketId).emit('gravekeeperViewResult', {
                type: 'success',
                card: result.card,
                centerIndex: action.centerIndex
              });
              room.gravekeeperPhase.set(gk.id, 'confirming');
              room.nightActionsCompleted.delete(gk.id);
            } else {
              room.gravekeeperPhase.set(gk.id, 'completed');
            }
          });
          
          if (!room.isAllPlayersCompleted()) {
            console.log('墓守の確認待ち...');
            return;
          }
        }
        
        room.players.forEach(player => {
          const result = results.get(player.id);
          if (result && player.role !== 'gravekeeper') {
            io.to(player.socketId).emit('nightResult', result);
          }
        });
        
        // 議論フェーズへ移行
        setTimeout(() => {
          room.gameState = 'discussion';
          
          room.players.forEach(player => {
            io.to(player.socketId).emit('discussionStarted', {
              finalRole: player.displayRole,
              roles: room.roles,
              discussionTime: room.discussionTime,
              isFoolTrue: room.isFoolTrue
            });
          });
          
          io.to(roomId).emit('phaseChange', { phase: 'discussion' });
        }, 3000);
        
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
            initialRole: p.role,
            finalRole: p.finalRole
          })),
          nightActions: room.nightActionHistory
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
          roles: room.roles,
          discussionTime: room.discussionTime,
          isFoolTrue: room.isFoolTrue
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