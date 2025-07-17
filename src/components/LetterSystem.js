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
  hyunwoo: 1 * 24 * 60 * 60 * 1000, // 1일
  coffee: 24 * 60 * 60 * 1000, // 1일
  sen: 0 // 즉시
};

// 캐릭터별 메시지 템플릿
const CHARACTER_MESSAGES = {
  danpoong: [
    (nickname) => `from 🍁\n\n안녕, ${nickname}.\n가을이 오는 소리가 들려.\n나뭇잎들이 바람에 춤을 추고 있어.\n\n오늘은 어떤 하루를 보내고 있니?`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n네 이야기를 들으니 마음이 따뜻해져.\n가을은 항상 새로운 시작을 알리는 계절이야.\n\n나뭇잎들이 떨어지면서도 아름다운 색을 남기는 것처럼,\n우리의 만남도 특별한 추억이 될 거야.\n\n고마워, ${nickname}.`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n가을이 지나가고 있어.\n하지만 우리가 나누었던 이야기들은 남아있을 거야.\n\n언젠가 다시 만날 수 있을까?\n그때까지 건강하게 지내길 바라.\n\n안녕, ${nickname}.`
  ],
  
  chet: [
    (nickname) => `from 🎭\n\n친애하는 ${nickname}에게,\n\n오늘 하루 내게 일어난 일들이 꼭 가사처럼 연속된 불운이었어.\n아침에 약속했던 골프, 비가 내려 취소됐고\n이번에 이사한 집에서 파티를 열어보려 하면 꼭 위층에서 민원 전화가 와.\n하루는 열차 놓치고, 감기 기운까지 찾아오더라고.\n\n정말이지, '모든 일이 나한테만 일어나는구나' 싶을 정도로 말이야 \n\n그래도 얼마 전엔 한 가지 기대를 품었지.\n내가 사랑이라는 걸 믿으면 이 징크스를 깰 수 있을까 하고 말이야. 하지만 역시나, 머리는 "그래도 역시 안 될 거야"라고 답하더라. 아니나다를까 내 모든 것을 걸어도 돌아온 건 차가운 '안녕' 한 마디였어. 편지지도 없었지.\n\n결국 다시 깨달은 건, 나한테 일어나는 모든 일은 이 정도라는거야. 다음엔 웃으며 편지를 쓸게.\n너도 요즘 별일 없길 바래. 항상 고마워, 너의 소식이 듣고싶네.\n${nickname} 에게`,

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n네 편지를 받고 나니 마음이 조금은 가라앉았어.\n사람마다 자신만의 고민과 아픔이 있다는 걸 새삼 깨달았거든.\n
오늘은 아침에 커피를 마시면서 네 편지를 다시 읽어봤어.\n작은 일상들이 모여서 우리를 만들어가는 거겠지.\n
네가 있어서 이 순간이 조금은 특별해졌어.\n고마워, ${nickname}.`,

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n시간이 흘러도 소중한 순간들은 남아있어.\n네가 나누어준 이야기들도 그렇게 남을 거야.\n\n매 순간이 선물이라면,\n우리의 만남도 분명 특별한 선물이었을 거야.\n\n고마워, ${nickname}.`
  ],
  
  honga: [
    (nickname) => `from 🏠\n\n안녕, ${nickname}.\n나는 집을 자주 비우는 사람이야.\n새로운 곳을 탐험하는 게 좋아.\n\n오늘은 어디에 있니?\n네가 있는 곳은 어떤 곳이야?`,

    (nickname) => `from 🏠\n\nTo. ${nickname}\n\n네 이야기를 들으니 그곳이 눈에 그려져.\n사람마다 자신만의 특별한 공간이 있구나.\n\n나는 여행할 때마다 새로운 이야기들을 모아와.\n언젠가 네게도 들려주고 싶어.\n\n네가 있는 곳도 언젠가 한번 가보고 싶어.`,

    (nickname) => `from 🏠\n\nTo. ${nickname}\n\n집을 비우는 것도 좋지만,\n가끔은 누군가와 마음을 나누는 시간도 소중해.\n\n네가 나누어준 이야기들이\n내 여행 가방에 특별한 추억으로 남았어.\n\n고마워, ${nickname}.`
  ],
  sangsoon: [
    (nickname) => `반갑고추.\n지난 상원절 연회 자리에서 분에 넘는 음복과 좌석값으로 주머니가 속절없이 비었사온데,\n실로 입 쌀 한 톨 담기 어려운 형편이 되어, 부득불 장문을 남기게 되었소.\n\n돈을 벌 방법 어디 없는지 수소문하여 구하는 바오.\n작은 일도 마다하지 않겠사오니, 은혜를 베풀어 주시길 간절히 바라나이다.\n당장 소인의 작은 어려움을 헤아려 후에 큰 일을 함께 도모할 수 있다면 얼마나 좋은 일이겠소? \n귀하의 소개와 함께 손길이 닿는 곳을 모색해주신다면 그 은혜를 잊지 않겠소.\n\n당문 외문제자 상순`
  ],
  hyunwoo: [
    (nickname) => `?`
  ],
  coffee: [
    (nickname) => `from ☕\n\n안녕하세요,문어는 심장이 세 개나 있다는 사실, 알고 계셨나요?
하나는 몸 전체에 혈액을 순환시키는 체심장이고, 나머지 두 개는 아가미 심장으로 아가미와 다리에 혈액을 공급한답니다.
체심장은 평소에는 열심히 뛰지만, 수영을 할 때는 멈춘다고 하네요. 덕분에 문어는 수영할 때 체력이 금방 떨어지지만, 기어 다닐 땐 훨씬 오래 움직일 수 있답니다.  ${nickname}님.`,

    (nickname) => `from ☕\n\nTo. ${nickname}\n\n답장 잘 받았습니다.\n레몬즙을 사용하면 평범한 종이에 아무 글자도 보이지 않게 쓸 수 있어요.글자를 쓴 뒤엔 겉으로는 아무것도 없는 것처럼 보이지만, 종이를 살짝 불에 데우면 레몬즙이 타면서 글씨가 갈색으로 드러납니다.

이 방법은 옛날에 비밀스러운 메시지를 전할 때 많이 사용되었답니다. 적에게 들키지 않고 몰래 정보를 주고받을 수 있었죠.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n 바나나는 사실 ‘베리(berry)’에 속한 과일이랍니다.
반면, 딸기는 놀랍게도 베리가 아니에요!
딸기는 식물학적으로 ‘겉씨과’에 속하는 과일이라, 겉에 씨가 박혀 있는 형태죠.
그런데 왜 딸기를 영어로 ‘strawberry(짚 베리)’라고 부를까요?
옛날 유럽에서는 딸기를 심을 때 땅에 닿지 않도록 짚(straw)을 깔아 보호했어요.
또는 딸기의 줄기가 짚처럼 가늘고 길어서 그렇게 불렸다는 설도 있답니다.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n 
메모장에선 F5 키를 누르면 현재 날짜와 시간이 바로 입력된답니다. 간단한 일지나 편지를 작성할 때 매우 유용하죠.
작업을 마쳤다면 Ctrl + S로 저장하는 습관을 꼭 들이세요.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n `
  ],
  sen: [
    (nickname) => `from 😠\n너무 오래 연락못했네, 미안.\n일부러 피한건 아니야.\n그래도 보니깐 반갑더라. \n\n근데 요즘 너 좀 이상해 보이던데.\n너무 화가 나 보이더라고.\n요즘 누가 너한테 잘못한거라도 있어??`,

    (nickname) => `from 😠\n\n그래서? 그 다음엔 어떻게 했는데? \n\n나야 뭐—  \n화를 내는 쪽도, 안 내는 척하는 쪽도  \n결국 다 방법이라고 생각해.  \n근데 말이야,  \n남들이 보면 그냥… \n철 안 들어보일 수도 있으니까  \n\n그냥, 다들 너 앞에선 말은 안꺼내지만 \n속으로 그런 생각하더라.`,

    (nickname) => `from 😠\n정말?\n\n그래도 너 정도면 노력에 비해 잘된 케이스 아닌가?\n그게 나쁘단건 아닌데\n요즘 워낙 다들 살기 힘들잖아.\n하긴 너는 이해못할 수도 있겠다.`
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
    hyunwoo: { name: "김현우", avatar: "🫨", quote: "?" },
    coffee: { name: "Coffee", avatar: "☕", quote: "흥미로운 기사를 작성해주는 기자" },
    sen: { name: "Sen", avatar: "😠", quote: "그래서 하고 싶은 말이 뭔데?" }
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