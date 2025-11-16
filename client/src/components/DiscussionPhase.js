import React from 'react';

const roleInfo = {
  werewolf: { name: '人狼', team: '人狼陣営', color: 'werewolf' },
  villager: { name: '村人', team: '村人陣営', color: 'villager' },
  detective: { name: '探偵', team: '村人陣営', color: 'detective' },
  thief: { name: '怪盗', team: '村人陣営', color: 'thief' },
  police: { name: '警察', team: '村人陣営', color: 'police' },
  madman: { name: '狂人', team: '人狼陣営', color: 'madman' }
};

function DiscussionPhase({ myFinalRole, onStartVoting }) {
  const role = roleInfo[myFinalRole];

  const getWinCondition = () => {
    if (myFinalRole === 'werewolf') {
      return '人狼が1人も処刑されなければ勝利';
    } else if (myFinalRole === 'madman') {
      return '人狼陣営(狂人除く)が処刑されなければ勝利\n※平和村の場合は村人陣営として勝利';
    } else {
      return '人狼を1人以上処刑すれば勝利';
    }
  };

  return (
    <div className="container">
      <h1>🌅 昼フェーズ</h1>
      <h2>議論時間</h2>

      <div className="success-box">
        <strong>朝になりました!</strong><br />
        議論して人狼を見つけましょう!
      </div>

      <div className={`card ${role.color}`}>{role.name}</div>

      <div className="info-box">
        <strong>あなたの役職:</strong> {role.name}<br />
        <strong>陣営:</strong> {role.team}<br />
        <strong>勝利条件:</strong> {getWinCondition()}
      </div>

      <div className="warning-box">
        <strong>⏰ 議論時間: 3〜5分</strong><br />
        ・自分の役職や情報を共有しましょう<br />
        ・嘘をついても構いません<br />
        ・矛盾を見つけて推理しましょう
      </div>

      <button onClick={onStartVoting}>投票フェーズへ</button>
    </div>
  );
}

export default DiscussionPhase;
