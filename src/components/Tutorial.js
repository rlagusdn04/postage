import React, { useEffect, useState } from "react";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";
import "./Tutorial.css";

const DANPOONG_ID = "danpoong";

// 단풍의 메시지들 (순서대로)
const DANPOONG_MESSAGES = [
  `from 🍁

안녕.
이름도, 얼굴도 모르는 너에게 이 편지가 닿을지 모르겠어.
그런데도 글을 쓰다니 이상하지?

내가 곧 이곳을 떠난다는 건 알지만,
너에게 몇 장의 편지지를 받을 수 있다면 그걸로 좋을 것 같아.

기다릴게.`,

  `from 🍁

To. ${userData?.nickname || "친구"}

첫 편지를 받아서 정말 기뻐.
네가 어떤 사람인지 궁금해.

오늘은 바람이 불어서 나뭇잎들이 춤을 추고 있어.
너도 이런 작은 것들에 행복을 느끼는 사람인가?

조금 더 알고 싶어.`,

  `from 🍁

To. ${userData?.nickname || "친구"}

네 이야기를 들으니 마음이 따뜻해져.
사람과 사람이 이렇게 마음을 나눌 수 있다는 게 신기해.

내가 떠나기 전에 이런 소중한 순간을 만들어줘서 고마워.
네가 있어서 이 가을이 더욱 특별해졌어.

언젠가 다시 만날 수 있을까?`,

  `from 🍁

To. ${userData?.nickname || "친구"}

편지 쓰는 재미를 느끼셨나요? 💌
이제 튜토리얼이 끝났어요!

다른 캐릭터들과도 편지를 주고받아보세요.
각각 다른 매력과 이야기를 가지고 있을 거예요.

고마웠어. 안녕!`
];

function Tutorial({ user, userData, onComplete }) {
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [step, setStep] = useState(1); // 1: 편지 읽기, 2: 답장 작성, 3: 튜토리얼 완료
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showTutorialGuide, setShowTutorialGuide] = useState(true);

  // 단풍 첫 편지 자동 생성
  useEffect(() => {
    const createFirstMsg = async () => {
      const msgsRef = collection(db, "users", user.uid, "interactions", DANPOONG_ID, "messages");
      const snapshot = await getDocs(msgsRef);
      const hasFirst = snapshot.docs.some(doc => doc.id.startsWith("received_"));
      if (!hasFirst) {
        const letterId = `received_${Date.now()}`;
        await setDoc(doc(msgsRef, letterId), {
          type: "received",
          content: DANPOONG_MESSAGES[0],
          timestamp: serverTimestamp(),
          read: false,
          messageIndex: 0,
        });
      }
    };
    if (user) createFirstMsg();
  }, [user]);

  // 단풍의 자동 답장 생성
  const createDanpoongReply = async (userMessage) => {
    const msgsRef = collection(db, "users", user.uid, "interactions", DANPOONG_ID, "messages");
    const nextIndex = currentMessageIndex + 1;
    
    if (nextIndex < DANPOONG_MESSAGES.length) {
      const letterId = `received_${Date.now()}`;
      // 사용자 닉네임을 포함한 메시지 생성
      const messageContent = DANPOONG_MESSAGES[nextIndex].replace(
        /\${userData\?\.nickname \|\| "친구"}/g, 
        userData?.nickname || "친구"
      );
      
      await setDoc(doc(msgsRef, letterId), {
        type: "received",
        content: messageContent,
        timestamp: serverTimestamp(),
        read: false,
        messageIndex: nextIndex,
      });
      setCurrentMessageIndex(nextIndex);
      
      // 마지막 메시지인 경우 튜토리얼 완료
      if (nextIndex === DANPOONG_MESSAGES.length - 1) {
        setTimeout(() => {
          completeTutorial();
        }, 2000);
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // 로그아웃 후 App.js에서 자동으로 로그인 화면으로 리다이렉트됩니다
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  // 답장 버튼 클릭 시
  const handleReply = (msg) => {
    setReplyMsg(msg);
    setStep(2);
    setShowTutorialGuide(false);
  };

  // 답장 전송 후 처리
  const handleSent = async () => {
    setStep(1);
    setRefresh(!refresh);
    
    // 단풍의 자동 답장 생성
    await createDanpoongReply();
  };

  // 튜토리얼 완료 처리
  const completeTutorial = async () => {
    await updateDoc(doc(db, "users", user.uid), { tutorialDone: true });
    setStep(3);
    if (onComplete) onComplete();
  };

  if (step === 3) {
    return (
      <div className="tutorial-complete">
        <div className="complete-card">
          <div className="complete-icon">🎉</div>
          <h2>튜토리얼 완료!</h2>
          <p>단풍과의 편지 교환이 완료되었습니다.</p>
          <p>이제 다른 캐릭터들과도 편지를 주고받아보세요!</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="redirect-text">캐릭터 선택 화면으로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-container">
      <div className="tutorial-header">
        <div className="header-content">
          <h2>튜토리얼: 단풍과의 편지 교환</h2>
          <p className="tutorial-subtitle">편지를 읽고 답장해보세요! ({currentMessageIndex + 1}/3)</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          로그아웃
        </button>
      </div>

      {showTutorialGuide && (
        <div className="tutorial-guide">
          <div className="guide-card">
            <h3>📝 튜토리얼 가이드</h3>
            <ul>
              <li>받은 편지를 클릭하여 내용을 확인하세요</li>
              <li>"답장하기" 버튼을 눌러 답장을 작성하세요</li>
              <li>단풍이 자동으로 답장해드릴 거예요!</li>
              <li>3번의 편지 교환 후 튜토리얼이 완료됩니다</li>
            </ul>
            <button 
              className="guide-close-btn"
              onClick={() => setShowTutorialGuide(false)}
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      <div className="tutorial-content">
        <LetterInbox
          userId={user.uid}
          characterId={DANPOONG_ID}
          onReply={handleReply}
          key={refresh}
        />
        
        {step === 2 && replyMsg && (
          <LetterCompose
            userId={user.uid}
            characterId={DANPOONG_ID}
            replyTo={replyMsg}
            onSent={handleSent}
          />
        )}
      </div>
    </div>
  );
}

export default Tutorial; 