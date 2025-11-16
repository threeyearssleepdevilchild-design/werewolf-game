import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営' },
  villager: { name: '村人', team: '村人陣営' },
  detective: { name: '探偵', team: '村人陣営' },
  thief: { name: '怪盗', team: '村人陣営' },
  police: { name: '警察', team: '村人陣営' },
  madman: { name: '狂人', team: '人狼陣営' }
};

function RoleConfigScreen({ roomData, roomId, onBack, onStartGame }) {
  const [roles, setRoles] = useState(roomData.roles);
  
  const playerCount = roomData.players.length;
  const requiredCards = playerCount + 3;
  const currentCards = Object.values(roles).reduce((a, b) => a + b, 0);

  useEffect(() => {
    socket.emit('updateRoles', { roomId, roles });
  }, [roles, roomId]);

  const changeRoleCount = (role, delta) => {
    setRoles((prev) => ({
      ...prev,
      [role]: Math.max(0, prev[role] + delta)
    }));
  };

  const canStart = currentCards === requiredCards && playerCount >= 5;

  return (
    <div className="container">
      <h1>🌙 ワンナイト人狼オリジナル版</h1>
      
      <h2>役職設定</h2>

      <div className="info-box">
        プレイヤー数: <strong>{playerCount}人</strong><br />
        必要カード数: <strong>{requiredCards}枚</strong> (プレイヤー数 + 3枚)<br />
        現在のカード数: <strong>{currentCards}枚</strong>
      </div>

      {Object.entries(roleInfo).map(([key, info]) => (
        <div key={key} className="role-config">
          <div>
            <div className="role-name">{info.name}</div>
            <small style={{ color: '#666' }}>{info.team}</small>
          </div>
          <div className="role-count">
            <button onClick={() => changeRoleCount(key, -1)}>-</button>
            <span>{roles[key]}</span>
            <button onClick={() => changeRoleCount(key, 1)}>+</button>
          </div>
        </div>
      ))}

      {!canStart && (
        <div className="warning-box">
          {currentCards !== requiredCards && (
            <>⚠️ カード数が合いません! {requiredCards}枚必要です (現在{currentCards}枚)</>
          )}
          {playerCount < 5 && (
            <>⚠️ プレイヤーが足りません! 5人以上必要です (現在{playerCount}人)</>
          )}
        </div>
      )}

      <button onClick={onStartGame} disabled={!canStart}>
        ゲーム開始
      </button>
      <button onClick={onBack} className="secondary">
        ロビーに戻る
      </button>
    </div>
  );
}

export default RoleConfigScreen;
