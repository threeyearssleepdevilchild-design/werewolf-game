import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営' },
  villager: { name: '村人', team: '村人陣営' },
  fortune_teller: { name: '占い師', team: '村人陣営' },
  thief: { name: '怪盗', team: '村人陣営' },
  police: { name: '警察', team: '村人陣営' },
  madman: { name: '狂人', team: '人狼陣営' },
  medium: { name: '審神者', team: '村人陣営' },
  fool: { name: 'ばか', team: '村人陣営' },
  gravekeeper: { name: '墓守', team: '村人陣営' },
  witch: { name: '魔女っ子', team: '村人陣営' },
  hanged: { name: '吊人', team: '第三陣営' }
};

function RoleConfigScreen({ roomData, roomId, onBack, onStartGame }) {
  const [roles, setRoles] = useState(roomData.roles);
  
  const playerCount = roomData.players.length;
  const requiredCards = playerCount + 2; // 中央カード2枚に変更
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
        必要カード数: <strong>{requiredCards}枚</strong> (プレイヤー数 + 2枚)<br />
        現在のカード数: <strong>{currentCards}枚</strong>
      </div>

      {Object.entries(roleInfo).map(([key, info]) => (
        <div key={key} className="role-config">
          <div>
            <div className="role-name">{info.name}</div>
            <small style={{ color: '#666' }}>{info.team}</small>
          </div>
          <div className="role-counter">
            <button 
              onClick={() => changeRoleCount(key, -1)}
              disabled={roles[key] === 0}
            >
              -
            </button>
            <span className="role-count">{roles[key]}</span>
            <button onClick={() => changeRoleCount(key, 1)}>+</button>
          </div>
        </div>
      ))}

      {currentCards !== requiredCards && (
        <div className="warning-box">
          ⚠️ カード数を{requiredCards}枚にしてください
        </div>
      )}

      {playerCount < 5 && (
        <div className="warning-box">
          ⚠️ 5人以上必要です
        </div>
      )}

      <div className="button-group">
        <button onClick={onBack}>戻る</button>
        <button 
          onClick={onStartGame} 
          disabled={!canStart}
          className="primary"
        >
          ゲーム開始
        </button>
      </div>
    </div>
  );
}

export default RoleConfigScreen;