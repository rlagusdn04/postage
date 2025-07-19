import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, orderBy, query, setDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./RandomInbox.css";
import { useNavigate } from "react-router-dom";

function RandomInbox({ user, onWriteNewLetter, onBack }) {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeTarget, setComposeTarget] = useState(null); // 답장 대상 메시지
  const [sending, setSending] = useState(false);
  const [matching, setMatching] = useState(false); // 매칭 중 상태
  const [matchedNickname, setMatchedNickname] = useState(null); // 매칭된 상대 닉네임
  const [matchedUserId, setMatchedUserId] = useState(null); // 매칭된 상대 uid
  const navigate = useNavigate();

  // 임시 랜덤 닉네임 생성 함수
  const randomNicknames = [
    "푸른하늘", "노을빛", "달빛소녀", "별똥별", "초록숲", "바람결", "햇살이", "구름타고", "파도소리", "고요한밤"
  ];
  function getRandomNickname() {
    return randomNicknames[Math.floor(Math.random() * randomNicknames.length)];
  }

  // 돌아가기 버튼 핸들러
  const handleBack = () => {
    if (onBack) onBack();
  };

  // 랜덤 편지함 실시간 불러오기
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const inboxRef = collection(db, "users", user.uid, "random_inbox");
    const q = query(inboxRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("랜덤 편지함 실시간 불러오기 실패:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 편지 클릭 시 읽음 처리
  const handleSelect = async (id, read) => {
    setSelectedId(id);
    if (!read) {
      const msgRef = doc(db, "users", user.uid, "random_inbox", id);
      await updateDoc(msgRef, { read: true });
    }
  };

  // 답장 버튼 클릭 시
  const handleReply = (msg) => {
    setComposeTarget(msg);
    setComposeContent("");
    setShowCompose(true);
  };

  // 새 편지 작성 버튼 클릭 시
  const handleNewLetter = () => {
    setComposeTarget(null);
    setComposeContent("");
    setShowCompose(true);
  };

  // 다시 매칭 버튼 클릭 시 (실제 유저 닉네임 기반)
  const handleRematch = async () => {
    setMatching(true);
    setMatchedNickname(null);
    setMatchedUserId(null);
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const others = snapshot.docs
        .filter(docu => docu.id !== user.uid && docu.data().nickname)
        .map(docu => ({ uid: docu.id, nickname: docu.data().nickname }));
      if (others.length > 0) {
        const randomUser = others[Math.floor(Math.random() * others.length)];
        setTimeout(() => {
          setMatchedNickname(randomUser.nickname);
          setMatchedUserId(randomUser.uid);
          setMatching(false);
        }, 1200);
      } else {
        setTimeout(() => {
          setMatchedNickname("상대 없음");
          setMatchedUserId(null);
          setMatching(false);
        }, 1200);
      }
    } catch (e) {
      setMatchedNickname("오류");
      setMatchedUserId(null);
      setMatching(false);
    }
  };

  // 편지 전송
  const handleSend = async () => {
    if (!composeContent.trim()) return;
    setSending(true);
    try {
      const timestamp = Date.now();
      const letterId = `sent_${timestamp}`;
      // 내 편지함에 보낸 편지 저장
      const myRef = doc(db, "users", user.uid, "random_inbox", letterId);
      await setDoc(myRef, {
        type: "sent",
        content: composeContent.trim(),
        timestamp: serverTimestamp(),
        read: true,
        replyTo: composeTarget?.id || null,
      });
      // 답장인 경우 상대방 편지함에 받은 편지로 저장
      if (composeTarget && composeTarget.senderId) {
        const otherUserId = composeTarget.senderId;
        const otherRef = doc(db, "users", otherUserId, "random_inbox", letterId);
        await setDoc(otherRef, {
          type: "received",
          content: composeContent.trim(),
          timestamp: serverTimestamp(),
          read: false,
          replyTo: composeTarget.id,
          senderId: user.uid,
          senderNickname: user.displayName || "익명"
        });
      } else if (matchedUserId) {
        // 새 편지: 매칭된 상대방에게도 편지 저장
        const otherRef = doc(db, "users", matchedUserId, "random_inbox", letterId);
        await setDoc(otherRef, {
          type: "received",
          content: composeContent.trim(),
          timestamp: serverTimestamp(),
          read: false,
          replyTo: null,
          senderId: user.uid,
          senderNickname: user.displayName || "익명"
        });
      }
      setShowCompose(false);
      setComposeContent("");
      setComposeTarget(null);
    } catch (error) {
      alert("편지 전송 중 오류가 발생했습니다.");
    }
    setSending(false);
  };

  return (
    <div className="random-inbox-container">
      <button
        className="random-back-btn"
        onClick={handleBack}
      >
        ← 돌아가기
      </button>
      <h3 className="random-inbox-title">💌 내 랜덤 편지함</h3>
      <div className="random-inbox-desc">누군가가 당신에게 보낸 편지가 이곳에 도착합니다.</div>
      <div className="random-inbox-actions">
        <button className="random-inbox-btn" onClick={handleNewLetter}>
          ✍️ 새 편지 작성하기
        </button>
        <button className="random-inbox-btn" onClick={handleRematch} disabled={matching} style={{marginLeft:8}}>
          {matching ? "🔄 매칭 중..." : "🔄 다시 매칭"}
        </button>
      </div>
      {matchedNickname && (
        <div className="random-inbox-match-info">
          <span>현재 매칭된 상대: <b>{matchedNickname}</b></span>
        </div>
      )}
      {loading ? (
        <div className="letter-loading">
          <div className="loading-spinner"></div>
          <p>편지를 불러오는 중...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="empty-inbox">
          <div className="empty-icon">📭</div>
          <p>아직 당신에게 도착한 편지가 없습니다.<br/>먼저 편지를 보내보세요!</p>
        </div>
      ) : (
        <div className="random-inbox-list">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`random-inbox-item${selectedId === msg.id ? ' selected' : ''}${!msg.read ? ' unread' : ''}`}
              onClick={() => handleSelect(msg.id, msg.read)}
            >
              <div className="letter-header">
                <span className="letter-type">
                  {msg.type === "received" ? "📥 받은 편지" : "📤 보낸 편지"}
                </span>
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
      )}
      {selectedId && (
        <div className="random-inbox-detail">
          <div className="random-inbox-detail-header">
            <h4>📄 편지 내용</h4>
            <button 
              className="random-inbox-close-btn"
              onClick={() => setSelectedId(null)}
            >
              ✕
            </button>
          </div>
          <div className="random-inbox-paper">
            {messages.find(m => m.id === selectedId)?.content}
          </div>
          {/* 답장 버튼: 받은 편지에만 노출 */}
          {messages.find(m => m.id === selectedId)?.type === "received" && (
            <button 
              className="random-inbox-btn"
              onClick={() => handleReply(messages.find(m => m.id === selectedId))}
            >
              💌 답장하기
            </button>
          )}
        </div>
      )}
      {showCompose && (
        <div className="random-inbox-compose-modal">
          <div className="letter-compose">
            <div className="compose-header">
              <h3>{composeTarget ? "💌 답장 작성" : "💌 편지 작성"}</h3>
              {composeTarget && (
                <div className="reply-to">
                  <span>답장 대상:</span>
                  <div className="reply-preview">{composeTarget.content.slice(0, 40)}...</div>
                </div>
              )}
            </div>
            <div className="compose-form">
              <textarea
                value={composeContent}
                onChange={e => setComposeContent(e.target.value)}
                placeholder={composeTarget ? "답장 내용을 입력하세요... (Ctrl+Enter로 전송)" : "메시지를 입력하세요... (Ctrl+Enter로 전송)"}
                className="compose-textarea"
                rows={6}
                maxLength={500}
                disabled={sending}
                onKeyPress={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
              />
              <div className="compose-footer">
                <span className="char-count">{composeContent.length}/500</span>
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!composeContent.trim() || sending}
                >
                  {sending ? (<><div className="sending-spinner"></div>전송 중...</>) : (composeTarget ? "📤 답장 보내기" : "📤 메시지 보내기")}
                </button>
                <button
                  className="random-inbox-cancel-btn"
                  onClick={() => setShowCompose(false)}
                  disabled={sending}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RandomInbox; 