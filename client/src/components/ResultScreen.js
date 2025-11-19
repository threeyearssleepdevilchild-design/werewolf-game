import React, { useState } from 'react';
import './ResultScreen.css';

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

function ResultScreen({ results, onReturnToLobby, nightActions }) {
  const [showNightActions, setShowNightActions] = useState(false);

  if (!results) {
    return (
      <div className="container">
        <h1>📊 ゲーム結果</h1>
        <div className="info-box">結果を集計中...</div>
      </div>
    );
  }

  const getResultMessage = () => {
    if (results.resultType === 'hanged_win') {
      return {
        type: 'info',
        emoji: '🎭',
        message: '吊人の単独勝利!',
        detail: '吊人が処刑されました!'
      };
    } else if (results.resultType === 'peace') {
      return {
        type: 'success',
        emoji: '🕊️',
        message: '平和村!',
        detail: '全員が平和村に投票しました。誰も処刑されません!'
      };
    } else if (results.resultType === 'peace_executed') {
      return {
        type: 'info',
        emoji: '🕊️',
        message: '平和村 (処刑あり)',
        detail: '人狼はいませんでした。処刑された人の勝利!'
      };
    } else if (results.resultType === 'villager_win') {
      return {
        type: 'success',
        emoji: '🎉',
        message: '村人陣営の勝利!',
        detail: '人狼を処刑できました!'
      };
    } else {
      return {
        type: 'error',
        emoji: '🐺',
        message: '人狼陣営の勝利!',
        detail: '人狼は処刑されませんでした!'
      };
    }
  };

  const resultMessage = getResultMessage();
  const isWinner = (playerId) => {
    return results.winners.some(w => w.id === playerId);
  };

  // 最大得票数を取得
  const maxVotes = Math.max(...Object.values(results.voteCounts), 0);

  return (
    <div className="container result-container">
      {/* 勝利演出 */}
      <div className={`result-banner ${resultMessage.type}`}>
        <div className="result-emoji">{resultMessage.emoji}</div>
        <h1 className="result-title">{resultMessage.message}</h1>
        <p className="result-detail">{resultMessage.detail}</p>
      </div>

      {/* 勝者リスト */}
      <div className="winners-section">
        <h2>🏆 勝利プレイヤー</h2>
        <div className="winners-grid">
          {results.winners.map((winner) => (
            <div key={winner.id} className="winner-card">
              <div className="winner-name">{winner.name}</div>
              <div className="winner-role">{roleInfo[winner.finalRole].name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 投票結果グラフ */}
      <div className="vote-chart-section">
        <h2>📊 投票結果</h2>
        <div className="vote-chart">
          {results.players.map((player) => {
            const votes = results.voteCounts[player.id] || 0;
            const wasExecuted = results.executed.some(e => e.id === player.id);
            const percentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;

            return (
              <div key={player.id} className="vote-bar-container">
                <div className="vote-bar-label">
                  {player.name}
                  {wasExecuted && ' 💀'}
                </div>
                <div className="vote-bar-wrapper">
                  <div 
                    className={`vote-bar ${wasExecuted ? 'executed' : ''}`}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="vote-bar-text">{votes}票</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 投票詳細 */}
      {results.voteDetails && results.voteDetails.length > 0 && (
        <div className="vote-details-section">
          <h2>🗳️ 投票詳細</h2>
          <div className="vote-details-grid">
            {results.voteDetails.map((vote, index) => (
              <div key={index} className="vote-detail-item">
                <span className="voter">{vote.voterName}</span>
                <span className="vote-arrow">→</span>
                <span className="target">{vote.targetName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 夜フェーズの行動履歴 */}
      {nightActions && nightActions.length > 0 && (
        <div className="night-actions-section">
          <button 
            className="night-actions-toggle"
            onClick={() => setShowNightActions(!showNightActions)}
          >
            🌙 夜フェーズの行動を{showNightActions ? '隠す' : '見る'}
          </button>
          
          {showNightActions && (
            <div className="night-actions-list">
              {nightActions.map((action, index) => (
                <div key={index} className="night-action-item">
                  <strong>{action.playerName}</strong> ({roleInfo[action.role].name}): {action.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* プレイヤー詳細テーブル */}
      <div className="player-table-section">
        <h2>👥 プレイヤー詳細</h2>
        <table className="result-table">
          <thead>
            <tr>
              <th>プレイヤー</th>
              <th>初期役職</th>
              <th>最終役職</th>
              <th>得票数</th>
              <th>結果</th>
            </tr>
          </thead>
          <tbody>
            {results.players.map((player) => {
              const votes = results.voteCounts[player.id] || 0;
              const wasExecuted = results.executed.some(e => e.id === player.id);
              const won = isWinner(player.id);

              return (
                <tr key={player.id} className={won ? 'winner' : 'loser'}>
                  <td>{player.name}</td>
                  <td>{roleInfo[player.initialRole].name}</td>
                  <td>{roleInfo[player.finalRole].name}</td>
                  <td>{votes}票 {wasExecuted && '💀'}</td>
                  <td>{won ? '勝利 🎉' : '敗北'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 再試合ボタン */}
      <div className="result-actions">
        <button 
          onClick={onReturnToLobby}
          className="return-lobby-btn"
        >
          ⚙️ 役職を調整して再試合
        </button>
      </div>
    </div>
  );
}

export default ResultScreen;