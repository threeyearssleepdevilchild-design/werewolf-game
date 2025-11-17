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

function DiscussionPhase({ playerId, roomId, players, myFinalRole }) {
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

  return (
    <div className="container">
      <h1>🌅 昼フェーズ</h1>
      <h2>議論時間</h2>

      <div className="success-box">
        <strong>朝になりました!</strong><br />
        議論して人狼を見つけましょう!
      </div>

      <div className={`card ${role.color}`}>{role.name}</div>

      <div className="info-box">
        <strong>あなたの役職:</strong> {role.name}<br />
        <strong>陣営:</strong> {role.team}<br />
        <strong>勝利条件:</strong> {getWinCondition()}
      </div>

      <div className="warning-box">
        <strong>⏰ 議論時間: 3〜5分</strong><br />
        ・自分の役職や情報を共有しましょう<br />
        ・嘘をついても構いません<br />
        ・矛盾を見つけて推理しましょう
      </div>

      {/* ④議論フェーズで投票 */}
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