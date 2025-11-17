import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営', color: 'werewolf', description: '仲間を確認し、村人を騙す' },
  villager: { name: '村人', team: '村人陣営', color: 'villager', description: '能力はないが、推理で人狼を見つけ出す' },
  fortune_teller: { name: '占い師', team: '村人陣営', color: 'detective', description: 'プレイヤー1人または中央カード2枚を見る' },
  thief: { name: '怪盗', team: '村人陣営', color: 'thief', description: 'プレイヤー1人とカードを交換できる' },
  police: { name: '警察', team: '村人陣営', color: 'police', description: 'プレイヤー1人の能力を封じる' },
  madman: { name: '狂人', team: '人狼陣営', color: 'madman', description: '人狼陣営だが人狼を知らない' },
  medium: { name: '審神者', team: '村人陣営', color: 'medium', description: 'プレイヤー1人の陣営を調査する' },
  fool: { name: 'ばか', team: '村人陣営', color: 'fool', description: 'ランダムな役職を演じ、偽情報を得る' },
  gravekeeper: { name: '墓守', team: '村人陣営', color: 'gravekeeper', description: '中央カード1枚を見て交換できる' },
  witch: { name: '魔女っ子', team: '村人陣営', color: 'witch', description: 'プレイヤー1人の初期役職を調査' },
  hanged: { name: '吊人', team: '第三陣営', color: 'hanged', description: '処刑されたら勝利' }
};

function NightPhase({ playerId, roomId, myRole, roomData, onComplete }) {
  const [phase, setPhase] = useState('role');
  const [actionResult, setActionResult] = useState(null);
  const [waitingInfo, setWaitingInfo] = useState(null);

  const role = roleInfo[myRole];

  useEffect(() => {
    socket.on('nightResult', (result) => {
      console.log('夜行動の結果を受信:', result);
      setActionResult(result);
      setPhase('result');
    });

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
    if (myRole === 'villager' || myRole === 'madman' || myRole === 'hanged') {
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
              ? `${actionResult.targetId} の能力を封じました`
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

        {actionResult && actionResult.type === 'medium' && (
          <div className="info-box">
            <strong>{actionResult.playerName}の陣営:</strong><br />
            {actionResult.team}
          </div>
        )}

        {actionResult && actionResult.type === 'fortune_teller' && (
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

        {actionResult && actionResult.type === 'gravekeeper' && (
          <div className="info-box">
            {actionResult.viewed ? (
              <>
                <strong>中央カードを確認:</strong><br />
                {roleInfo[actionResult.card].name}<br />
                {actionResult.swapped && (
                  <>
                    <br /><strong>交換しました!</strong><br />
                    新しい役職: {roleInfo[actionResult.newRole].name}
                  </>
                )}
                {!actionResult.swapped && '交換しませんでした'}
              </>
            ) : (
              '今夜は中央カードを見ませんでした'
            )}
          </div>
        )}

        {actionResult && actionResult.type === 'witch' && (
          <div className="info-box">
            <strong>{actionResult.playerName}の初期役職:</strong><br />
            {roleInfo[actionResult.role].name}
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

  return (
    <div className="container">
      <h1>🌙 夜フェーズ</h1>
      <h2>{role.name}の行動</h2>

      {myRole === 'police' && <PoliceAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'werewolf' && <WerewolfAction roomId={roomId} playerId={playerId} />}
      {myRole === 'medium' && <MediumAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'fortune_teller' && <FortuneTellerAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'thief' && <ThiefAction roomId={roomId} playerId={playerId} roomData={roomData} />}
      {myRole === 'gravekeeper' && <GravekeeperAction roomId={roomId} playerId={playerId} />}
      {myRole === 'witch' && <WitchAction roomId={roomId} playerId={playerId} roomData={roomData} />}
    </div>
  );
}

// 警察の行動コンポーネント
function PoliceAction({ roomId, playerId, roomData }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'seal', targetId: selectedTarget }
    });
  };

  const skipAction = () => {
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

// 審神者の行動コンポーネント
function MediumAction({ roomId, playerId, roomData }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'checkTeam', targetId: selectedTarget }
    });
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んで、その人の陣営を調査してください。
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
        陣営を調査
      </button>
    </div>
  );
}

// 占い師の行動コンポーネント (旧・探偵)
function FortuneTellerAction({ roomId, playerId, roomData }) {
  const [choice, setChoice] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const checkPlayer = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'checkPlayer', targetId: selectedTarget }
    });
  };

  const checkCenter = () => {
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

  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'swap', targetId: selectedTarget }
    });
  };

  const skipAction = () => {
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

// 墓守の行動コンポーネント
function GravekeeperAction({ roomId, playerId }) {
  const [phase, setPhase] = useState('select'); // select, view
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [viewedCard, setViewedCard] = useState(null);

  const viewCard = (index) => {
    setSelectedIndex(index);
    setPhase('view');
    // サーバーには送らず、ローカルで表示だけ
  };

  const swapCard = () => {
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter', centerIndex: selectedIndex, shouldSwap: true }
    });
  };

  const skipSwap = () => {
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter', centerIndex: selectedIndex, shouldSwap: false }
    });
  };

  const skipAll = () => {
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter' }
    });
  };

  if (phase === 'select') {
    return (
      <div>
        <div className="info-box">
          中央カードを1枚選んで確認できます。<br />
          確認後、自分と交換するか選べます。
        </div>

        <div className="center-cards">
          <button onClick={() => viewCard(0)} style={{ margin: '10px', padding: '20px' }}>
            中央カード1枚目
          </button>
          <button onClick={() => viewCard(1)} style={{ margin: '10px', padding: '20px' }}>
            中央カード2枚目
          </button>
        </div>

        <button onClick={skipAll} className="secondary">
          見ない
        </button>
      </div>
    );
  }

  if (phase === 'view') {
    return (
      <div>
        <div className="info-box">
          中央カード{selectedIndex + 1}枚目を確認しました。<br />
          自分と交換しますか?
        </div>

        <div className="action-buttons">
          <button onClick={swapCard}>
            交換する
          </button>
          <button onClick={skipSwap} className="secondary">
            交換しない
          </button>
        </div>
      </div>
    );
  }
}

// 魔女っ子の行動コンポーネント
function WitchAction({ roomId, playerId, roomData }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const otherPlayers = roomData.players.filter(p => p.id !== playerId);

  const executeAction = () => {
    if (!selectedTarget) {
      alert('対象を選択してください');
      return;
    }
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'checkOriginal', targetId: selectedTarget }
    });
  };

  return (
    <div>
      <div className="info-box">
        プレイヤー1人を選んで、その人の初期役職を調査してください。<br />
        (怪盗で交換された後でも、元の役職が分かります)
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
        初期役職を調査
      </button>
    </div>
  );
}

export default NightPhase;