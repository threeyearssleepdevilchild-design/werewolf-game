import React, { useState, useEffect } from 'react';
import socket from '../socket';
import './RoleConfigScreen.css';

const roleInfo = {
  werewolf: { 
    name: '人狼', 
    team: 'werewolf',
    teamName: '人狼陣営',
    description: '仲間を確認できる。孤独な人狼の場合は能力なし'
  },
  madman: { 
    name: '狂人', 
    team: 'werewolf',
    teamName: '人狼陣営',
    description: '能力なし。人狼陣営として勝利を目指す'
  },
  villager: { 
    name: '村人', 
    team: 'villager',
    teamName: '村人陣営',
    description: '能力なし。議論と推理で人狼を見つける'
  },
  fortune_teller: { 
    name: '占い師', 
    team: 'villager',
    teamName: '村人陣営',
    description: 'プレイヤー1人または中央カード2枚を確認'
  },
  thief: { 
    name: '怪盗', 
    team: 'villager',
    teamName: '村人陣営',
    description: '他プレイヤー1人と役職を交換できる'
  },
  police: { 
    name: '警察', 
    team: 'villager',
    teamName: '村人陣営',
    description: '夜の最初に1人の能力を封じる'
  },
  medium: { 
    name: '審神者', 
    team: 'villager',
    teamName: '村人陣営',
    description: 'プレイヤー1人の陣営を確認'
  },
  fool: { 
    name: 'ばか', 
    team: 'villager',
    teamName: '村人陣営',
    description: '村人役職の偽情報を得る。自分がばかだと知らない'
  },
  gravekeeper: { 
    name: '墓守', 
    team: 'villager',
    teamName: '村人陣営',
    description: '中央カード1枚を確認し、交換するか選べる'
  },
  witch: { 
    name: '魔女っ子', 
    team: 'villager',
    teamName: '村人陣営',
    description: 'プレイヤー1人の元の役職を確認'
  },
  hanged: { 
    name: '吊人', 
    team: 'third',
    teamName: '第三陣営',
    description: '自分が処刑されると勝利'
  }
};

// プリセット設定
const presets = {
  5: {
    name: '5人用（基本）',
    roles: {
      werewolf: 2, villager: 2, fortune_teller: 1, thief: 1, police: 1,
      madman: 0, medium: 0, fool: 0, gravekeeper: 0, witch: 0, hanged: 0
    }
  },
  6: {
    name: '6人用（推奨）',
    roles: {
      werewolf: 2, villager: 2, fortune_teller: 1, thief: 1, police: 1, medium: 1,
      madman: 0, fool: 0, gravekeeper: 0, witch: 0, hanged: 0
    }
  },
  7: {
    name: '7人用（拡張）',
    roles: {
      werewolf: 2, villager: 2, fortune_teller: 1, thief: 1, police: 1, medium: 1, gravekeeper: 1,
      madman: 0, fool: 0, witch: 0, hanged: 0
    }
  },
  8: {
    name: '8人用（フル）',
    roles: {
      werewolf: 2, villager: 2, fortune_teller: 1, thief: 1, police: 1, medium: 1, gravekeeper: 1, witch: 1,
      madman: 0, fool: 0, hanged: 0
    }
  }
};

function RoleConfigScreen({ roomData, roomId, onBack, onStartGame }) {
  const [roles, setRoles] = useState(roomData.roles);
  const [hoveredRole, setHoveredRole] = useState(null);
  
  const playerCount = roomData.players.length;
  const requiredCards = playerCount + 2;
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

  const applyPreset = () => {
    const preset = presets[playerCount];
    if (preset) {
      setRoles(preset.roles);
    }
  };

  const canStart = currentCards === requiredCards && playerCount >= 5;

  // 陣営別に役職を分類
  const werewolfRoles = Object.entries(roleInfo).filter(([_, info]) => info.team === 'werewolf');
  const villagerRoles = Object.entries(roleInfo).filter(([_, info]) => info.team === 'villager');
  const thirdRoles = Object.entries(roleInfo).filter(([_, info]) => info.team === 'third');

  const RoleCard = ({ roleKey, info }) => (
    <div 
      className={`role-card ${info.team}`}
      onMouseEnter={() => setHoveredRole(roleKey)}
      onMouseLeave={() => setHoveredRole(null)}
    >
      <div className="role-header">
        <div className="role-title">
          <span className="role-name">{info.name}</span>
          <span className="role-team-badge">{info.teamName}</span>
        </div>
      </div>
      
      {hoveredRole === roleKey && (
        <div className="role-description">
          {info.description}
        </div>
      )}
      
      <div className="role-counter">
        <button 
          className="counter-btn minus"
          onClick={() => changeRoleCount(roleKey, -1)}
          disabled={roles[roleKey] === 0}
        >
          −
        </button>
        <span className="role-count">{roles[roleKey]}</span>
        <button 
          className="counter-btn plus"
          onClick={() => changeRoleCount(roleKey, 1)}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="role-config-container">
      <div className="role-config-header">
        <h1>🌙 役職設定</h1>
        
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">プレイヤー</span>
            <span className="stat-value">{playerCount}人</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">必要カード</span>
            <span className="stat-value">{requiredCards}枚</span>
          </div>
          <div className="stat-item">
            <span className={`stat-label ${currentCards === requiredCards ? 'success' : 'warning'}`}>
              現在のカード
            </span>
            <span className={`stat-value ${currentCards === requiredCards ? 'success' : 'warning'}`}>
              {currentCards}枚
            </span>
          </div>
        </div>

        {presets[playerCount] && (
          <button className="preset-btn" onClick={applyPreset}>
            ⚡ {presets[playerCount].name}を適用
          </button>
        )}
      </div>

      <div className="roles-section">
        <div className="team-section werewolf-section">
          <h3 className="team-header">🐺 人狼陣営</h3>
          <div className="role-grid">
            {werewolfRoles.map(([key, info]) => (
              <RoleCard key={key} roleKey={key} info={info} />
            ))}
          </div>
        </div>

        <div className="team-section villager-section">
          <h3 className="team-header">👥 村人陣営</h3>
          <div className="role-grid">
            {villagerRoles.map(([key, info]) => (
              <RoleCard key={key} roleKey={key} info={info} />
            ))}
          </div>
        </div>

        <div className="team-section third-section">
          <h3 className="team-header">⚖️ 第三陣営</h3>
          <div className="role-grid">
            {thirdRoles.map(([key, info]) => (
              <RoleCard key={key} roleKey={key} info={info} />
            ))}
          </div>
        </div>
      </div>

      {currentCards !== requiredCards && (
        <div className="warning-message">
          ⚠️ カード数を{requiredCards}枚に調整してください（現在{currentCards}枚）
        </div>
      )}

      {playerCount < 5 && (
        <div className="warning-message">
          ⚠️ 5人以上のプレイヤーが必要です
        </div>
      )}

      <div className="action-buttons">
        <button className="btn-secondary" onClick={onBack}>
          ← 戻る
        </button>
        <button 
          className="btn-primary" 
          onClick={onStartGame} 
          disabled={!canStart}
        >
          ゲーム開始 🎮
        </button>
      </div>
    </div>
  );
}

export default RoleConfigScreen;