import React, { useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./LetterCompose.css";

function LetterCompose({ userId, characterId, replyTo, onSent, userData }) {
  const isRandomMatching = characterId?.startsWith('random_');
  const matchId = isRandomMatching ? characterId.replace('random_', '') : null;
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    
    try {
      const timestamp = Date.now();
      const letterId = `sent_${timestamp}`;
      
      // 내 편지함에 저장
      const letterRef = doc(db, "users", userId, "interactions", characterId, "messages", letterId);
      await setDoc(letterRef, {
        type: "sent",
        content: content.trim(),
        timestamp: serverTimestamp(),
        read: true,
        replyTo: replyTo?.id || null,
        senderId: userId,
        senderNickname: userData?.nickname || "익명"
      });

      // 랜덤 매칭인 경우 상대방에게도 전송
      if (isRandomMatching && matchId) {
        const otherUserId = await getOtherUserId(matchId, userId);
        if (otherUserId) {
          const otherLetterRef = doc(db, "users", otherUserId, "interactions", characterId, "messages", letterId);
          await setDoc(otherLetterRef, {
            type: "received",
            content: content.trim(),
            timestamp: serverTimestamp(),
            read: false,
            senderId: userId,
            senderNickname: userData?.nickname || "익명"
          });
        }
      }
      
      setSent(true);
      setSending(false);
      if (onSent) onSent();
    } catch (error) {
      console.error("편지 전송 실패:", error);
      alert("편지 전송 중 오류가 발생했습니다.");
      setSending(false);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
    }
  };

  if (sent) {
    return (
      <div className="compose-sent">
        <div className="sent-icon">✉️</div>
        <h3>편지가 전송되었습니다!</h3>
        <p>곧 답장이 올거에요.</p>
      </div>
    );
  }

  return (
    <div className="letter-compose">
      <div className="compose-header">
        <h3>{isRandomMatching ? "💌 편지 작성" : "💌 답장 작성"}</h3>
        {replyTo && !isRandomMatching && (
          <div className="reply-to">
            <span>답장 대상:</span>
            <div className="reply-preview">
              {replyTo.content.slice(0, 30)}...
            </div>
          </div>
        )}
      </div>
      
      <div className="compose-form">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isRandomMatching ? "메시지를 입력하세요... (Ctrl+Enter로 전송)" : "답장 내용을 입력하세요... (Ctrl+Enter로 전송)"}
          className="compose-textarea"
          rows={6}
          disabled={sending}
          maxLength={500}
        />
        <div className="compose-footer">
          <span className="char-count">
            {content.length}/500
          </span>
          <button 
            className="send-btn"
            onClick={handleSend} 
            disabled={!content.trim() || sending}
          >
            {sending ? (
              <>
                <div className="sending-spinner"></div>
                전송 중...
              </>
            ) : (
              <>
                {isRandomMatching ? "📤 메시지 보내기" : "📤 답장 보내기"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LetterCompose; 