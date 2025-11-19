import React, { useState, useEffect } from 'react';
import socket from '../socket';
import RoleModal from './RoleModal';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営', color: 'werewolf' },
  villager: { name: '村人', team: '村人陣営', color: 'villager' },
  fortune_teller: { name: '占い師', team: '村人陣営', color: 'detective' },
  thief: { name: '怪盗', team: '村人陣営', color: 'thief' },
  police: { name: '警察', team: '村人陣営', color: 'police' },
  madman: { name: '狂人', team: '人狼陣営', color: 'madman' },
  medium: { name: '審神者', team: '村人陣営', color: 'medium' },
  fool: { name: 'ばか', team: '村人陣営', color: 'fool' },
  gravekeeper: { name: '墓守', team: '村人陣営', color: 'gravekeeper' },
  witch: { name: '魔女っ子', team: '村人陣営', color: 'witch' },
  hanged: { name: '吊人', team: '第三陣営', color: 'hanged' }
};

function DiscussionPhase({ playerId, roomId, players, myFinalRole, nightResult, gameRoles, discussionTime }) {
  const role = roleInfo[myFinalRole];
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(discussionTime || 300); // デフォルト5分
  const [selectedRoleForModal, setSelectedRoleForModal] = useState(null);

  const otherPlayers = players.filter(p => p.id !== playerId);

  // タイマー機能
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 時間をフォーマット (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // タイマーの色を決定
  const getTimerColor = () => {
    if (timeLeft > 60) return 'timer-green';
    if (timeLeft > 30) return 'timer-yellow';
    return 'timer-red';
  };

  const getWinCondition = () => {
    if (myFinalRole === 'werewolf') {
      return '人狼が1人も処刑されなければ勝利';
    } else if (myFinalRole === 'madman') {
      return '人狼陣営(狂人除く)が処刑されなければ勝利\n※平和村の場合は村人陣営として勝利';
    } else if (myFinalRole === 'hanged') {
      return '自分が処刑されたら単独勝利';
    } else {
      return '人狼を1人以上処刑すれば勝利';
    }
  };

  const handleVote = () => {
    if (!selectedTarget) {
      alert('投票先を選んでください');
      return;
    }

    socket.emit('vote', { roomId, playerId, targetId: selectedTarget });
    setHasVoted(true);
  };

  // 役職一覧を生成
  const getRolesList = () => {
    if (!gameRoles) return null;
    
    const rolesList = [];
    for (let role in gameRoles) {
      if (gameRoles[role] > 0) {
        rolesList.push({ 
          role, 
          name: roleInfo[role].name, 
          count: gameRoles[role] 
        });
      }
    }
    return rolesList;
  };

  // 夜の結果を表示
  const renderNightResult = () => {
    if (!nightResult) return null;

    if (nightResult.type === 'sealed') {
      return (
        <div className="warning-box">
          ⚠️ 警察によって能力が封じられました
        </div>
      );
    }

    if (nightResult.type === 'police') {
      return (
        <div className="info-box">
          <strong>【警察の結果】</strong><br />
          {nightResult.sealed 
            ? '能力を封じました'
            : '今夜は能力を封じませんでした'}
        </div>
      );
    }

    if (nightResult.type === 'werewolf') {
      if (nightResult.subtype === 'multiple') {
        return (
          <div className="info-box">
            <strong>【人狼の結果】</strong><br />
            仲間の人狼: {nightResult.werewolves.map(w => w.name).join(', ')}
          </div>
        );
      } else if (nightResult.subtype === 'alone') {
        return (
          <div className="info-box">
            <strong>【人狼の結果】</strong><br />
            仲間はいませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'medium') {
      return (
        <div className="info-box">
          <strong>【審神者の結果】</strong><br />
          {nightResult.playerName}の陣営: {nightResult.team}
        </div>
      );
    }

    if (nightResult.type === 'fortune_teller') {
      if (nightResult.subtype === 'player') {
        return (
          <div className="info-box">
            <strong>【占い師の結果】</strong><br />
            {nightResult.playerName}の役職: {roleInfo[nightResult.role].name}
          </div>
        );
      } else if (nightResult.subtype === 'center') {
        return (
          <div className="info-box">
            <strong>【占い師の結果】</strong><br />
            中央カード1枚目: {roleInfo[nightResult.cards[0]].name}<br />
            中央カード2枚目: {roleInfo[nightResult.cards[1]].name}
          </div>
        );
      }
    }

    if (nightResult.type === 'thief') {
      if (nightResult.swapped) {
        return (
          <div className="info-box">
            <strong>【怪盗の結果】</strong><br />
            カードを交換しました!<br />
            新しい役職: {roleInfo[nightResult.newRole].name}
          </div>
        );
      } else {
        return (
          <div className="info-box">
            <strong>【怪盗の結果】</strong><br />
            今夜は交換しませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'gravekeeper') {
      if (nightResult.viewed) {
        return (
          <div className="info-box">
            <strong>【墓守の結果】</strong><br />
            中央カードを確認: {roleInfo[nightResult.card].name}<br />
            {nightResult.swapped && (
              <>
                交換しました!<br />
                新しい役職: {roleInfo[nightResult.newRole].name}
              </>
            )}
            {!nightResult.swapped && '交換しませんでした'}
          </div>
        );
      } else {
        return (
          <div className="info-box">
            <strong>【墓守の結果】</strong><br />
            今夜は中央カードを見ませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'witch') {
      return (
        <div className="info-box">
          <strong>【魔女っ子の結果】</strong><br />
          {nightResult.playerName}の初期役職: {roleInfo[nightResult.role].name}
        </div>
      );
    }

    if (nightResult.type === 'fool') {
      // ばかの結果表示
      const isTrueResult = nightResult.isTrueResult;
      return (
        <div className={isTrueResult ? 'success-box' : 'info-box'}>
          <strong>【ばかの結果】</strong><br />
          {nightResult.abilityType === 'fortune_teller' && (
            <>
              占い結果: {nightResult.playerName}は {roleInfo[nightResult.role].name}
              {isTrueResult && ' ✨(本物!)'}
            </>
          )}
          {nightResult.abilityType === 'thief' && (
            <>
              {nightResult.swapped ? (
                <>
                  カードを交換しました!<br />
                  新しい役職: {roleInfo[nightResult.newRole].name}
                  {isTrueResult && ' ✨(本物!)'}
                </>
              ) : (
                <>
                  今夜は交換しませんでした
                  {isTrueResult && ' ✨(本物!)'}
                </>
              )}
            </>
          )}
          {nightResult.abilityType === 'medium' && (
            <>
              {nightResult.playerName}の陣営: {nightResult.team}
              {isTrueResult && ' ✨(本物!)'}
            </>
          )}
        </div>
      );
    }

    if (nightResult.type === 'wait') {
      return (
        <div className="info-box">
          <strong>【夜の結果】</strong><br />
          あなたの役職には夜の能力がありません
        </div>
      );
    }

    return null;
  };

  const rolesList = getRolesList();

  return (
    <div className="container">
      <h1>🌅 昼フェーズ</h1>
      <h2>議論時間</h2>

      {/* タイマー表示 */}
      <div className={`timer-display ${getTimerColor()}`}>
        <span className="timer-icon">⏱️</span>
        <span className="timer-text">{formatTime(timeLeft)}</span>
      </div>

      <div className="success-box">
        <strong>朝になりました!</strong><br />
        議論して人狼を見つけましょう!
      </div>

      {/* 夜の結果を表示 */}
      {renderNightResult()}

      {/* 役職一覧を表示（クリックで詳細） */}
      {rolesList && (
        <div className="roles-list-box">
          <strong>🎴 使用中の役職:</strong>
          <div className="roles-chips">
            {rolesList.map(({ role, name, count }) => (
              <button
                key={role}
                className="role-chip"
                onClick={() => setSelectedRoleForModal(role)}
                title="クリックで詳細を表示"
              >
                {name}×{count}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`card ${role.color}`} onClick={() => setSelectedRoleForModal(myFinalRole)}>
        {role.name}
      </div>

      <div className="info-box">
        <strong>あなたの役職:</strong> {role.name}<br />
        <strong>陣営:</strong> {role.team}<br />
        <strong>勝利条件:</strong> {getWinCondition()}
      </div>

      {/* 投票 */}
      <h2>🗳️ 投票</h2>

      {!hasVoted ? (
        <>
          <div className="info-box">
            処刑したいプレイヤーを1人選んでください<br />
            ※自分には投票できません
          </div>

          <div className="vote-grid">
            {otherPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedTarget(player.id)}
                className={selectedTarget === player.id ? 'selected' : ''}
              >
                {player.name}
              </button>
            ))}
            {/* 平和村ボタン (常に表示) */}
            <button
              onClick={() => setSelectedTarget('peace')}
              className={selectedTarget === 'peace' ? 'selected' : ''}
              style={{
                backgroundColor: selectedTarget === 'peace' ? '#4CAF50' : '#8BC34A',
                color: 'white'
              }}
            >
              🕊️ 平和村
            </button>
          </div>

          <button onClick={handleVote} disabled={!selectedTarget}>
            投票する
          </button>
        </>
      ) : (
        <div className="success-box">
          投票が完了しました!<br />
          全員の投票が終わるまでお待ちください...
        </div>
      )}

      {/* 役職説明モーダル */}
      {selectedRoleForModal && (
        <RoleModal
          role={selectedRoleForModal}
          onClose={() => setSelectedRoleForModal(null)}
        />
      )}
    </div>
  );
}

export default DiscussionPhase;