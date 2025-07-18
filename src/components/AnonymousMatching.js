import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./AnonymousMatching.css";

function AnonymousMatching({ user, userData, onMatchComplete, onCancel }) {
  const [letterStatus, setLetterStatus] = useState('idle'); // idle, writing, sent, delivering, delivered
  const [currentMatch, setCurrentMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [preparedLetter, setPreparedLetter] = useState(''); // 미리 작성한 편지

  // 편지 작성 시작
  const startWritingLetter = () => {
    setLetterStatus('writing');
  };

  // 편지 봉투에 넣기 (매칭 시작)
  const sendLetter = async () => {
    if (!preparedLetter.trim()) return;
    
    setLetterStatus('sent');
    
    // 기존 매칭 요청이 있는지 확인
    const existingRequestsRef = collection(db, "matching_requests");
    const existingQuery = query(existingRequestsRef, where("userId", "==", user.uid));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      // 기존 요청이 있으면 삭제
      existingSnapshot.docs.forEach(doc => {
        deleteDoc(doc.ref);
      });
    }

    // 새로운 편지 배송 요청 생성
    const requestRef = doc(collection(db, "matching_requests"));
    await setDoc(requestRef, {
      userId: user.uid,
      userNickname: userData.nickname,
      status: 'waiting',
      createdAt: serverTimestamp(),
      requestId: requestRef.id,
      preparedLetter: preparedLetter.trim(), // 미리 작성한 편지 내용
      letterTimestamp: serverTimestamp()
    });

    // 배송 대기 중인 다른 편지 찾기
    const waitingQuery = query(
      existingRequestsRef, 
      where("status", "==", "waiting"),
      where("userId", "!=", user.uid)
    );
    const waitingSnapshot = await getDocs(waitingQuery);

    if (!waitingSnapshot.empty) {
      // 배송 가능한 편지 발견
      const matchedUser = waitingSnapshot.docs[0].data();
      
      // 편지 교환 시작
      const matchRef = doc(collection(db, "anonymous_matches"));
      const matchId = matchRef.id;
      
      await setDoc(matchRef, {
        user1Id: user.uid,
        user1Nickname: userData.nickname,
        user2Id: matchedUser.userId,
        user2Nickname: matchedUser.userNickname,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // 기존 요청들 삭제
      await deleteDoc(doc(existingRequestsRef, requestRef.id));
      await deleteDoc(doc(existingRequestsRef, waitingSnapshot.docs[0].id));

      // 편지 교환 완료 시 App.js로 콜백
      onMatchComplete(matchId, matchedUser.userNickname);
    } else {
      // 배송 대기 중
      setLetterStatus('delivering');
    }
  };
    
  // 편지 취소
  const cancelLetter = async () => {
    setLetterStatus('idle');
    setPreparedLetter('');
    
    // 편지 배송 요청 삭제
    const requestsRef = collection(db, "matching_requests");
    const userQuery = query(requestsRef, where("userId", "==", user.uid));
    const snapshot = await getDocs(userQuery);
    
    snapshot.docs.forEach(doc => {
      deleteDoc(doc.ref);
    });
    
    // App.js로 취소 콜백
    onCancel();
  };

  // 편지 배송 요청 실시간 감지
  useEffect(() => {
    if (letterStatus !== 'delivering') return;

    const requestsRef = collection(db, "matching_requests");
    const userQuery = query(requestsRef, where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(userQuery, async (snapshot) => {
      if (snapshot.empty) {
        // 요청이 삭제되었으면 매칭이 성공한 것
        const matchesRef = collection(db, "anonymous_matches");
        const matchQuery = query(
          matchesRef, 
          where("user1Id", "==", user.uid),
          where("status", "==", "active")
        );
        const matchSnapshot = await getDocs(matchQuery);
        
        if (!matchSnapshot.empty) {
          const matchData = matchSnapshot.docs[0].data();
          // 매칭 완료 시 즉시 콜백 호출
          onMatchComplete(matchSnapshot.docs[0].id, matchData.user2Nickname);
        }
      }
    });

    return () => unsubscribe();
  }, [letterStatus, user.uid, onMatchComplete]);

  // 편지 수령 감지
  useEffect(() => {
    if (letterStatus !== 'delivering') return;

    const matchesRef = collection(db, "anonymous_matches");
    const matchQuery = query(
      matchesRef, 
      where("user2Id", "==", user.uid),
      where("status", "==", "active")
    );
    
    const unsubscribe = onSnapshot(matchQuery, (snapshot) => {
      if (!snapshot.empty) {
        const matchData = snapshot.docs[0].data();
        // 매칭 완료 시 즉시 콜백 호출
        onMatchComplete(snapshot.docs[0].id, matchData.user1Nickname);
      }
    });

    return () => unsubscribe();
  }, [letterStatus, user.uid, onMatchComplete]);

  // 편지 교환 실시간 감지
  useEffect(() => {
    if (!currentMatch) return;

    const messagesRef = collection(db, "anonymous_matches", currentMatch.matchId, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [currentMatch]);

  // 첫 편지 자동 전송
  useEffect(() => {
    if (!currentMatch || messages.length > 0) return;

    const sendFirstLetter = async () => {
      const messagesRef = collection(db, "anonymous_matches", currentMatch.matchId, "messages");
      const messageId = `first_${Date.now()}`;
      
      // 미리 작성한 편지가 있으면 전송
      if (preparedLetter.trim()) {
        await setDoc(doc(messagesRef, messageId), {
          type: "user",
          senderId: user.uid,
          senderNickname: userData.nickname,
          content: preparedLetter.trim(),
          timestamp: serverTimestamp(),
          read: false
        });
        setPreparedLetter(''); // 전송 후 초기화
      } else {
        // 시스템 메시지
        await setDoc(doc(messagesRef, messageId), {
          type: "system",
          content: `${currentMatch.otherUserNickname}님과 편지 교환이 시작되었습니다!`,
          timestamp: serverTimestamp(),
          read: false
        });
      }
    };

    sendFirstLetter();
  }, [currentMatch, messages.length, preparedLetter, user.uid, userData.nickname]);

  // 답장 전송
  const handleSendReply = async (content) => {
    if (!currentMatch || !content.trim()) return;

    const messagesRef = collection(db, "anonymous_matches", currentMatch.matchId, "messages");
    const messageId = `message_${Date.now()}`;
    
    await setDoc(doc(messagesRef, messageId), {
      type: "user",
      senderId: user.uid,
      senderNickname: userData.nickname,
      content: content.trim(),
      timestamp: serverTimestamp(),
      read: false
    });

    setReplyMsg(null);
    setRefresh(!refresh);
  };

  // 편지 교환 종료
  const endLetterExchange = async () => {
    if (!currentMatch) return;

    // 편지 교환 상태를 종료로 변경
    const matchRef = doc(db, "anonymous_matches", currentMatch.matchId);
    await updateDoc(matchRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });

    setCurrentMatch(null);
    setLetterStatus('idle');
    setMessages([]);
  };

  if (letterStatus === 'writing') {
    return (
      <div className="anonymous-matching-container">
        <div className="matching-header">
          <h2>✍️ 편지 작성</h2>
          <p>이 편지는 랜덤으로 누군가에게 전달될 거예요</p>
        </div>
        
        <div className="letter-writing-form">
          <div className="letter-paper">
            <textarea
              placeholder="편지 내용을 입력하세요..."
              value={preparedLetter}
              onChange={(e) => setPreparedLetter(e.target.value)}
              className="letter-textarea"
              rows={8}
              maxLength={500}
            />
            <div className="letter-footer">
              <span className="char-count">{preparedLetter.length}/500</span>
            </div>
          </div>
        </div>

        <div className="matching-actions">
          <button 
            className="send-letter-btn" 
            onClick={sendLetter}
            disabled={!preparedLetter.trim()}
          >
            📮 편지 봉투에 넣기
          </button>
          <button className="cancel-btn" onClick={cancelLetter}>
            취소
          </button>
        </div>
      </div>
    );
  }

  if (letterStatus === 'delivering') {
    return (
      <div className="anonymous-matching-container">
        <div className="matching-header">
          <h2>📮 편지 배송 중...</h2>
          <p>누군가가 당신의 편지를 기다리고 있어요</p>
        </div>
        <div className="matching-status">
          <div className="loading-spinner"></div>
          <p>편지가 배송 중입니다...</p>
        </div>
        <button className="cancel-matching-btn" onClick={cancelLetter}>
          편지 취소하기
        </button>
      </div>
    );
  }

  if (letterStatus === 'matched' && currentMatch) {
    return (
      <div className="anonymous-matching-container">
        <div className="matching-header">
          <h2>💌 편지 교환</h2>
          <p>{currentMatch.otherUserNickname}님과 편지를 주고받고 있습니다</p>
        </div>
        
        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.type === 'system' ? 'system' : 'user'}`}>
              {msg.type === 'system' ? (
                <div className="system-message">{msg.content}</div>
              ) : (
                <div className="user-message">
                  <div className="message-header">
                    <span className="sender">{msg.senderNickname}</span>
                    <span className="time">
                      {msg.timestamp?.toDate ? 
                        msg.timestamp.toDate().toLocaleString() : 
                        new Date().toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {replyMsg ? (
          <div className="reply-compose">
            <textarea
              placeholder="답장을 입력하세요..."
              value={replyMsg.content || ""}
              onChange={(e) => setReplyMsg({...replyMsg, content: e.target.value})}
            />
            <div className="reply-actions">
              <button onClick={() => handleSendReply(replyMsg.content)}>
                📮 편지 보내기
              </button>
              <button onClick={() => setReplyMsg(null)}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="new-message-btn"
            onClick={() => setReplyMsg({content: ""})}
          >
            ✍️ 답장 작성하기
          </button>
        )}

        <div className="matching-actions">
          <button className="end-matching-btn" onClick={endLetterExchange}>
            편지 교환 종료
          </button>
          <button className="back-btn" onClick={onCancel}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="anonymous-matching-container">
      <div className="matching-header">
        <h2>💌 랜덤 편지</h2>
        <p>서로를 모르는 사람에게 편지를 보내보세요</p>
      </div>
    
    <div className="matching-info">
      <div className="info-card">
        <h3>📝 편지 안내</h3>
        <ul>
          <li>편지를 작성하면 랜덤으로 누군가에게 전달됩니다</li>
          <li>서로의 닉네임만 공개됩니다</li>
          <li>편지는 누군가가 연결을 끊기 전까지 계속 주고받을 수 있습니다</li>
          <li>첫 편지를 작성해보세요</li>
        </ul>
      </div>
    </div>

    <div className="matching-actions">
      <button className="start-matching-btn" onClick={startWritingLetter}>
        ✍️ 편지 작성하기
      </button>
      <button className="back-btn" onClick={onCancel}>
        돌아가기
      </button>
    </div>
  </div>
  );
}

export default AnonymousMatching; 