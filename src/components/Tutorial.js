import React, { useEffect, useState } from "react";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";

const DANPOONG_ID = "danpoong";
const DANPOONG_FIRST_MSG = "안녕! 나는 🍁단풍이야. 오늘부터 우리 편지를 주고받아보자!";

function Tutorial({ user, userData, onComplete }) {
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [step, setStep] = useState(1); // 1: 편지 읽기, 2: 답장 작성, 3: 튜토리얼 완료

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
          content: DANPOONG_FIRST_MSG,
          timestamp: serverTimestamp(),
          read: false,
        });
      }
    };
    if (user) createFirstMsg();
  }, [user]);

  // 답장 버튼 클릭 시
  const handleReply = (msg) => {
    setReplyMsg(msg);
    setStep(2);
  };

  // 답장 전송 후 튜토리얼 완료 처리
  const handleSent = async () => {
    // 튜토리얼 완료 처리
    await updateDoc(doc(db, "users", user.uid), { tutorialDone: true });
    setStep(3);
    // onComplete 콜백(있으면) 호출
    if (onComplete) onComplete();
  };

  if (step === 3) return <div>튜토리얼이 완료되었습니다! 캐릭터 선택 화면으로 이동합니다...</div>;

  return (
    <div>
      <h2>튜토리얼: 단풍과 첫 편지</h2>
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
  );
}

export default Tutorial; 