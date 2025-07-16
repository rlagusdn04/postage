import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./LetterInbox.css";

function LetterInbox({ userId, characterId, onReply }) {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 편지 목록 불러오기
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const msgsRef = collection(db, "users", userId, "interactions", characterId, "messages");
      const q = query(msgsRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    if (userId && characterId) fetchMessages();
  }, [userId, characterId]);

  // 편지 클릭 시 읽음 처리
  const handleSelect = async (id, read) => {
    setSelectedId(id);
    if (!read) {
      const msgRef = doc(db, "users", userId, "interactions", characterId, "messages", id);
      await updateDoc(msgRef, { read: true });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read: true } : m));
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
        <div className="empty-icon">📭</div>
        <p>받은 편지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="letter-inbox">
      <h3 className="inbox-title">📬 받은 편지함</h3>
      
      <div className="letter-list">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`letter-item ${selectedId === msg.id ? 'selected' : ''} ${!msg.read ? 'unread' : ''}`}
            onClick={() => handleSelect(msg.id, msg.read)}
          >
            <div className="letter-header">
              <span className="letter-type">
                {msg.id.startsWith("received_") ? "📥 받은 편지" : "📤 보낸 편지"}
              </span>
              <span className="letter-time">
                {msg.timestamp?.toDate ? 
                  msg.timestamp.toDate().toLocaleDateString() : 
                  new Date().toLocaleDateString()
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
          {/* 답장 버튼: 받은 편지에만 노출 */}
          {messages.find(m => m.id === selectedId)?.id.startsWith("received_") && (
            <button 
              className="reply-btn"
              onClick={() => onReply(messages.find(m => m.id === selectedId))}
            >
              💌 답장하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LetterInbox; 