import React, { useState, useEffect } from 'react';
import socket from '../socket';
import './DiscussionPhase.css'; // 新しいCSS

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

function DiscussionPhase({ playerId, roomId, players, myFinalRole, nightResult, gameRoles }) {
  const role = roleInfo[myFinalRole];
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  
  // 議論メモ機能
  const [memos, setMemos] = useState({});
  const [memoInput, setMemoInput] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const otherPlayers = players.filter(p => p.id !== playerId);

  // ローカルストレージからメモを読み込み
  useEffect(() => {
    const savedMemos = localStorage.getItem(`werewolf_memos_${roomId}`);
    if (savedMemos) {
      try {
        setMemos(JSON.parse(savedMemos));
      } catch (e) {
        console.error('メモの読み込みエラー:', e);
      }
    }
  }, [roomId]);

  // メモを保存
  const saveMemo = (playerIdToSave, memo) => {
    const newMemos = {
      ...memos,
      [playerIdToSave]: memo
    };
    setMemos(newMemos);
    localStorage.setItem(`werewolf_memos_${roomId}`, JSON.stringify(newMemos));
  };

  // メモを追加
  const addMemo = () => {
    if (!selectedPlayer || !memoInput.trim()) return;
    
    const existingMemo = memos[selectedPlayer] || '';
    const newMemo = existingMemo 
      ? `${existingMemo}\n${memoInput.trim()}`
      : memoInput.trim();
    
    saveMemo(selectedPlayer, newMemo);
    setMemoInput('');
  };

  // メモをクリア
  const clearMemo = (playerIdToClear) => {
    const newMemos = { ...memos };
    delete newMemos[playerIdToClear];
    setMemos(newMemos);
    localStorage.setItem(`werewolf_memos_${roomId}`, JSON.stringify(newMemos));
  };

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

  // 夜の結果を表示
  const renderNightResult = () => {
    if (!nightResult) return null;

    if (nightResult.type === 'sealed') {
      return (
        <div className="warning-box">
          ⚠️ 警察によって能力が封じられました
        </div>
      );
    }

    if (nightResult.type === 'police') {
      return (
        <div className="info-box">
          <strong>【警察の結果】</strong><br />
          {nightResult.sealed 
            ? '能力を封じました'
            : '今夜は能力を封じませんでした'}
        </div>
      );
    }

    if (nightResult.type === 'werewolf') {
      if (nightResult.subtype === 'multiple') {
        return (
          <div className="info-box">
            <strong>【人狼の結果】</strong><br />
            仲間の人狼: {nightResult.werewolves.map(w => w.name).join(', ')}
          </div>
        );
      } else if (nightResult.subtype === 'alone') {
        return (
          <div className="info-box">
            <strong>【人狼の結果】</strong><br />
            仲間はいませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'medium') {
      return (
        <div className="info-box">
          <strong>【審神者の結果】</strong><br />
          {nightResult.playerName}の陣営: {nightResult.team}
        </div>
      );
    }

    if (nightResult.type === 'fortune_teller') {
      if (nightResult.subtype === 'player') {
        return (
          <div className="info-box">
            <strong>【占い師の結果】</strong><br />
            {nightResult.playerName}の役職: {roleInfo[nightResult.role].name}
          </div>
        );
      } else if (nightResult.subtype === 'center') {
        return (
          <div className="info-box">
            <strong>【占い師の結果】</strong><br />
            中央カード1枚目: {roleInfo[nightResult.cards[0]].name}<br />
            中央カード2枚目: {roleInfo[nightResult.cards[1]].name}
          </div>
        );
      }
    }

    if (nightResult.type === 'thief') {
      if (nightResult.swapped) {
        return (
          <div className="info-box">
            <strong>【怪盗の結果】</strong><br />
            カードを交換しました!<br />
            新しい役職: {roleInfo[nightResult.newRole].name}
          </div>
        );
      } else {
        return (
          <div className="info-box">
            <strong>【怪盗の結果】</strong><br />
            今夜は交換しませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'gravekeeper') {
      if (nightResult.viewed) {
        return (
          <div className="info-box">
            <strong>【墓守の結果】</strong><br />
            中央カードを確認: {roleInfo[nightResult.card].name}<br />
            {nightResult.swapped && (
              <>
                交換しました!<br />
                新しい役職: {roleInfo[nightResult.newRole].name}
              </>
            )}
            {!nightResult.swapped && '交換しませんでした'}
          </div>
        );
      } else {
        return (
          <div className="info-box">
            <strong>【墓守の結果】</strong><br />
            今夜は中央カードを見ませんでした
          </div>
        );
      }
    }

    if (nightResult.type === 'witch') {
      return (
        <div className="info-box">
          <strong>【魔女っ子の結果】</strong><br />
          {nightResult.playerName}の初期役職: {roleInfo[nightResult.role].name}
        </div>
      );
    }

    if (nightResult.type === 'wait') {
      return (
        <div className="info-box">
          <strong>【夜の結果】</strong><br />
          あなたの役職には夜の能力がありません
        </div>
      );
    }

    return null;
  };

  return (
    <div className="discussion-wrapper">
      {/* メインコンテンツ */}
      <div className="discussion-main">
        <div className="container">
          <h1>🌅 昼フェーズ</h1>
          <h2>議論時間</h2>

          <div className="success-box">
            <strong>朝になりました!</strong><br />
            議論して人狼を見つけましょう!
          </div>

          {/* 夜の結果を表示 */}
          {renderNightResult()}

          {/* 役職一覧を表示 */}
          {gameRoles && (
            <div className="info-box" style={{ backgroundColor: '#f0f0f0', borderLeft: '4px solid #666' }}>
              <strong>使用中の役職:</strong><br />
              {getRolesList()}
            </div>
          )}

          <div className={`card ${role.color}`}>{role.name}</div>

          <div className="info-box">
            <strong>あなたの役職:</strong> {role.name}<br />
            <strong>陣営:</strong> {role.team}<br />
            <strong>勝利条件:</strong> {getWinCondition()}
          </div>

          {/* 投票 */}
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
                  >
                    {player.name}
                    {memos[player.id] && (
                      <span className="memo-badge">📝</span>
                    )}
                  </button>
                ))}
                {/* 平和村ボタン (常に表示) */}
                <button
                  onClick={() => setSelectedTarget('peace')}
                  className={selectedTarget === 'peace' ? 'selected' : ''}
                  style={{
                    backgroundColor: selectedTarget === 'peace' ? '#4CAF50' : '#8BC34A',
                    color: 'white'
                  }}
                >
                  🕊️ 平和村
                </button>
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
      </div>

      {/* 議論メモサイドバー */}
      <div className="memo-sidebar">
        <div className="memo-container">
          <h3 className="memo-title">📝 議論メモ</h3>
          
          <div className="memo-help">
            プレイヤーを選んでメモを残そう
          </div>

          {/* プレイヤー選択 */}
          <div className="memo-player-select">
            {otherPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.id)}
                className={`memo-player-btn ${selectedPlayer === player.id ? 'active' : ''} ${memos[player.id] ? 'has-memo' : ''}`}
              >
                {player.name}
                {memos[player.id] && <span className="memo-indicator">●</span>}
              </button>
            ))}
          </div>

          {/* 選択中のプレイヤーのメモ */}
          {selectedPlayer && (
            <div className="memo-edit-area">
              <div className="memo-edit-header">
                <strong>
                  {otherPlayers.find(p => p.id === selectedPlayer)?.name}のメモ
                </strong>
                {memos[selectedPlayer] && (
                  <button
                    onClick={() => clearMemo(selectedPlayer)}
                    className="memo-clear-btn"
                    title="メモをクリア"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* 既存のメモ表示 */}
              {memos[selectedPlayer] && (
                <div className="memo-display">
                  {memos[selectedPlayer].split('\n').map((line, i) => (
                    <div key={i} className="memo-line">• {line}</div>
                  ))}
                </div>
              )}

              {/* メモ入力 */}
              <div className="memo-input-area">
                <input
                  type="text"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addMemo();
                    }
                  }}
                  placeholder="メモを入力..."
                  maxLength={50}
                />
                <button
                  onClick={addMemo}
                  disabled={!memoInput.trim()}
                  className="memo-add-btn"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {!selectedPlayer && (
            <div className="memo-empty">
              👆 プレイヤーを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscussionPhase;