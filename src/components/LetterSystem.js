import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";
import DeveloperPanel from "./DeveloperPanel"; // DeveloperPanel import
import "./LetterSystem.css";

// 캐릭터별 답장 주기 (밀리초)
const CHARACTER_REPLY_SCHEDULES = {
  danpoong: null,        // 답장 없음
  chet: 7 * 24 * 60 * 60 * 1000,    // 168시간 (1주일)
  honga: 24 * 60 * 60 * 1000, // 24시간 (1일)
  sangsoon: 3 * 24 * 60 * 60 * 1000, // 3일
  hyunwoo: 1 * 24 * 60 * 60 * 1000 // 1일
};

// 캐릭터별 메시지 템플릿
const CHARACTER_MESSAGES = {
  danpoong: [
    (nickname) => `from 🍁

안녕, ${nickname}.
가을이 오는 소리가 들려.
나뭇잎들이 바람에 춤을 추고 있어.

오늘은 어떤 하루를 보내고 있니?`,

    (nickname) => `from 🍁

To. ${nickname}

네 이야기를 들으니 마음이 따뜻해져.
가을은 항상 새로운 시작을 알리는 계절이야.

나뭇잎들이 떨어지면서도 아름다운 색을 남기는 것처럼,
우리의 만남도 특별한 추억이 될 거야.

고마워, ${nickname}.`,

    (nickname) => `from 🍁

To. ${nickname}

가을이 지나가고 있어.
하지만 우리가 나누었던 이야기들은 남아있을 거야.

언젠가 다시 만날 수 있을까?
그때까지 건강하게 지내길 바라.

안녕, ${nickname}.`
  ],
  
  chet: [
    (nickname) => `from 🎭

친애하는 ${nickname}에게,

오늘 하루 내게 일어난 일들이 꼭 가사처럼 연속된 불운이었어.
아침에 약속했던 골프, 비가 내려 취소됐고
이번에 이사한 집에서 파티를 열어보려 하면 꼭 위층에서 민원 전화가 와.
하루는 열차 놓치고, 감기 기운까지 찾아오더라고.

정말이지, '모든 일이 나한테만 일어나는구나' 싶을 정도로 말이야 

그래도 얼마 전엔 한 가지 기대를 품었지.
내가 사랑이라는 걸 믿으면 이 징크스를 깰 수 있을까 하고 말이야. 하지만 역시나, 머리는 "그래도 역시 안 될 거야"라고 답하더라. 아니나다를까 내 모든 것을 걸어도 돌아온 건 차가운 '안녕' 한 마디였어. 편지지도 없었지.

결국 다시 깨달은 건, 나한테 일어나는 모든 일은 이 정도라는거야. 다음엔 웃으며 편지를 쓸게.
너도 요즘 별일 없길 바래. 항상 고마워, 너의 소식이 듣고싶네.
${nickname} 에게`,

    (nickname) => `from 🎭

To. ${nickname}

네 편지를 받고 나니 마음이 조금은 가라앉았어.
사람마다 자신만의 고민과 아픔이 있다는 걸 새삼 깨달았거든.

오늘은 아침에 커피를 마시면서 네 편지를 다시 읽어봤어.
작은 일상들이 모여서 우리를 만들어가는 거겠지.

네가 있어서 이 순간이 조금은 특별해졌어.
고마워, ${nickname}.`,

    (nickname) => `from 🎭

To. ${nickname}

시간이 흘러도 소중한 순간들은 남아있어.
네가 나누어준 이야기들도 그렇게 남을 거야.

매 순간이 선물이라면,
우리의 만남도 분명 특별한 선물이었을 거야.

고마워, ${nickname}.`
  ],
  
  honga: [
    (nickname) => `from 🏠

안녕, ${nickname}.
나는 집을 자주 비우는 사람이야.
새로운 곳을 탐험하는 게 좋아.

오늘은 어디에 있니?
네가 있는 곳은 어떤 곳이야?`,

    (nickname) => `from 🏠

To. ${nickname}

네 이야기를 들으니 그곳이 눈에 그려져.
사람마다 자신만의 특별한 공간이 있구나.

나는 여행할 때마다 새로운 이야기들을 모아와.
언젠가 네게도 들려주고 싶어.

네가 있는 곳도 언젠가 한번 가보고 싶어.`,

    (nickname) => `from 🏠

To. ${nickname}

집을 비우는 것도 좋지만,
가끔은 누군가와 마음을 나누는 시간도 소중해.

네가 나누어준 이야기들이
내 여행 가방에 특별한 추억으로 남았어.

고마워, ${nickname}.`
  ],
  sangsoon: [
    (nickname) => `반갑고추.
지난 상원절 연회 자리에서 분에 넘는 음복과 좌석값으로 주머니가 속절없이 비었사온데,
실로 입 쌀 한 톨 담기 어려운 형편이 되어, 부득불 장문을 남기게 되었소.

돈을 벌 방법 어디 없는지 수소문하여 구하는 바오.
작은 일도 마다하지 않겠사오니, 은혜를 베풀어 주시길 간절히 바라나이다.
당장 소인의 작은 어려움을 헤아려 후에 큰 일을 함께 도모할 수 있다면 얼마나 좋은 일이겠소? 
귀하의 소개와 함께 손길이 닿는 곳을 모색해주신다면 그 은혜를 잊지 않겠소.

당문 외문제자 상순`
  ],
  hyunwoo: [
    (nickname) => `?`
  ]
};

function LetterSystem({ user, userData, characterId, onBack }) {
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [nextReplyTime, setNextReplyTime] = useState(null);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);

  const characterInfo = {
    danpoong: { name: "단풍", avatar: "🍁", quote: "" },
    chet: { name: "Chet", avatar: "🎭", quote: "" },
    honga: { name: "김홍아", avatar: "🏠", quote: "" },
    sangsoon: { name: "상순", avatar: "👨", quote: "" },
    hyunwoo: { name: "김현우", avatar: "🫨", quote: "?" }
  };

  
  const currentCharacter = characterInfo[characterId];

  // 첫 편지 자동 생성
  useEffect(() => {
    const createFirstMsg = async () => {
      const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
      const snapshot = await getDocs(msgsRef);
      const hasFirst = snapshot.docs.some(doc => doc.id.startsWith("received_"));
      if (!hasFirst) {
        const letterId = `received_${Date.now()}`;
        const firstMessage = CHARACTER_MESSAGES[characterId][0](userData?.nickname || "친구");
        await setDoc(doc(msgsRef, letterId), {
          type: "received",
          content: firstMessage,
          timestamp: serverTimestamp(),
          read: false,
          messageIndex: 0,
        });
      }
    };
    if (user && characterId) createFirstMsg();
  }, [user, characterId, userData?.nickname]);

  // 다음 답장 시간 저장
  const saveNextReplyTime = async (delay) => {
    if (!delay) return; // 단풍은 답장 없음
    
    const nextTime = new Date();
    nextTime.setTime(nextTime.getTime() + delay);
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      [`nextReplyTime_${characterId}`]: nextTime
    });
    
    setNextReplyTime(nextTime);
  };

  // 캐릭터의 자동 답장 생성 (주기 기반)
  const createCharacterReply = async () => {
    const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
    const nextIndex = currentMessageIndex + 1;
    
    if (nextIndex < CHARACTER_MESSAGES[characterId].length) {
      const letterId = `received_${Date.now()}`;
      const messageContent = CHARACTER_MESSAGES[characterId][nextIndex](userData?.nickname || "친구");
      
      await setDoc(doc(msgsRef, letterId), {
        type: "received",
        content: messageContent,
        timestamp: serverTimestamp(),
        read: false,
        messageIndex: nextIndex,
      });
      setCurrentMessageIndex(nextIndex);
      
      // 다음 답장 시간 설정
      await saveNextReplyTime(CHARACTER_REPLY_SCHEDULES[characterId]);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  // 답장 버튼 클릭 시
  const handleReply = (msg) => {
    setReplyMsg(msg);
    setShowWelcome(false);
  };

  // 답장 전송 후 처리
  const handleSent = async () => {
    setRefresh(!refresh);
    
    // 단풍은 답장 없음, 다른 캐릭터들은 주기 기반 답장
    if (characterId !== 'danpoong') {
      await saveNextReplyTime(CHARACTER_REPLY_SCHEDULES[characterId]);
    }
  };

  return (
    <div className="letter-system-container">
      <div className="letter-system-header">
        <div className="header-content">
          <div className="character-info">
            <span className="character-avatar">{currentCharacter.avatar}</span>
            <div>
              <h2>{currentCharacter.name}</h2>
              <p className="character-quote">"{currentCharacter.quote}"</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {userData?.isDeveloper && (
            <button className="dev-panel-btn" onClick={() => setShowDeveloperPanel(true)}>
              <span>⚙️</span>
              개발자 패널
            </button>
          )}
          <button className="back-btn" onClick={onBack}>
            <span>←</span>
            돌아가기
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            로그아웃
          </button>
        </div>
      </div>

      {showWelcome && (
        <div className="welcome-message">
          <div className="welcome-card">
            <h3>💌 편지 교환 시작</h3>
            <p>{currentCharacter.name}와의 편지 교환이 시작되었습니다.</p>
            <button 
              className="welcome-close-btn"
              onClick={() => setShowWelcome(false)}
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      <div className="letter-system-content">
        <LetterInbox
          userId={user.uid}
          characterId={characterId}
          onReply={handleReply}
          key={refresh}
        />
        
        {replyMsg && (
          <LetterCompose
            userId={user.uid}
            characterId={characterId}
            replyTo={replyMsg}
            onSent={handleSent}
          />
        )}
      </div>

      {showDeveloperPanel && (
        <DeveloperPanel 
          userId={user.uid} 
          characterId={characterId} 
          onClose={() => setShowDeveloperPanel(false)} 
        />
      )}
    </div>
  );
}

export default LetterSystem; 