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

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [playerId] = useState(() => {
    // タブごとに一意のIDを生成（sessionStorageを使用）
    const saved = sessionStorage.getItem('playerId');
    if (saved) return saved;
    const newId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('playerId', newId);
    return newId;
  });
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myFinalRole, setMyFinalRole] = useState(null);
  const [gamePhase, setGamePhase] = useState('lobby');
  const [gameResults, setGameResults] = useState(null);

  useEffect(() => {
    // Socket.ioイベントリスナー設定
    socket.on('connect', () => {
      console.log('サーバーに接続しました');
    });

    socket.on('joinSuccess', (data) => {
      console.log('ルーム参加成功:', data);
      setIsHost(data.isHost);
      setRoomData(data.roomData);
      setCurrentScreen('lobby');
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
    });

    socket.on('phaseChange', (data) => {
      console.log('フェーズ変更:', data);
      setGamePhase(data.phase);
      setCurrentScreen(data.phase);
    });

    socket.on('discussionStarted', (data) => {
      console.log('議論開始:', data);
      setMyFinalRole(data.finalRole);
    });

    socket.on('gameResults', (data) => {
      console.log('ゲーム結果:', data);
      setGameResults(data);
      setGamePhase('result');
      setCurrentScreen('result');
    });

    return () => {
      socket.off('connect');
      socket.off('joinSuccess');
      socket.off('roomUpdate');
      socket.off('rolesUpdated');
      socket.off('gameStarted');
      socket.off('phaseChange');
      socket.off('discussionStarted');
      socket.off('gameResults');
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

  const handleShowRoleConfig = () => {
    setCurrentScreen('roleConfig');
  };

  const handleBackToLobby = () => {
    setCurrentScreen('lobby');
  };

  const handleStartGame = () => {
    socket.emit('startGame', { roomId });
  };

  const handleStartDiscussion = () => {
    socket.emit('startDiscussion', { roomId });
  };

  const handleStartVoting = () => {
    socket.emit('startVoting', { roomId });
  };

  const handleResetGame = () => {
    setCurrentScreen('home');
    setMyRole(null);
    setMyFinalRole(null);
    setGamePhase('lobby');
    socket.disconnect();
  };

  return (
    <div className="App">
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
          onComplete={handleStartDiscussion}
        />
      )}
      
      {currentScreen === 'discussion' && (
        <DiscussionPhase
          myFinalRole={myFinalRole}
          onStartVoting={handleStartVoting}
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
        <ResultScreen results={gameResults} onReset={handleResetGame} />
      )}
    </div>
  );
}

export default App;