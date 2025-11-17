import React from 'react';

const roleInfo = {
  werewolf: { name: '人狼' },
  villager: { name: '村人' },
  detective: { name: '探偵' },
  thief: { name: '怪盗' },
  police: { name: '警察' },
  madman: { name: '狂人' }
};

function ResultScreen({ results, onReset, onRematch, onReturnToLobby }) {
  if (!results) {
    return (
      <div className="container">
        <h1>📊 ゲーム結果</h1>
        <div className="info-box">結果を集計中...</div>
      </div>
    );
  }

  const getResultMessage = () => {
    if (results.resultType === 'peace') {
      return {
        type: 'success',
        message: '🕊️ 平和村!',
        detail: '人狼はいませんでした。村人陣営の勝利!'
      };
    } else if (results.resultType === 'villager_win') {
      return {
        type: 'success',
        message: '🎉 村人陣営の勝利!',
        detail: '人狼を処刑できました!'
      };
    } else {
      return {
        type: 'error',
        message: '🐺 人狼陣営の勝利!',
        detail: '人狼は処刑されませんでした!'
      };
    }
  };

  const resultMessage = getResultMessage();
  const isWinner = (playerId) => {
    return results.winners.some(w => w.id === playerId);
  };

  return (
    <div className="container">
      <h1>📊 ゲーム結果</h1>

      <div className={`${resultMessage.type}-box`}>
        <strong>{resultMessage.message}</strong><br />
        {resultMessage.detail}
      </div>

      {/* ③投票詳細表示 */}
      {results.voteDetails && results.voteDetails.length > 0 && (
        <>
          <h2>投票詳細</h2>
          <div className="info-box">
            {results.voteDetails.map((vote, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {vote.voterName} → {vote.targetName}
              </div>
            ))}
          </div>
        </>
      )}

      <h2>結果詳細</h2>

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

      {/* ①再試合ボタン (3種類) */}
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={onRematch} 
          style={{ 
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px'
          }}
        >
          🔄 同じ設定でもう一度
        </button>
        <button 
          onClick={onReturnToLobby}
          style={{ 
            marginRight: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '10px 20px'
          }}
        >
          ⚙️ 役職を調整して再試合
        </button>
        <button 
          onClick={onReset}
          style={{ 
            backgroundColor: '#f44336',
            color: 'white',
            padding: '10px 20px'
          }}
        >
          🏠 ホームに戻る
        </button>
      </div>
    </div>
  );
}

export default ResultScreen;