import React, { useState } from 'react';
import socket from '../socket';

function VotingPhase({ playerId, roomId, players }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = () => {
    if (!selectedTarget) {
      alert('投票先を選んでください');
      return;
    }

    socket.emit('vote', { roomId, playerId, targetId: selectedTarget });
    setHasVoted(true);
  };

  if (hasVoted) {
    return (
      <div className="container">
        <h1>🗳️ 投票フェーズ</h1>
        <h2>投票完了</h2>

        <div className="success-box">
          投票が完了しました!<br />
          全員の投票が終わるまでお待ちください...
        </div>
      </div>
    );
  }

  // 自分以外のプレイヤー（②自分への投票禁止）
  const otherPlayers = players.filter(p => p.id !== playerId);

  return (
    <div className="container">
      <h1>🗳️ 投票フェーズ</h1>
      <h2>処刑したいプレイヤーを選択</h2>

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
              opacity: selectedTarget === player.id ? 1 : 0.6
            }}
          >
            {player.name}
          </button>
        ))}
      </div>

      <button onClick={handleVote} disabled={!selectedTarget}>
        投票する
      </button>
    </div>
  );
}

export default VotingPhase;