import React, { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function LetterCompose({ userId, characterId, replyTo, onSent }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!content) return;
    setSending(true);
    const timestamp = Date.now();
    const letterId = `sent_${timestamp}`;
    const letterRef = doc(db, "users", userId, "interactions", characterId, "messages", letterId);
    await setDoc(letterRef, {
      type: "sent",
      content,
      timestamp: serverTimestamp(),
      read: true,
      replyTo: replyTo?.id || null,
    });
    setSent(true);
    setSending(false);
    if (onSent) onSent();
  };

  if (sent) return <div>답장이 전송되었습니다!</div>;

  return (
    <div style={{ marginTop: 16 }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="답장 내용을 입력하세요..."
        rows={5}
        style={{ width: "100%" }}
        disabled={sending}
      />
      <button onClick={handleSend} disabled={!content || sending}>
        {sending ? "전송 중..." : "답장 보내기"}
      </button>
    </div>
  );
}

export default LetterCompose; 