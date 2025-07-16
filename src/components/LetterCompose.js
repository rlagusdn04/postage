import React, { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./LetterCompose.css";

function LetterCompose({ userId, characterId, replyTo, onSent }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    const timestamp = Date.now();
    const letterId = `sent_${timestamp}`;
    const letterRef = doc(db, "users", userId, "interactions", characterId, "messages", letterId);
    await setDoc(letterRef, {
      type: "sent",
      content: content.trim(),
      timestamp: serverTimestamp(),
      read: true,
      replyTo: replyTo?.id || null,
    });
    setSent(true);
    setSending(false);
    if (onSent) onSent();
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
        <h3>답장이 전송되었습니다!</h3>
        <p>단풍이 곧 답장해드릴 거예요.</p>
      </div>
    );
  }

  return (
    <div className="letter-compose">
      <div className="compose-header">
        <h3>💌 답장 작성</h3>
        {replyTo && (
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
          placeholder="답장 내용을 입력하세요... (Ctrl+Enter로 전송)"
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
                📤 답장 보내기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LetterCompose; 