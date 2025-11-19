import React, { useState, useEffect } from 'react';
import socket from './socket';
import './App.css';

// コンポーネント
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import RoleConfigScreen from './components/RoleConfigScreen';
import NightPhase from './components/NightPhase';
import DiscussionPhase from './components/DiscussionPhase';
import VotingPhase from './components/VotingPhase';
import ResultScreen from './components/ResultScreen';
import DarkModeToggle from './components/DarkModeToggle';
import FoolBGM from './components/FoolBGM';

// LocalStorageのキー
const STORAGE_KEY = 'werewolf_game_state';

// ゲーム状態を保存
const saveGameState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('状態の保存に失敗:', error);
  }
};

// ゲーム状態を読み込み
const loadGameState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('状態の読み込みに失敗:', error);
    return null;
  }
};

// ゲーム状態をクリア
const clearGameState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('状態のクリアに失敗:', error);
  }
};

function App() {
  const [playerId] = useState(() => {
    const saved = sessionStorage.getItem('playerId');
    if (saved) return saved;
    const newId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('playerId', newId);
    return newId;
  });

  // 保存された状態を読み込み（本人確認付き）
  const savedState = (() => {
    const state = loadGameState();
    // 保存されたplayerIdと現在のplayerIdが一致する場合のみ復元
    if (state && state.playerId === playerId) {
      return state;
    }
    // 一致しない場合は保存された状態をクリア
    if (state && state.playerId !== playerId) {
      clearGameState();
    }
    return null;
  })();

  const [currentScreen, setCurrentScreen] = useState(savedState?.currentScreen || 'home');
  const [playerName, setPlayerName] = useState(savedState?.playerName || '');
  const [roomId, setRoomId] = useState(savedState?.roomId || '');
  const [isHost, setIsHost] = useState(savedState?.isHost || false);
  const [roomData, setRoomData] = useState(null);
  const [myRole, setMyRole] = useState(savedState?.myRole || null);
  const [myFinalRole, setMyFinalRole] = useState(savedState?.myFinalRole || null);
  const [gamePhase, setGamePhase] = useState(savedState?.gamePhase || 'lobby');
  const [gameResults, setGameResults] = useState(null);
  const [nightResult, setNightResult] = useState(savedState?.nightResult || null);
  const [gameRoles, setGameRoles] = useState(savedState?.gameRoles || null);
  const [reconnectMessage, setReconnectMessage] = useState('');
  
  // 新機能用のstate
  const [discussionTime, setDiscussionTime] = useState(300);
  const [isFoolTrue, setIsFoolTrue] = useState(false);
  const [nightActionHistory, setNightActionHistory] = useState([]);

  // 状態が変更されたら保存（playerIdも含める）
  useEffect(() => {
    if (roomId && playerName) {
      saveGameState({
        playerId, // playerIdを保存に含める
        currentScreen,
        playerName,
        roomId,
        isHost,
        myRole,
        myFinalRole,
        gamePhase,
        nightResult,
        gameRoles
      });
    }
  }, [playerId, currentScreen, playerName, roomId, isHost, myRole, myFinalRole, gamePhase, nightResult, gameRoles]);

  // 初回読み込み時に自動再接続を試みる（本人確認済みの場合のみ）
  useEffect(() => {
    if (savedState && savedState.roomId && savedState.playerName && savedState.currentScreen !== 'home') {
      console.log('保存された状態を検出。再接続を試みます...', savedState);
      
      if (!socket.connected) {
        socket.connect();
      }

      // 接続後に再参加
      const reconnectTimer = setTimeout(() => {
        socket.emit('joinRoom', {
          roomId: savedState.roomId,
          playerId: playerId,
          playerName: savedState.playerName
        });
      }, 500);

      return () => clearTimeout(reconnectTimer);
    }
  }, []); // 初回のみ実行

  useEffect(() => {
    socket.on('connect', () => {
      console.log('サーバーに接続しました');
    });

    socket.on('joinSuccess', (data) => {
      console.log('ルーム参加成功:', data);
      setIsHost(data.isHost);
      setRoomData(data.roomData);
      setCurrentScreen('lobby');
    });

    // 再接続成功時の処理
    socket.on('reconnectSuccess', (data) => {
      console.log('ゲームに再接続しました:', data);
      setIsHost(data.isHost);
      setRoomData(data.roomData);
      setMyRole(data.role);
      setMyFinalRole(data.finalRole);
      setGameRoles(data.gameRoles);
      setNightResult(data.nightResult);
      setDiscussionTime(data.discussionTime || 300);
      
      // ゲーム状態に応じて画面を設定
      if (data.gameState === 'night') {
        setCurrentScreen('night');
        setGamePhase('night');
      } else if (data.gameState === 'discussion') {
        setCurrentScreen('discussion');
        setGamePhase('discussion');
      } else if (data.gameState === 'result') {
        setCurrentScreen('result');
        setGamePhase('result');
      } else {
        setCurrentScreen('lobby');
        setGamePhase('lobby');
      }

      setReconnectMessage('ゲームに復帰しました');
      setTimeout(() => setReconnectMessage(''), 3000);
    });

    // 他のプレイヤーの再接続通知
    socket.on('playerReconnected', (data) => {
      console.log('プレイヤーが再接続:', data);
      setReconnectMessage(`${data.playerName}さんが再接続しました`);
      setTimeout(() => setReconnectMessage(''), 3000);
    });

    socket.on('roomUpdate', (data) => {
      console.log('ルーム更新:', data);
      setRoomData(data);
    });

    socket.on('rolesUpdated', (roles) => {
      console.log('役職更新:', roles);
      if (roomData) {
        setRoomData({ ...roomData, roles });
      }
    });

    socket.on('gameStarted', (data) => {
      console.log('ゲーム開始:', data);
      setMyRole(data.role);
      setMyFinalRole(data.role);
      setGamePhase('night');
      setCurrentScreen('night');
      setGameRoles(data.roles);
      setDiscussionTime(data.discussionTime || 300);
      setIsFoolTrue(data.isFoolTrue || false);
    });

    socket.on('phaseChange', (data) => {
      console.log('フェーズ変更:', data);
      setGamePhase(data.phase);
      setCurrentScreen(data.phase);
    });

    socket.on('discussionStarted', (data) => {
      console.log('議論開始:', data);
      setMyFinalRole(data.finalRole);
      setGameRoles(data.roles);
      setDiscussionTime(data.discussionTime || 300);
      setIsFoolTrue(data.isFoolTrue || false);
    });

    socket.on('gameResults', (data) => {
      console.log('ゲーム結果:', data);
      setGameResults(data);
      setGamePhase('result');
      setCurrentScreen('result');
      setNightActionHistory(data.nightActions || []);
      setIsFoolTrue(false); // 結果画面でBGM停止
    });

    socket.on('nightResult', (result) => {
      console.log('夜の結果を受信:', result);
      setNightResult(result);
    });

    return () => {
      socket.off('connect');
      socket.off('joinSuccess');
      socket.off('reconnectSuccess');
      socket.off('playerReconnected');
      socket.off('roomUpdate');
      socket.off('rolesUpdated');
      socket.off('gameStarted');
      socket.off('phaseChange');
      socket.off('discussionStarted');
      socket.off('gameResults');
      socket.off('nightResult');
    };
  }, [roomData]);

  const handleJoinRoom = (name, room) => {
    setPlayerName(name);
    setRoomId(room);
    
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit('joinRoom', {
      roomId: room,
      playerId: playerId,
      playerName: name
    });
  };

  const handleShowRoleConfig = (time) => {
    setDiscussionTime(time);
    setCurrentScreen('roleConfig');
  };

  const handleBackToLobby = () => {
    setCurrentScreen('lobby');
  };

  const handleStartGame = () => {
    socket.emit('startGame', { 
      roomId,
      discussionTime
    });
  };

  const handleStartDiscussion = () => {
    socket.emit('startDiscussion', { roomId });
  };

  const handleStartVoting = () => {
    socket.emit('startVoting', { roomId });
  };

  const handleResetGame = () => {
    setCurrentScreen('home');
    setPlayerName('');
    setRoomId('');
    setIsHost(false);
    setMyRole(null);
    setMyFinalRole(null);
    setGamePhase('lobby');
    setGameResults(null);
    setNightResult(null);
    setGameRoles(null);
    setDiscussionTime(300);
    setIsFoolTrue(false);
    setNightActionHistory([]);
    clearGameState(); // 保存された状態をクリア
    socket.disconnect();
  };

  const handleRematch = () => {
    socket.emit('rematch', { roomId });
    setNightResult(null);
    setIsFoolTrue(false);
    setNightActionHistory([]);
  };

  const handleReturnToLobby = () => {
    setCurrentScreen('lobby');
    setMyRole(null);
    setMyFinalRole(null);
    setGamePhase('lobby');
    setGameResults(null);
    setNightResult(null);
    setGameRoles(null);
    setIsFoolTrue(false);
    setNightActionHistory([]);
  };

  return (
    <div className="App">
      {/* ダークモード切り替えボタン */}
      <DarkModeToggle />
      
      {/* ばかの本物判定時のBGM */}
      <FoolBGM isFoolTrue={isFoolTrue} />

      {/* 再接続メッセージ */}
      {reconnectMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {reconnectMessage}
        </div>
      )}

      {currentScreen === 'home' && (
        <HomeScreen onJoin={handleJoinRoom} />
      )}
      
      {currentScreen === 'lobby' && roomData && (
        <LobbyScreen
          roomData={roomData}
          isHost={isHost}
          onShowRoleConfig={handleShowRoleConfig}
        />
      )}
      
      {currentScreen === 'roleConfig' && roomData && (
        <RoleConfigScreen
          roomData={roomData}
          roomId={roomId}
          onBack={handleBackToLobby}
          onStartGame={handleStartGame}
        />
      )}
      
      {currentScreen === 'night' && roomData && (
        <NightPhase
          playerId={playerId}
          roomId={roomId}
          myRole={myRole}
          roomData={roomData}
          gameRoles={gameRoles}
          onComplete={handleStartDiscussion}
        />
      )}
      
      {currentScreen === 'discussion' && roomData && (
        <DiscussionPhase
          playerId={playerId}
          roomId={roomId}
          players={roomData.players}
          myFinalRole={myFinalRole}
          nightResult={nightResult}
          gameRoles={gameRoles}
          discussionTime={discussionTime}
        />
      )}
      
      {currentScreen === 'voting' && roomData && (
        <VotingPhase
          playerId={playerId}
          roomId={roomId}
          players={roomData.players}
        />
      )}
      
      {currentScreen === 'result' && (
        <ResultScreen 
          results={gameResults} 
          onReturnToLobby={handleReturnToLobby}
          nightActions={nightActionHistory}
        />
      )}
    </div>
  );
}

export default App;