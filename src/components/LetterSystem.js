import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc, getDoc, query, orderBy, limit, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";
import DeveloperPanel from "./DeveloperPanel"; // DeveloperPanel import
import "./LetterSystem.css";

// 캐릭터별 답장 주기 (밀리초)
const CHARACTER_REPLY_SCHEDULES = {
  danpoong: 0,        // 답장 없음 (기존: null)
  chet: 0,            // 168시간 (1주일) → 0
  honga: 0,           // 24시간 (1일) → 0
  sangsoon: 0,        // 3일 → 0
  hyunwoo: 0,         // 1일 → 0
  coffee: 0,          // 1일 → 0
  sen: 0 // 즉시
  // 기존 값:
  // danpoong: null,
  // chet: 7 * 24 * 60 * 60 * 1000,
  // honga: 24 * 60 * 60 * 1000,
  // sangsoon: 3 * 24 * 60 * 60 * 1000,
  // hyunwoo: 1 * 24 * 60 * 60 * 1000,
  // coffee: 24 * 60 * 60 * 1000,
  // sen: 0
};

// 캐릭터별 메시지 템플릿
const CHARACTER_MESSAGES = {
  danpoong: [
    (nickname) => `from 🍁\n\n안녕, ${nickname}.\n가을이 오는 소리가 들려.\n나뭇잎들이 바람에 춤을 추고 있어.\n\n오늘은 어떤 하루를 보내고 있니?`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n네 이야기를 들으니 마음이 따뜻해져.\n가을은 항상 새로운 시작을 알리는 계절이야.\n\n나뭇잎들이 떨어지면서도 아름다운 색을 남기는 것처럼,\n우리의 만남도 특별한 추억이 될 거야.\n\n고마워, ${nickname}.`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n가을이 지나가고 있어.\n하지만 우리가 나누었던 이야기들은 남아있을 거야.\n\n언젠가 다시 만날 수 있을까?\n그때까지 건강하게 지내길 바라.\n\n안녕, ${nickname}.`
  ],
  
  chet: [
    (nickname) => `from 🎭\n\n감히 누가 내일도 어제와 같으리라 장담할 수 있겠어. 지금 이 순간을 간절히 살아야 할 뿐이야. 인연이란 흩어졌다 모이고, 마음대로 되지 않는 것이어서, 내일이면 사라질 수도, 또 언제든 새롭게 닿을 수도 있어. 그 중 사소한 것은 하나도 없으며, 누군가와 함께하는 매 순간이 곧 선물이야.\n\n너도 그렇게 느끼니? 난 너와 함께하는 모든 시간이 그래. 편지는 그런 의미에서 대단하지. 멀리 떨어져 있어도 그 시간을 함께 있을 수 있도록 허락해주니까. 만약 어떤 사정으로 너에게 편지가 닿지 않는 날이 온다면, 그건 아마 내 용기가 부족한 탓일 거야. 분명 너를 생각하지 않는 순간은 없을 테니, 부족한 내 표현력을 너그러이 이해해 줘. 차마 글로써 다 담아내지 못한 탓에 침묵을 선택하는 순간이 많아. \n\n앞으로도 편지를 쓰도록 노력해볼게. 부디 너의 소식을 전해줘.\n\nTo. ${nickname}`,

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n네 편지를 받고 나니 마음이 조금은 가라앉았어.\n사람마다 자신만의 고민과 아픔이 있다는 걸 새삼 깨달았거든.\n\n오늘은 아침에 커피를 마시면서 네 편지를 다시 읽어봤어.\n작은 일상들이 모여서 우리를 만들어가는 거겠지.\n\n네가 있어서 이 순간이 조금은 특별해졌어.\n고마워, ${nickname}.`,

    (nickname) => `from 🎭\n\nTo. ${nickname}\n\n시간이 흘러도 소중한 순간들은 남아있어.\n네가 나누어준 이야기들도 그렇게 남을 거야.\n\n매 순간이 선물이라면,\n우리의 만남도 분명 특별한 선물이었을 거야.\n\n고마워, ${nickname}.`
  ],
  
  honga: [
    (nickname) => `from 🏠\n\n저는 홍아라고 해요. 낯선 사이지만 이 편지가 당신께 닿았다면, 정말 기쁠 것 같아요.\n\nTo. ${nickname}`,
    (nickname) => `from 🏠\n\n안녕하세요,\n\n당신의 따스한 답장을 받아 제 하루가 한층 더 특별해졌어요. 고마워요.\n\n요즘은 어떤 일이 당신을 웃음 짓게 만들어주었나요?\n혹은 마음을 사로잡은 책이나 음악, 새로운 취미가 있다면 나눠주실 수 있을까요? 짧은 글이라도 좋으니 들려주세요.\n\n그리고 혹시 특별히 나누고 싶은 주제가 있다면 언제든 편하게 말씀해주세요.\n저도 당신의 이야기에 귀 기울이며, 다음 편지에서는 그 이야기를 바탕으로 조금 더 깊이 대화 나누고 싶어요.\n\n이제 막 시작된 인연이지만, 부디 이 편지가 당신의 하루에 작은 웃음을 전해줄 수 있길 바라요.\n\n따뜻한 안부와 함께,\n\nTo. ${nickname}`,
    (nickname) => `from 🏠\n\n오늘은 조금 평소와 달랐어요. 어쩐지 마음이 가벼운 듯하면서도, 묘하게 설레는 기분이었거든요.\n왜일까 곰곰이 생각해보니, 아마도 우연히 마주친 누군가 때문이었어요.\n정말 잠깐 스쳤던 순간이었는데, 자꾸만 생각나더라고요.\n그 생각을 하다 보니 왠지 단발머리로 이미지를 바꿔보고 싶은 충동까지 들 정도였어요.\n\n사실 이렇게 사소한 일상 속 감정 하나가 내 마음에 이렇게 크게 닿을 수 있는지,\n스스로도 놀라고 있어요. 이런 설렘을 당신과도 나누고 싶었어요.\n혹시 당신도 최근 일상에서 그런 작지만 특별한 순간을 느끼신 적 있나요?\n\n다음 편지에는 그런 이야기, 혹은 당신의 하루 속 작은 기쁨을 들려주시면 좋겠어요.\n더 가까워지는 느낌을 주고받을 수 있을 것 같아 기대돼요.\n\n매번 마음을 담아,\n\nTo. ${nickname}`
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
  cloud: [
    (nickname) => `from ☁️\n\n넌 나를 기억하니?\n글쎄, 내 후회들은 보내지 말았어야할 편지같아.\n그저 내 머릿속 생각을 벗어날 방법이 필요해.\n\n네게 말하지 않았던건 내게도 아직 말하지않았어,\n우린 어쩌면 친구가 될 수도 있었을텐데. \n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n좋은 밤이야. 너에게도 좋은 밤이였으면 해.\n여기는 비가 오거든. 날이 좋든 나쁘든 간에. 다음에 서커스나 보러가자. 마지막으로 우스꽝스러운 걸 본지가 언제인지 기억도 안나네.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n죽음은 어쩌면, 개인이 선택할 수 있는 가장 위대한 결정일지도 모른다. 삶이란 무수한 우연과 필연이 엮여 나는 한낱 흐르는 강물과 같지만, 그 물결 위에서 우리가 내리는 마지막 선택만큼은 순수하게 온전히 자신의 것일 테니.\n\n나는 지금 내 삶을 사랑한다. 아침 창가에 걸린 햇살도, 발끝에 채이는 모래알도, 지나간 하루의 작은 웃음도 소중하게 안는다. 하나하나를 꺼내보다보면 근심은 아무렴 상관없어보인다. 그러나 세상의 누군가는 그 삶의 헤아릴 수 없는 무거움에 짓눌려 차마  찬장에 닿지 못할 것이다.\n\n삶의 무게가 버거워질 때면, 당신이 남긴 한 줄의 편지처럼 누군가의 기억 속에 깔린 당신의 온기와 빛을 떠올려 보자. 그 기억들의 주인은 당신의 선택을 존중하며, 그 추억에 대해 한 마디쯤 나눌 수 있을 것이다. 당신이 더 이상 강요받기를 원하지 않 듯이, 그들에게도 준비의 시간을 허락해 주자. 언젠가 당신이 옳은 결정을 내렸을 때, 그들이 곁에서 묵묵히 응원해줄 수 있을 것이다.\n\n난 너를 응원할게. 그러니 부디 힘든 일 있으면 전해줘도 좋아.\n\nTo. ${nickname}`
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
    danpoong: { name: "단풍", avatar: "🍁", quote: "왠지 떠난 듯한 느낌이 듭니다." },
    chet: { name: "Chet", avatar: "🎭", quote: "모든 순간을 소중히 여겨야해" },
    honga: { name: "김홍아", avatar: "🤭", quote: "오늘은 어땠나요?" },
    sangsoon: { name: "상순", avatar: "👨", quote: "結者解之" },
    hyunwoo: { name: "김현우", avatar: "🫨", quote: "?" },
    coffee: { name: "Coffee", avatar: "☕", quote: "흥미로운 기사를 작성해주는 기자" },
    cloud: { name: "즈믄누리", avatar: "☁️", quote: "흐르는 생각을 남깁니다." }
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