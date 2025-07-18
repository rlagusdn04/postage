import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./LetterInbox.css";

function LetterInbox({ userId, characterId, onReply }) {
  const isRandomMatching = characterId?.startsWith('random_');
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 편지 목록 실시간 불러오기
  useEffect(() => {
    if (!userId || !characterId) return;

    setLoading(true);
    const msgsRef = collection(db, "users", userId, "interactions", characterId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("편지 실시간 불러오기 실패:", error);
      setLoading(false);
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => unsubscribe();
  }, [userId, characterId]);

  // 편지 클릭 시 읽음 처리
  const handleSelect = async (id, read) => {
    setSelectedId(id);
    if (!read) {
      const msgRef = doc(db, "users", userId, "interactions", characterId, "messages", id);
      await updateDoc(msgRef, { read: true });
      // onSnapshot이 자동으로 업데이트하므로 아래 줄은 필요 없음
      // setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read: true } : m));
    }
  };

  if (loading) {
    return (
      <div className="letter-loading">
        <div className="loading-spinner"></div>
        <p>편지를 불러오는 중...</p>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="empty-inbox">
        <div className="empty-icon">{isRandomMatching ? "💌" : "📭"}</div>
        <p>{isRandomMatching ? "아직 편지가 없습니다. 편지 작성하기 버튼을 눌러 첫 편지를 보내보세요!" : "받은 편지가 없습니다."}</p>
      </div>
    );
  }

  return (
    <div className="letter-inbox">
      <h3 className="inbox-title">
        {isRandomMatching ? "💬 대화" : "📬 받은 편지함"}
      </h3>
      
      <div className="letter-list">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`letter-item ${selectedId === msg.id ? 'selected' : ''} ${!msg.read ? 'unread' : ''} ${isRandomMatching ? 'random-message' : ''}`}
            onClick={() => handleSelect(msg.id, msg.read)}
          >
            <div className="letter-header">
              <span className="letter-type">
                {isRandomMatching ? (
                  msg.type === "system" ? "🔔 시스템" :
                  msg.senderId === userId ? "📤 내 편지" : "📥 받은 편지"
                ) : (
                  msg.id.startsWith("received_") ? "📥 받은 편지" : "📤 보낸 편지"
                )}
              </span>
              {isRandomMatching && msg.senderId && msg.senderId !== userId && (
                <span className="sender-name">{msg.senderNickname || "익명"}</span>
              )}
              <span className="letter-time">
                {msg.timestamp?.toDate ? 
                  msg.timestamp.toDate().toLocaleString() : 
                  new Date().toLocaleString()
                }
              </span>
            </div>
            <div className="letter-preview">
              {msg.content.slice(0, 50)}...
            </div>
            {!msg.read && <div className="unread-indicator"></div>}
          </div>
        ))}
      </div>
      
      {selectedId && (
        <div className="letter-detail">
          <div className="detail-header">
            <h4>📄 편지 내용</h4>
            <button 
              className="close-detail-btn"
              onClick={() => setSelectedId(null)}
            >
              ✕
            </button>
          </div>
          <div className="letter-content">
            {messages.find(m => m.id === selectedId)?.content}
          </div>
          {/* 답장 버튼: 받은 편지에만 노출 (랜덤 매칭에서는 모든 메시지에 답장 가능) */}
          {(isRandomMatching || messages.find(m => m.id === selectedId)?.id.startsWith("received_")) && (
            <button 
              className="reply-btn"
              onClick={() => onReply(messages.find(m => m.id === selectedId))}
            >
              {isRandomMatching ? "💬 답장하기" : "💌 답장하기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LetterInbox; 