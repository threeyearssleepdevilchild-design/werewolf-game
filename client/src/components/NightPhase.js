import React, { useState, useEffect } from 'react';
import socket from '../socket';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営', color: 'werewolf', description: '仲間を確認' },
  villager: { name: '村人', team: '村人陣営', color: 'villager', description: '能力なし' },
  fortune_teller: { name: '占い師', team: '村人陣営', color: 'detective', description: 'プレイヤー1人または中央カード2枚を見る' },
  thief: { name: '怪盗', team: '村人陣営', color: 'thief', description: 'プレイヤー1人とカードを交換' },
  police: { name: '警察', team: '村人陣営', color: 'police', description: 'プレイヤー1人の能力を封じる' },
  madman: { name: '狂人', team: '人狼陣営', color: 'madman', description: '人狼陣営だが人狼を知らない' },
  medium: { name: '審神者', team: '村人陣営', color: 'medium', description: 'プレイヤー1人の陣営を調査' },
  fool: { name: 'ばか', team: '村人陣営', color: 'fool', description: 'ランダムな役職を演じ偽情報を得る' },
  gravekeeper: { name: '墓守', team: '村人陣営', color: 'gravekeeper', description: '中央カード1枚を見て交換可能' },
  witch: { name: '魔女っ子', team: '村人陣営', color: 'witch', description: 'プレイヤー1人の初期役職を調査' },
  hanged: { name: '吊人', team: '第三陣営', color: 'hanged', description: '処刑されたら勝利' }
};

function NightPhase({ playerId, roomId, myRole, roomData, gameRoles, onComplete }) {
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

  if (phase === 'role') {
    return (
      <div className="container">
        <h1>🌙 夜フェーズ</h1>
        <h2>あなたの役職</h2>

        {gameRoles && (
          <div className="info-box" style={{ backgroundColor: '#f0f0f0', borderLeft: '4px solid #666' }}>
            <strong>使用中の役職:</strong><br />
            {getRolesList()}
          </div>
        )}

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

        <div className="info-box">
          結果を確認しました。<br />
          まもなく朝になります...
        </div>

        {actionResult && actionResult.type === 'sealed' && (
          <div className="warning-box">
            ⚠️ 警察によってあなたの能力が封じられました
          </div>
        )}

        {actionResult && actionResult.type === 'werewolf' && actionResult.subtype === 'alone' && (
          <div className="info-box">
            <strong>🐺 仲間はいませんでした</strong>
          </div>
        )}
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

// 占い師の行動コンポーネント
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

// 墓守の行動コンポーネント（完全2段階処理版）
function GravekeeperAction({ roomId, playerId }) {
  const [phase, setPhase] = useState('select');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [viewedCard, setViewedCard] = useState(null);

  useEffect(() => {
    // 墓守専用の結果を受信
    socket.on('gravekeeperViewResult', (result) => {
      console.log('墓守の閲覧結果:', result);
      
      if (result.type === 'sealed') {
        setPhase('sealed');
      } else if (result.type === 'success') {
        setViewedCard(result.card);
        setSelectedIndex(result.centerIndex);
        setPhase('confirm');
      }
    });

    return () => {
      socket.off('gravekeeperViewResult');
    };
  }, []);

  const viewCard = (index) => {
    setSelectedIndex(index);
    setPhase('loading');
    
    // サーバーに「見る」リクエスト（完了扱いにしない）
    socket.emit('gravekeeperView', {
      roomId,
      playerId,
      centerIndex: index
    });
  };

  const swapCard = () => {
    // 交換を選択して完了
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter', centerIndex: selectedIndex, shouldSwap: true }
    });
  };

  const skipSwap = () => {
    // 交換しないで完了
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter', centerIndex: selectedIndex, shouldSwap: false }
    });
  };

  const skipAll = () => {
    // 何も見ないで完了
    socket.emit('submitNightAction', {
      roomId,
      playerId,
      action: { type: 'viewCenter' }
    });
  };

  if (phase === 'sealed') {
    return (
      <div>
        <div className="warning-box">
          ⚠️ 警察によってあなたの能力が封じられました。<br />
          中央カードを見ることができません。
        </div>
        <button onClick={() => {
          socket.emit('submitNightAction', {
            roomId,
            playerId,
            action: { type: 'viewCenter' }
          });
        }}>
          確認
        </button>
      </div>
    );
  }

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

  if (phase === 'loading') {
    return (
      <div>
        <div className="info-box">
          中央カード{selectedIndex + 1}枚目を確認中...
        </div>
      </div>
    );
  }

  if (phase === 'confirm' && viewedCard) {
    return (
      <div>
        <div className="info-box" style={{ backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', padding: '15px' }}>
          <strong>中央カード{selectedIndex + 1}枚目：</strong><br />
          <div className={`card ${roleInfo[viewedCard]?.color || 'villager'}`} style={{ display: 'inline-block', margin: '10px 0', padding: '10px 20px', fontSize: '18px' }}>
            {roleInfo[viewedCard]?.name || viewedCard}
          </div>
        </div>

        <div className="info-box">
          自分のカードと交換しますか?
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

  return null;
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