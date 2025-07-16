import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

function LetterInbox({ user, characterId, tutorialMode }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Firestore에서 받은 편지 불러오기
    const fetchMessages = async () => {
      if (!user || !characterId) return;
      const msgsRef = collection(
        db,
        "users",
        user.uid,
        "interactions",
        characterId,
        "messages"
      );
      // 시간순 정렬
      const q = query(msgsRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => doc.data());
      setMessages(msgs);
    };
    fetchMessages();
  }, [user, characterId]);

  return (
    <div>
      <h3>받은 편지함</h3>
      <ul>
        {messages
          .filter(msg => msg.type === "received")
          .map((msg, idx) => (
            <li key={idx}>
              {msg.content}
              <br />
              <small>{msg.timestamp && msg.timestamp.toDate && msg.timestamp.toDate().toLocaleString()}</small>
            </li>
          ))}
      </ul>
    </div>
  );
}

export default LetterInbox;
