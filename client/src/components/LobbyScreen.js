import React from 'react';

function LobbyScreen({ roomData, isHost, onShowRoleConfig }) {
  return (
    <div className="container">
      <h1>🌙 ワンナイト人狼オリジナル版</h1>
      
      <h2>ロビー - プレイヤー募集中</h2>

      <div className="success-box">
        <strong>ルームID: {roomData.roomId}</strong><br />
        このIDを友達に教えて参加してもらいましょう!
      </div>

      <div className="player-list">
        <h3>参加者 ({roomData.players.length}人)</h3>
        {roomData.players.map((player) => (
          <div key={player.id} className="player-item">
            <span>
              {player.name} {player.isHost && '👑'}
            </span>
          </div>
        ))}
      </div>

      {isHost ? (
        <>
          <button onClick={onShowRoleConfig}>役職を設定する</button>
          <div className="info-box">
            <strong>ℹ️ ホストの権限</strong><br />
            役職を設定してゲームを開始できます
          </div>
        </>
      ) : (
        <div className="info-box">
          <strong>ℹ️ 待機中</strong><br />
          ホストがゲームを開始するまでお待ちください...
        </div>
      )}

      <div className="warning-box">
        <strong>📋 推奨人数: 5〜8人</strong><br />
        現在 {roomData.players.length} 人が参加中
        {roomData.players.length < 5 && ' (5人以上推奨)'}
      </div>
    </div>
  );
}

export default LobbyScreen;
