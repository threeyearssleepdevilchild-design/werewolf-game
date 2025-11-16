import React, { useState } from 'react';

function HomeScreen({ onJoin }) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleJoin = () => {
    if (!playerName.trim()) {
      alert('名前を入力してください');
      return;
    }
    if (!roomId.trim()) {
      alert('ルームIDを入力してください');
      return;
    }
    onJoin(playerName.trim(), roomId.trim());
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('名前を入力してください');
      return;
    }
<<<<<<< HEAD
    // 5桁の数字を生成 (10000〜99999)
=======
>>>>>>> 334c92db5d1b0685ac8fa5baf8cbf77bfeee21ee
    const newRoomId = Math.floor(10000 + Math.random() * 90000).toString();
    setRoomId(newRoomId);
    onJoin(playerName.trim(), newRoomId);
  };

  return (
    <div className="container">
      <h1>🌙 ワンナイト人狼オリジナル版</h1>
      
      <div className="info-box">
        <strong>🎮 オンライン対戦版</strong><br />
        友達とリアルタイムで一緒に遊べます!
      </div>

      <h2>プレイヤー情報</h2>
      <input
        type="text"
        placeholder="あなたの名前を入力"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        maxLength={20}
      />

      <h2>ルーム設定</h2>
      <input
<<<<<<< HEAD
        type="text"
        placeholder="ルームID (例: 12345)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        maxLength={5}
      />
=======
  type="text"
  placeholder="ルームID (例: 12345)"
  value={roomId}
  onChange={(e) => setRoomId(e.target.value)}
  maxLength={5}
/>
>>>>>>> 334c92db5d1b0685ac8fa5baf8cbf77bfeee21ee

      <button onClick={handleJoin}>ルームに参加</button>
      <button onClick={handleCreateRoom} className="secondary">
        新しいルームを作成
      </button>

      <div className="warning-box">
        <strong>💡 遊び方</strong><br />
        1. 名前を入力<br />
        2. 「新しいルームを作成」でルームを作るか、友達から教えてもらったルームIDを入力<br />
        3. ホストが役職を設定してゲーム開始!
      </div>
    </div>
  );
}

export default HomeScreen;
