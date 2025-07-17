import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
// import "./DeveloperPanel.css"; // 필요시 CSS 작성

function DeveloperPanel({ userId, characterId, onClose }) {
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [newLetterContent, setNewLetterContent] = useState("");
  const [selectedSendingCharacter, setSelectedSendingCharacter] = useState(characterId);


  const characterInfo = {
    danpoong: { name: "단풍", avatar: "🍁" },
    chet: { name: "Chet", avatar: "🎭" },
    honga: { name: "김홍아", avatar: "🏠" },
    sangsoon: { name: "sangsoon", avatar: "👨‍💻" },
    hyunwoo: { name: "김현우", avatar: "🫨" }
  };
  const currentCharacter = characterInfo[characterId];

  // 사용자가 보낸 편지들 불러오기
  useEffect(() => {
    const fetchSentMessages = async () => {
      setLoading(true);
      try {
        const msgsRef = collection(db, "users", userId, "interactions", characterId, "messages");
        const q = query(msgsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        // 보낸 편지만 필터링 (sent_로 시작하는 편지들)
        const sent = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(msg => msg.id.startsWith("sent_"))
          .sort((a, b) => {
            const ta = a.timestamp?.toDate?.() || 0;
            const tb = b.timestamp?.toDate?.() || 0;
            return tb - ta;
          });
        setSentMessages(sent);
      } catch (error) {
        console.error("편지 불러오기 실패:", error);
      }
      setLoading(false);
    };
    if (userId && characterId) fetchSentMessages();
  }, [userId, characterId]);

  // 답장 전송
  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedMessage) return;
    setSending(true);
    try {
      const msgsRef = collection(db, "users", userId, "interactions", characterId, "messages");
      const letterId = `received_${Date.now()}`;
      await setDoc(doc(msgsRef, letterId), {
        type: "received",
        content: replyContent,
        timestamp: serverTimestamp(),
        read: false,
        messageIndex: 0, // 개발자 답장은 별도 인덱스
        isDeveloperReply: true, // 개발자 답장 표시
        replyTo: selectedMessage.id // 어떤 편지에 대한 답장인지 표시
      });
      setReplyContent("");
      setSelectedMessage(null);
      alert("답장이 전송되었습니다!");
      // 편지 목록 새로고침
      const q = query(msgsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const sent = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => msg.id.startsWith("sent_"))
        .sort((a, b) => {
          const ta = a.timestamp?.toDate?.() || 0;
          const tb = b.timestamp?.toDate?.() || 0;
          return tb - ta;
        });
      setSentMessages(sent);
    } catch (error) {
      console.error("답장 전송 실패:", error);
      alert("답장 전송 중 오류가 발생했습니다.");
    }
    setSending(false);
  };

  // 새 편지 전송
  const handleSendNewLetter = async () => {
    if (!targetUserId.trim() || !newLetterContent.trim() || !selectedSendingCharacter) {
      alert("수신자 ID, 발신 캐릭터, 편지 내용을 모두 입력해주세요.");
      return;
    }
    setSending(true);
    try {
      const msgsRef = collection(db, "users", targetUserId, "interactions", selectedSendingCharacter, "messages");
      const letterId = `received_dev_${Date.now()}`;
      await setDoc(doc(msgsRef, letterId), {
        type: "received",
        content: newLetterContent,
        timestamp: serverTimestamp(),
        read: false,
        messageIndex: 0, // 개발자 편지는 별도 인덱스
        isDeveloperLetter: true, // 개발자 편지 표시
        characterId: selectedSendingCharacter
      });
      setNewLetterContent("");
      setTargetUserId("");
      alert("편지가 성공적으로 발송되었습니다!");
    } catch (error) {
      console.error("새 편지 발송 실패:", error);
      alert("편지 발송 중 오류가 발생했습니다.");
    }
    setSending(false);
  };

  // 편지 선택
  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    setReplyContent("");
  };

  if (loading) {
    return (
      <div className="developer-panel-overlay">
        <div className="developer-panel">
          <div className="loading-spinner"></div>
          <p>편지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-panel-overlay">
      <div className="developer-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="dev-icon">⚙️</span>
            <h2>개발자 패널 - {currentCharacter?.name}</h2>
          </div>
          <button className="close-panel-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="panel-content">
          <div className="messages-section">
            <h3>📤 사용자가 보낸 편지들</h3>
            {sentMessages.length === 0 ? (
              <div className="empty-messages">
                <p>사용자가 보낸 편지가 없습니다.</p>
              </div>
            ) : (
              <div className="message-list">
                {sentMessages.map(message => (
                  <div
                    key={message.id}
                    className={`message-item ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                    onClick={() => handleSelectMessage(message)}
                  >
                    <div className="message-header">
                      <span className="message-time">
                        {message.timestamp?.toDate ? 
                          message.timestamp.toDate().toLocaleString() : 
                          new Date().toLocaleString()
                        }
                      </span>
                    </div>
                    <div className="message-preview">
                      {message.content.slice(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 새 편지 작성 섹션 */}
          <div className="new-letter-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3>🕊️ 자유 편지 발송</h3>
            <div className="new-letter-form">
              <div style={{ marginBottom: '10px' }}>
                <label htmlFor="target-user-id" style={{ display: 'block', marginBottom: '5px' }}>수신자 User ID:</label>
                <input
                  id="target-user-id"
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="편지를 받을 유저의 ID를 입력하세요"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label htmlFor="sending-character" style={{ display: 'block', marginBottom: '5px' }}>발신 캐릭터:</label>
                <select
                    id="sending-character"
                    value={selectedSendingCharacter}
                    onChange={(e) => setSelectedSendingCharacter(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                >
                    {Object.keys(characterInfo).map(charId => (
                        <option key={charId} value={charId}>
                            {characterInfo[charId].name}
                        </option>
                    ))}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label htmlFor="new-letter-content" style={{ display: 'block', marginBottom: '5px' }}>편지 내용:</label>
                <textarea
                  id="new-letter-content"
                  value={newLetterContent}
                  onChange={(e) => setNewLetterContent(e.target.value)}
                  placeholder="유저에게 보낼 편지 내용을 작성하세요..."
                  rows={8}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div className="new-letter-actions">
                <button
                  className="send-new-letter-btn"
                  onClick={handleSendNewLetter}
                  disabled={!targetUserId.trim() || !newLetterContent.trim() || sending}
                  style={{ padding: '10px 15px', cursor: 'pointer', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '5px' }}
                >
                  {sending ? "전송 중..." : "🕊️ 편지 발송"}
                </button>
              </div>
            </div>
          </div>

          {selectedMessage && (
            <div className="reply-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <h3>💌 답장 작성</h3>
              <div className="selected-message">
                <h4>선택된 편지:</h4>
                <div className="message-content">
                  {selectedMessage.content}
                </div>
              </div>
              <div className="reply-form">
                <label htmlFor="reply-content">답장 내용:</label>
                <textarea
                  id="reply-content"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`${currentCharacter?.name}의 답장을 작성하세요...`}
                  rows={8}
                />
                <div className="reply-actions">
                  <button 
                    className="send-reply-btn"
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sending}
                  >
                    {sending ? "전송 중..." : "📤 답장 전송"}
                  </button>
                  <button 
                    className="clear-reply-btn"
                    onClick={() => setReplyContent("")}
                    disabled={!replyContent.trim()}
                  >
                    지우기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeveloperPanel; 