import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

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

  if (loading) return <div>편지 불러오는 중...</div>;
  if (messages.length === 0) return <div>받은 편지가 없습니다.</div>;

  return (
    <div>
      <h2>받은 편지함</h2>
      <ul>
        {messages.map(msg => (
          <li
            key={msg.id}
            style={{ cursor: "pointer", fontWeight: msg.read ? "normal" : "bold" }}
            onClick={() => handleSelect(msg.id, msg.read)}
          >
            {msg.id.startsWith("received_") ? "[받음]" : "[보냄]"} {msg.content.slice(0, 20)}...
          </li>
        ))}
      </ul>
      {selectedId && (
        <div style={{ border: "1px solid #ccc", marginTop: 16, padding: 12 }}>
          <h3>편지 내용</h3>
          <p>{messages.find(m => m.id === selectedId)?.content}</p>
          {/* 답장 버튼: 받은 편지에만 노출, 이미 답장한 경우 비활성화(여기선 단순화) */}
          {messages.find(m => m.id === selectedId)?.id.startsWith("received_") && (
            <button onClick={() => onReply(messages.find(m => m.id === selectedId))}>
              답장하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LetterInbox; 