import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc, getDoc, query, orderBy, limit, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";
import DeveloperPanel from "./DeveloperPanel"; // DeveloperPanel import
import AnonymousMatching from "./AnonymousMatching"; // 익명 매칭 컴포넌트 추가
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

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n네 편지를 받고 나니 마음이 조금은 가라앉았어.\n사람마다 자신만의 고민과 아픔이 있다는 걸 새삼 깨달았거든.\n\n오늘은 아침에 커피를 마시면서 네 편지를 다시 읽어봤어.\n작은 일상들이 모여서 우리를 만들어가는 거겠지.\n\n네가 있어서 이 순간이 조금은 특별해졌어.\n고마워, ${nickname}.`,

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n시간이 흘러도 소중한 순간들은 남아있어.\n네가 나누어준 이야기들도 그렇게 남을 거야.\n\n매 순간이 선물이라면,\n우리의 만남도 분명 특별한 선물이었을 거야.\n\n고마워, ${nickname}.`
  ],
  
  honga: [
    (nickname) => `from 🏠\n\n안녕, ${nickname}. 아마 또 오랜 시간 자리를 비울 것 같아.\n\n넌 오늘은 어디에 있니?\n네가 있는 곳은 어떤 곳이야?`,

    (nickname) => `from 🏠\n\nTo. ${nickname}\n\n네 이야기를 들으니 그곳이 눈에 그려져.\n사람마다 자신만의 특별한 공간이 있구나.\n\n나는 여행할 때마다 새로운 이야기들을 모아와.\n언젠가 네게도 들려주고 싶어.\n\n네가 있는 곳도 언젠가 한번 가보고 싶어.`,

    (nickname) => `from 🏠\n\nTo. ${nickname}\n\n집을 비우는 것도 좋지만,\n가끔은 누군가와 마음을 나누는 시간도 소중해.\n\n네가 나누어준 이야기들이\n내 여행 가방에 특별한 추억으로 남았어.\n\n고마워, ${nickname}.`
  ],
  sangsoon: [
    (nickname) => `반갑고추.\n지난 상원절 연회 자리에서 분에 넘는 음복과 좌석값으로 주머니가 속절없이 비었사온데,\n실로 입 쌀 한 톨 담기 어려운 형편이 되어, 부득불 장문을 남기게 되었소.\n\n돈을 벌 방법 어디 없는지 수소문하여 구하는 바오.\n작은 일도 마다하지 않겠사오니, 은혜를 베풀어 주시길 간절히 바라나이다.\n당장 소인의 작은 어려움을 헤아려 후에 큰 일을 함께 도모할 수 있다면 얼마나 좋은 일이겠소? \n귀하의 소개와 함께 손길이 닿는 곳을 모색해주신다면 그 은혜를 잊지 않겠소.\n\n당문 외문제자 상순`,
    (nickname) => `반갑고추. 편지는 잘받았소. 허나 전번 편지를 띄운 뒤, 이내 부끄러움이 밀려와 편지를 채 받기도 전에 며칠이고 내면을 들여다보았소.도움을 구한다는 것이 단지 손을 내미는 일이 아니라, 누군가의 마음과 자리를 빌리는 일임을 새삼 깨달았기 때문이오.\n\n그래서 스스로 움직였소.\n내 부족한 솜씨로나마 상단의 호위 일을 맡았고, 비록 몇 번 위기를 겪었으나 — 소생은 죽음에 강한 듯하오. 지금껏 한 번도 죽어본 적 없으니 말일세.\n\n그러던 중, 나와 같은 처지의 이를 만났소.\n겉으론 태연했지만, 형편은 나보다 더 어려워 보였소.\n허나 그 사람, 끝내 쉽게 도움을 청하지 못하더군.\n그 모습이 자꾸만 마음에 남았소. 예전 내 모습이 떠오르기도 하더구려.\n\n그때부터 한 가지 생각이 머릿속을 떠나질 않더이다.\n그대라면, 누군가가 어려움에 처했는데 손을 벌리지 못한다면 먼저 다가가겠소? 그에게도 도움을 청하지 않는 사정이 있을지도 모르오.\n\n또 문득, 내가 다른 입장이었다면 어땠을까, 그런 생각도 들었소.\n과연 나는 내가 여태껏 겪어보지 못한 누군가의 곤궁을, 겉으로 태연한 말투와 웃음 속에서도 알아볼 수 있었을까?\n또, 알아보았다면 기꺼이 손을 내밀었을까?\n\n그저 마음에 맴도는 물음들을 이렇게 적어 보내오.\n혹여 그대의 고견을 들을 수 있다면, 내게 큰 도움이 될 것이오.\n\n당문 외문제자 상순`,
  ],
  hyunwoo: [
    (nickname) => `?`
  ],
  coffee: [
    (nickname) => `from ☕\n\n안녕하세요,문어는 심장이 세 개나 있다는 사실, 알고 계셨나요?\n하나는 몸 전체에 혈액을 순환시키는 체심장이고, 나머지 두 개는 아가미 심장으로 아가미와 다리에 혈액을 공급한답니다.\n체심장은 평소에는 열심히 뛰지만, 수영을 할 때는 멈춘다고 하네요. 덕분에 문어는 수영할 때 체력이 금방 떨어지지만, 기어 다닐 땐 훨씬 오래 움직일 수 있답니다.  ${nickname}님.`,

    (nickname) => `from ☕\n\nTo. ${nickname}\n\n답장 잘 받았습니다.\n레몬즙을 사용하면 평범한 종이에 아무 글자도 보이지 않게 쓸 수 있어요.글자를 쓴 뒤엔 겉으로는 아무것도 없는 것처럼 보이지만, 종이를 살짝 불에 데우면 레몬즙이 타면서 글씨가 갈색으로 드러납니다.\n\n이 방법은 옛날에 비밀스러운 메시지를 전할 때 많이 사용되었답니다. 적에게 들키지 않고 몰래 정보를 주고받을 수 있었죠.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n 바나나는 사실 ‘베리(berry)’에 속한 과일이랍니다.\n반면, 딸기는 놀랍게도 베리가 아니에요!\n딸기는 식물학적으로 ‘겉씨과’에 속하는 과일이라, 겉에 씨가 박혀 있는 형태죠.\n그런데 왜 딸기를 영어로 ‘strawberry(짚 베리)’라고 부를까요?\n옛날 유럽에서는 딸기를 심을 때 땅에 닿지 않도록 짚(straw)을 깔아 보호했어요.\n또는 딸기의 줄기가 짚처럼 가늘고 길어서 그렇게 불렸다는 설도 있답니다.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n \n메모장에선 F5 키를 누르면 현재 날짜와 시간이 바로 입력된답니다. 간단한 일지나 편지를 작성할 때 매우 유용하죠.\n작업을 마쳤다면 Ctrl + S로 저장하는 습관을 꼭 들이세요.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n `
  ],
  sen: [
    (nickname) => `from 😠\n너무 오래 연락못했네, 미안.\n일부러 피한건 아니야.\n그래도 보니깐 반갑더라. \n\n근데 요즘 너 좀 이상해 보이던데.\n너무 화가 나 보이더라고.\n요즘 누가 너한테 잘못한거라도 있어??`,

    (nickname) => `from 😠\n\n그래서? 그 다음엔 어떻게 했는데? \n\n나야 뭐—  \n화를 내는 쪽도, 안 내는 척하는 쪽도  \n결국 다 방법이라고 생각해.  \n근데 말이야,  \n남들이 보면 그냥… \n철 안 들어보일 수도 있으니까  \n\n그냥, 다들 너 앞에선 말은 안꺼내지만 \n속으로 그런 생각하더라.`,

    (nickname) => `from 😠\n정말?\n\n그래도 너 정도면 노력에 비해 잘된 케이스 아닌가?\n그게 나쁘단건 아닌데\n요즘 워낙 다들 살기 힘들잖아.\n하긴 너는 이해못할 수도 있겠다.`
  ]
};

function LetterSystem({ user, userData, characterId, onBack, currentMatch }) {
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);

  // 랜덤 매칭 감지
  const isRandomMatching = characterId?.startsWith('random_');
  const matchId = isRandomMatching ? characterId.replace('random_', '') : null;

  const characterInfo = {
    danpoong: { name: "단풍", avatar: "🍁", quote: "" },
    chet: { name: "Chet", avatar: "🎭", quote: "" },
    honga: { name: "김홍아", avatar: "🏠", quote: "" },
    sangsoon: { name: "상순", avatar: "👨", quote: "" },
    hyunwoo: { name: "김현우", avatar: "🫨", quote: "?" },
    coffee: { name: "Coffee", avatar: "☕", quote: "흥미로운 기사를 작성해주는 기자" },
    sen: { name: "Sen", avatar: "😠", quote: "그래서 하고 싶은 말이 뭔데?" }
  };

  const currentCharacter = isRandomMatching 
    ? { name: "랜덤 편지", avatar: "🤝", quote: currentMatch?.otherUserNickname ? `${currentMatch.otherUserNickname}님과 연결됨` : "매칭 중..." }
    : characterInfo[characterId];

  // 주기적인 답장 확인 (랜덤 매칭에서는 사용하지 않음)
  useEffect(() => {
    const checkAndSendReply = async () => {
      if (!user || !characterId || characterId === 'danpoong' || isRandomMatching) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const nextReplyTime = userData[`nextReplyTime_${characterId}`]?.toDate();

      if (nextReplyTime && new Date() >= nextReplyTime) {
        const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
        const q = query(msgsRef, orderBy("timestamp", "desc"), limit(1));
        const lastMsgSnapshot = await getDocs(q);
        
        if (!lastMsgSnapshot.empty) {
          const lastMsg = lastMsgSnapshot.docs[0].data();
          const currentMessageIndex = lastMsg.messageIndex !== undefined ? lastMsg.messageIndex : -1;
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

            // 다음 답장 시간 삭제
            await updateDoc(userRef, {
              [`nextReplyTime_${characterId}`]: null
            });
            setRefresh(prev => !prev);
          }
        }
      }
    };

    const interval = setInterval(checkAndSendReply, 60 * 1000); // 1분마다 확인
    checkAndSendReply(); // 컴포넌트 마운트 시 즉시 확인

    return () => clearInterval(interval);
  }, [user, characterId, userData?.nickname]);


  // 첫 편지 자동 생성 (랜덤 매칭에서는 사용하지 않음)
  useEffect(() => {
    const createFirstMsg = async () => {
      if (isRandomMatching) return; // 랜덤 매칭에서는 자동 생성하지 않음
      
      const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
      const snapshot = await getDocs(msgsRef);
      const hasReceivedMsg = snapshot.docs.some(doc => doc.data().type === "received");

      if (!hasReceivedMsg) {
        const letterId = `received_${Date.now()}`;
        const firstMessage = CHARACTER_MESSAGES[characterId][0](userData?.nickname || "친구");
        await setDoc(doc(msgsRef, letterId), {
          type: "received",
          content: firstMessage,
          timestamp: serverTimestamp(),
          read: false,
          messageIndex: 0,
        });
        setRefresh(prev => !prev);
      }
    };
    if (user && characterId) createFirstMsg();
  }, [user, characterId, userData?.nickname, isRandomMatching]);

  // 답장 전송 후 처리
  const handleSent = async () => {
    setReplyMsg(null);
    setRefresh(!refresh);
    
    if (characterId !== 'danpoong' && !isRandomMatching) {
      const delay = CHARACTER_REPLY_SCHEDULES[characterId];
      if (delay !== null) {
        const nextTime = new Date();
        nextTime.setTime(nextTime.getTime() + delay);
        
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          [`nextReplyTime_${characterId}`]: nextTime
        });
      }
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

  // 랜덤 매칭 연결 종료
  const handleDisconnect = async () => {
    if (!isRandomMatching || !matchId) return;
    
    try {
      // 매칭 상태를 종료로 변경
      const matchRef = doc(db, "anonymous_matches", matchId);
      await updateDoc(matchRef, {
        status: 'ended',
        endedBy: user.uid,
        endedAt: serverTimestamp()
      });
      
      // 상대방에게 연결 종료 알림 전송
      const otherUserId = await getOtherUserId(matchId, user.uid);
      if (otherUserId) {
        const otherMsgsRef = collection(db, "users", otherUserId, "interactions", characterId, "messages");
        const disconnectMsgId = `disconnect_${Date.now()}`;
        await setDoc(doc(otherMsgsRef, disconnectMsgId), {
          type: "system",
          content: "상대방이 연결을 종료했습니다.",
          timestamp: serverTimestamp(),
          read: false
        });
      }
      
      onBack();
    } catch (error) {
      console.error("연결 종료 실패:", error);
      alert("연결 종료 중 오류가 발생했습니다.");
    }
  };

  // 상대방 사용자 ID 가져오기
  const getOtherUserId = async (matchId, currentUserId) => {
    try {
      const matchRef = doc(db, "anonymous_matches", matchId);
      const matchDoc = await getDoc(matchRef);
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        return matchData.user1Id === currentUserId ? matchData.user2Id : matchData.user1Id;
      }
    } catch (error) {
      console.error("상대방 ID 가져오기 실패:", error);
    }
    return null;
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
          {userData?.isDeveloper && !isRandomMatching && (
            <button className="dev-panel-btn" onClick={() => setShowDeveloperPanel(true)}>
              <span>⚙️</span>
              개발자 패널
            </button>
          )}
          {isRandomMatching && (
            <button className="disconnect-btn" onClick={handleDisconnect}>
              <span>❌</span>
              연결 종료
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

      {showWelcome && !isRandomMatching && (
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
            userData={userData}
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