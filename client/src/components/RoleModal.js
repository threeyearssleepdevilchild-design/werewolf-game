import React from 'react';
import './RoleModal.css';

const roleDetails = {
  werewolf: {
    name: '人狼',
    team: '人狼陣営',
    description: '村人に紛れ込んだ人狼。人間のふりをして生き延びよう。',
    ability: '夜フェーズで他の人狼を確認できます。複数いる場合はお互いを認識できます。',
    winCondition: '人狼が1人も処刑されなければ勝利',
    tips: '・村人のふりをして疑いを他の人に向けよう\n・仲間の人狼と協力しよう'
  },
  villager: {
    name: '村人',
    team: '村人陣営',
    description: '普通の村人。特別な能力はないが、推理で人狼を見つけ出そう。',
    ability: '特別な能力はありません。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・他の人の発言をよく聞こう\n・矛盾を見つけ出そう'
  },
  fortune_teller: {
    name: '占い師',
    team: '村人陣営',
    description: '人の役職を見抜く力を持つ占い師。',
    ability: '夜フェーズでプレイヤー1人の役職を確認、または中央カード2枚を確認できます。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・占い結果を公表するかは戦略次第\n・人狼に狙われやすいので注意'
  },
  thief: {
    name: '怪盗',
    team: '村人陣営',
    description: '他人の役職を盗む怪盗。',
    ability: '夜フェーズでプレイヤー1人と自分の役職カードを交換できます。交換後、新しい役職の陣営になります。',
    winCondition: '最終的な役職の陣営が勝利すれば勝利',
    tips: '・人狼を盗めば村人陣営の勝利\n・交換したことは公表してもよい'
  },
  police: {
    name: '警察',
    team: '村人陣営',
    description: '能力を封じる警察官。',
    ability: '夜フェーズでプレイヤー1人を選び、その人の夜の能力を封じることができます。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・人狼を封じても効果は薄い\n・占い師や怪盗を封じると混乱を招く'
  },
  madman: {
    name: '狂人',
    team: '人狼陣営',
    description: '人狼の味方をする狂った村人。',
    ability: '特別な能力はありません。人狼が誰かも知りません。',
    winCondition: '人狼陣営が勝利すれば勝利\n※平和村の場合は村人陣営として勝利',
    tips: '・占い師を騙るなどして村を混乱させよう\n・人狼のふりをして疑いを引き受けるのも手'
  },
  medium: {
    name: '審神者',
    team: '村人陣営',
    description: '陣営を見抜く審神者。',
    ability: '夜フェーズでプレイヤー1人の陣営(人狼陣営/村人陣営/第三陣営)を確認できます。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・占い師より確実な情報が得られる\n・ただし具体的な役職はわからない'
  },
  fool: {
    name: 'ばか',
    team: '村人陣営',
    description: '能力を真似するばか。通常は嘘の結果を得ます。',
    ability: '夜フェーズでランダムな村人陣営の能力を使いますが、通常は嘘の結果が返されます。\n\n✨ 1/10の確率で本物の結果を得ます！その場合、特別なBGMが流れます。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・嘘の結果に惑わされないように\n・本物の結果を得たらラッキー！'
  },
  gravekeeper: {
    name: '墓守',
    team: '村人陣営',
    description: '中央カードを見て交換できる墓守。',
    ability: '夜フェーズで中央カード1枚を確認し、自分のカードと交換するかを選べます。',
    winCondition: '最終的な役職の陣営が勝利すれば勝利',
    tips: '・人狼カードと交換すれば人狼陣営に\n・情報を得つつ安全な役職になれる'
  },
  witch: {
    name: '魔女っ子',
    team: '村人陣営',
    description: '初期役職を見抜く魔女。',
    ability: '夜フェーズでプレイヤー1人の初期役職を確認できます。怪盗で交換されていても元の役職がわかります。',
    winCondition: '人狼を1人以上処刑すれば勝利',
    tips: '・怪盗の行動を見抜ける\n・初期人狼を特定できる'
  },
  hanged: {
    name: '吊人',
    team: '第三陣営',
    description: '処刑されることを望む吊人。',
    ability: '特別な能力はありません。',
    winCondition: '自分が処刑されたら単独勝利',
    tips: '・怪しまれるように振る舞おう\n・でも処刑されなかったら負け'
  }
};

function RoleModal({ role, onClose }) {
  const details = roleDetails[role];

  if (!details) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>{details.name}</h2>
          <span className="modal-team">{details.team}</span>
        </div>

        <div className="modal-body">
          <p className="modal-description">{details.description}</p>

          <div className="modal-section">
            <h3>🌙 夜の能力</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{details.ability}</p>
          </div>

          <div className="modal-section">
            <h3>🏆 勝利条件</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{details.winCondition}</p>
          </div>

          {details.tips && (
            <div className="modal-section modal-tips">
              <h3>💡 プレイのヒント</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{details.tips}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleModal;