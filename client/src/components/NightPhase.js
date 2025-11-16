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

function NightPhase({ playerId, roomId, myRole, onComplete }) {
  const [phase, setPhase] = useState('role'); // role, action, sealed, complete
  const [isSealed, setIsSealed] = useState(false);
  const [actionData, setActionData] = useState(null);

  const role = roleInfo[myRole];

  useEffect(() => {
    socket.on('sealed', () => {
      setIsSealed(true);
      setPhase('sealed');
    });

    socket.on('werewolfInfo', (info) => {
      setActionData(info);
    });

    socket.on('detectiveResult', (result) => {
      setActionData(result);
    });

    socket.on('thiefResult', (result) => {
      setActionData(result);
      alert(`カードを交換しました!\n新しい役職: ${roleInfo[result.newRole].name}`);
    });

    return () => {
      socket.off('sealed');
      socket.off('werewolfInfo');
      socket.off('detectiveResult');
      socket.off('thiefResult');
    };
  }, []);

  const startAction = () => {
    if (myRole === 'villager' || myRole === 'madman') {
      setPhase('complete');
    } else {
      setPhase('action');
      
      if (myRole === 'werewolf') {
        socket.emit('getWerewolfInfo', { roomId, playerId });
      }
    }
  };

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

  if (phase === 'complete') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>待機中</h2>

        <div className="info-box">
          {myRole === 'villager' || myRole === 'madman' ? (
            <>あなたの役職には夜の能力がありません。<br />朝まで待機してください。</>
          ) : (
            <>能力の使用が完了しました。<br />朝まで待機してください。</>
          )}
        </div>

        <button onClick={onComplete}>待機する</button>
      </div>
    );
  }

  // アクション画面
  return (
    <div className="container">
      <h1>🌙 夜フェーズ</h1>
      <h2>{role.name}の行動</h2>

      {myRole === 'police' && <PoliceAction roomId={roomId} playerId={playerId} onComplete={() => setPhase('complete')} />}
      {myRole === 'werewolf' && <WerewolfAction actionData={actionData} onComplete={() => setPhase('complete')} />}
      {myRole === 'detective' && <DetectiveAction roomId={roomId} playerId={playerId} actionData={actionData} setActionData={setActionData} onComplete={() => setPhase('complete')} />}
      {myRole === 'thief' && <ThiefAction roomId={roomId} playerId={playerId} onComplete={() => setPhase('complete')} />}
    </div>
  );
}

// 警察の行動コンポーネント
function PoliceAction({ roomId, playerId, onComplete }) {
  const [players, setPlayers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);

  useEffect(() => {
    // ルームデータから他のプレイヤーを取得（実際にはsocketから取得）
    // 簡易実装のため、グローバルステートから取得する必要がある
    // ここでは仮の実装
  }, []);

  const executeAction = () => {
    if (!selectedTarget) return;
    socket.emit('policeAction', { roomId, targetId: selectedTarget });
    onComplete();
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んで、その人の能力を封じてください。
      </div>
      
      {/* プレイヤー選択UI - 実際にはpropsで渡す必要あり */}
      
      <button onClick={executeAction} disabled={!selectedTarget}>
        能力を封じる
      </button>
    </div>
  );
}

// 人狼の行動コンポーネント
function WerewolfAction({ actionData, onComplete }) {
  if (!actionData) {
    return <div className="info-box">情報を読み込み中...</div>;
  }

  return (
    <div>
      {actionData.type === 'multiple' && (
        <div className="info-box">
          <strong>🐺 仲間の人狼:</strong><br />
          {actionData.werewolves.map(w => w.name).join(', ')}
        </div>
      )}

      {actionData.type === 'alone' && (
        <div className="info-box">
          <strong>🃏 中央カード1枚目:</strong><br />
          {roleInfo[actionData.centerCard].name}
        </div>
      )}

      <button onClick={onComplete}>確認</button>
    </div>
  );
}

// 探偵の行動コンポーネント
function DetectiveAction({ roomId, playerId, actionData, setActionData, onComplete }) {
  const [choice, setChoice] = useState(null);

  const checkPlayer = (targetId) => {
    socket.emit('detectiveCheckPlayer', { roomId, targetId });
  };

  const checkCenter = () => {
    socket.emit('detectiveCheckCenter', { roomId });
  };

  if (actionData) {
    return (
      <div>
        {actionData.type === 'player' && (
          <div className="info-box">
            <strong>{actionData.playerName}の役職:</strong> {roleInfo[actionData.role].name}
          </div>
        )}

        {actionData.type === 'center' && (
          <div className="info-box">
            <strong>🃏 中央カード2枚:</strong><br />
            1枚目: {roleInfo[actionData.cards[0]].name}<br />
            2枚目: {roleInfo[actionData.cards[1]].name}
          </div>
        )}

        <button onClick={onComplete}>確認</button>
      </div>
    );
  }

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を調べるか、中央カード2枚を見るか選んでください。
      </div>

      <div className="action-buttons">
        <button onClick={() => setChoice('player')}>プレイヤーを調べる</button>
        <button onClick={checkCenter}>中央カードを見る</button>
      </div>

      {choice === 'player' && (
        <div>
          {/* プレイヤー選択UI */}
        </div>
      )}
    </div>
  );
}

// 怪盗の行動コンポーネント
function ThiefAction({ roomId, playerId, onComplete }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const executeAction = () => {
    if (!selectedTarget) return;
    socket.emit('thiefAction', { roomId, playerId, targetId: selectedTarget });
    onComplete();
  };

  const skipAction = () => {
    onComplete();
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んでカードを交換してください。<br />
        交換しないことも選べます。
      </div>

      {/* プレイヤー選択UI */}

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
