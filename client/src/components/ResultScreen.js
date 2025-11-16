import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: { name: '人狼' },
  villager: { name: '村人' },
  detective: { name: '探偵' },
  thief: { name: '怪盗' },
  police: { name: '警察' },
  madman: { name: '狂人' }
};

function ResultScreen({ onReset }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    socket.on('gameResults', (data) => {
      console.log('結果受信:', data);
      setResults(data);
    });

    return () => {
      socket.off('gameResults');
    };
  }, []);

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

      <button onClick={onReset}>新しいゲームを始める</button>
    </div>
  );
}

export default ResultScreen;
