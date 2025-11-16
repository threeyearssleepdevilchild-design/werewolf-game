import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: {
    name: '人狼',
    team: '人狼陣営',
    description: '人狼同士で互いを認識できます。1人だけの場合は中央カード1枚を見られます。',
    color: 'werewolf'
  },
  villager: {
    name: '村人',
    team: '村人陣営',
    description: '特殊能力はありません。議論で人狼を見つけましょう。',
    color: 'villager'
  },
  detective: {
    name: '探偵',
    team: '村人陣営',
    description: 'プレイヤー1人を調べるか、中央カード2枚を見ることができます。',
    color: 'detective'
  },
  thief: {
    name: '怪盗',
    team: '村人陣営',
    description: 'プレイヤー1人とカードを交換できます。新しい役職を確認できます。',
    color: 'thief'
  },
  police: {
    name: '警察',
    team: '村人陣営',
    description: 'プレイヤー1人の能力を封じることができます。',
    color: 'police'
  },
  madman: {
    name: '狂人',
    team: '人狼陣営',
    description: '人狼陣営ですが、誰が人狼か分かりません。人狼が処刑されないよう行動しましょう。',
    color: 'madman'
  }
};

function NightPhase({ playerId, roomId, myRole, roomData, onComplete }) {
  const [phase, setPhase] = useState('role'); // role, action, waiting, result
  const [actionResult, setActionResult] = useState(null);
  const [waitingInfo, setWaitingInfo] = useState(null);

  const role = roleInfo[myRole];

  useEffect(() => {
    // 夜行動の結果を受信
    socket.on('nightResult', (result) => {
      console.log('夜行動の結果を受信:', result);
      setActionResult(result);
      setPhase('result');
    });

    // 他のプレイヤー待ち
    socket.on('waitingForOthers', (info) => {
      console.log('他のプレイヤーを待機中:', info);
      setWaitingInfo(info);
      setPhase('waiting');
    });

    return () => {
      socket.off('nightResult');
      socket.off('waitingForOthers');
    };
  }, []);

  const startAction = () => {
    if (myRole === 'villager' || myRole === 'madman') {
      // 能力なし - すぐに完了
      socket.emit('submitNightAction', {
        roomId,
        playerId,
        action: { type: 'none' }
      });
      setPhase('waiting');
    } else {
      setPhase('action');
    }
  };

  // 役職カード表示画面
  if (phase === 'role') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>あなたの役職</h2>

        <div className={`card ${role.color}`}>{role.name}</div>

        <div className="info-box">
          <strong>陣営:</strong> {role.team}<br />
          <strong>説明:</strong> {role.description}
        </div>

        <button onClick={startAction}>能力を使う</button>
      </div>
    );
  }

  if (phase === 'sealed') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>能力封じられました</h2>

        <div className="warning-box">
          ⚠️ 警察によってあなたの能力が封じられました<br />
          今夜は何もできません
        </div>

        <button onClick={onComplete}>確認</button>
      </div>
    );
  }

  // 待機画面
  if (phase === 'waiting') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>他のプレイヤーを待っています...</h2>

        <div className="info-box">
          {waitingInfo && (
            <>
              完了: {waitingInfo.completedCount} / {waitingInfo.totalCount} 人<br />
            </>
          )}
          全員が能力の行使を完了するまでお待ちください
        </div>
      </div>
    );
  }

  // 結果画面
  if (phase === 'result') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>夜の結果</h2>

        {actionResult && actionResult.type === 'sealed' && (
          <div className="warning-box">
            ⚠️ 警察によってあなたの能力が封じられました
          </div>
        )}

        {actionResult && actionResult.type === 'police' && (
          <div className="success-box">
            {actionResult.sealed 
              ? '能力を封じました'
              : '今夜は能力を封じませんでした'}
          </div>
        )}

        {actionResult && actionResult.type === 'werewolf' && (
          <div className="info-box">
            {actionResult.subtype === 'multiple' && (
              <>
                <strong>🐺 仲間の人狼:</strong><br />
                {actionResult.werewolves.map(w => w.name).join(', ')}
              </>
            )}
            {actionResult.subtype === 'alone' && (
              <>
                <strong>🃏 中央カード1枚目:</strong><br />
                {roleInfo[actionResult.centerCard].name}
              </>
            )}
          </div>
        )}

        {actionResult && actionResult.type === 'detective' && (
          <div className="info-box">
            {actionResult.subtype === 'player' && (
              <>
                <strong>{actionResult.playerName}の役職:</strong><br />
                {roleInfo[actionResult.role].name}
              </>
            )}
            {actionResult.subtype === 'center' && (
              <>
                <strong>🃏 中央カード2枚:</strong><br />
                1枚目: {roleInfo[actionResult.cards[0]].name}<br />
                2枚目: {roleInfo[actionResult.cards[1]].name}
              </>
            )}
          </div>
        )}

        {actionResult && actionResult.type === 'thief' && (
          <div className="info-box">
            {actionResult.swapped ? (
              <>
                <strong>カードを交換しました!</strong><br />
                新しい役職: {roleInfo[actionResult.newRole].name}
              </>
            ) : (
              '今夜は交換しませんでした'
            )}
          </div>
        )}

        {actionResult && actionResult.type === 'wait' && (
          <div className="info-box">
            あなたの役職には夜の能力がありません。<br />
            朝まで待機してください。
          </div>
        )}

        <button onClick={onComplete}>議論フェーズへ</button>
      </div>
    );
  }

  // アクション画面
  return (
    <div className="container">
      <h1>🌙 夜フェーズ</h1>
      <h2>{role.name}の行動</h2>

      {myRole === 'police' && <PoliceAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'werewolf' && <WerewolfAction roomId={roomId} playerId={playerId} />}
      {myRole === 'detective' && <DetectiveAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'thief' && <ThiefAction roomId={roomId} playerId={playerId} roomData={roomData} />}
    </div>
  );
}

// 警察の行動コンポーネント
function PoliceAction({ roomId, playerId, roomData }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  // 自分以外のプレイヤーを取得
  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    // 新しい方式: submitNightAction で送信
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'seal', targetId: selectedTarget }
    });
  };

  const skipAction = () => {
    // 封じない
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'seal', targetId: null }
    });
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んで、その人の能力を封じてください。
      </div>
      
      <div className="player-list">
        {otherPlayers.map((player) => (
          <div 
            key={player.id} 
            className={`player-item ${selectedTarget === player.id ? 'selected' : ''}`}
            onClick={() => setSelectedTarget(player.id)}
            style={{ cursor: 'pointer', padding: '10px', margin: '5px', border: selectedTarget === player.id ? '2px solid blue' : '1px solid gray' }}
          >
            {player.name}
          </div>
        ))}
      </div>
      
      <button onClick={executeAction} disabled={!selectedTarget}>
        能力を封じる
      </button>
      <button onClick={skipAction} className="secondary">
        封じない
      </button>
    </div>
  );
}

// 人狼の行動コンポーネント
function WerewolfAction({ roomId, playerId }) {
  const handleComplete = () => {
    // 人狼は自動で処理されるので、完了を送信するだけ
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'werewolf' }
    });
  };

  return (
    <div>
      <div className="info-box">
        能力を確認します...
      </div>
      <button onClick={handleComplete}>確認</button>
    </div>
  );
}

// 探偵の行動コンポーネント
function DetectiveAction({ roomId, playerId, roomData }) {
  const [choice, setChoice] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // 自分以外のプレイヤーを取得
  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const checkPlayer = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    // 新しい方式: submitNightAction で送信
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'checkPlayer', targetId: selectedTarget }
    });
  };

  const checkCenter = () => {
    // 新しい方式: submitNightAction で送信
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'checkCenter' }
    });
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を調べるか、中央カード2枚を見るか選んでください。
      </div>

      {!choice && (
        <div className="action-buttons">
          <button onClick={() => setChoice('player')}>プレイヤーを調べる</button>
          <button onClick={checkCenter}>中央カードを見る</button>
        </div>
      )}

      {choice === 'player' && (
        <div>
          <h3>調べるプレイヤーを選択:</h3>
          <div className="player-list">
            {otherPlayers.map((player) => (
              <div 
                key={player.id} 
                className={`player-item ${selectedTarget === player.id ? 'selected' : ''}`}
                onClick={() => setSelectedTarget(player.id)}
                style={{ cursor: 'pointer', padding: '10px', margin: '5px', border: selectedTarget === player.id ? '2px solid blue' : '1px solid gray' }}
              >
                {player.name}
              </div>
            ))}
          </div>
          <button onClick={checkPlayer} disabled={!selectedTarget}>
            調べる
          </button>
          <button onClick={() => setChoice(null)} className="secondary">
            戻る
          </button>
        </div>
      )}
    </div>
  );
}

// 怪盗の行動コンポーネント
function ThiefAction({ roomId, playerId, roomData }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  // 自分以外のプレイヤーを取得
  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    // 新しい方式: submitNightAction で送信
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'swap', targetId: selectedTarget }
    });
  };

  const skipAction = () => {
    // 交換しない
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'swap', targetId: null }
    });
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んでカードを交換してください。<br />
        交換しないことも選べます。
      </div>

      <div className="player-list">
        {otherPlayers.map((player) => (
          <div 
            key={player.id} 
            className={`player-item ${selectedTarget === player.id ? 'selected' : ''}`}
            onClick={() => setSelectedTarget(player.id)}
            style={{ cursor: 'pointer', padding: '10px', margin: '5px', border: selectedTarget === player.id ? '2px solid blue' : '1px solid gray' }}
          >
            {player.name}
          </div>
        ))}
      </div>

      <div className="action-buttons">
        <button onClick={executeAction} disabled={!selectedTarget}>
          交換する
        </button>
        <button onClick={skipAction} className="secondary">
          交換しない
        </button>
      </div>
    </div>
  );
}

export default NightPhase;