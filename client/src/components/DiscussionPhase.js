import React, { useState } from 'react';
import socket from '../socket';

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

function DiscussionPhase({ playerId, roomId, players, myFinalRole, nightResult, gameRoles }) {
  const role = roleInfo[myFinalRole];
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const otherPlayers = players.filter(p => p.id !== playerId);

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
        rolesList.push(`${roleInfo[role].name}×${gameRoles[role]}`);
      }
    }
    return rolesList.join(', ');
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

  return (
    <div className="container">
      <h1>🌅 昼フェーズ</h1>
      <h2>議論時間</h2>

      <div className="success-box">
        <strong>朝になりました!</strong><br />
        議論して人狼を見つけましょう!
      </div>

      {/* 夜の結果を表示 */}
      {renderNightResult()}

      {/* 役職一覧を表示 */}
      {gameRoles && (
        <div className="info-box" style={{ backgroundColor: '#f0f0f0', borderLeft: '4px solid #666' }}>
          <strong>使用中の役職:</strong><br />
          {getRolesList()}
        </div>
      )}

      <div className={`card ${role.color}`}>{role.name}</div>

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
                style={{
                  opacity: selectedTarget === player.id ? 1 : 0.6,
                  margin: '5px',
                  padding: '10px 20px'
                }}
              >
                {player.name}
              </button>
            ))}
            {/* 平和村ボタン (常に表示) */}
            <button
              onClick={() => setSelectedTarget('peace')}
              className={selectedTarget === 'peace' ? 'selected' : ''}
              style={{
                opacity: selectedTarget === 'peace' ? 1 : 0.6,
                margin: '5px',
                padding: '10px 20px',
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
    </div>
  );
}

export default DiscussionPhase;