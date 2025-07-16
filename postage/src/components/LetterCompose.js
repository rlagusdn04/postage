import React, { useState } from "react";

function LetterCompose({ characterId, onSend, tutorialMode }) {
  const [content, setContent] = useState("");

  // 폼 제출 시 부모(onSend)로 내용 전달
  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSend(content);
      setContent(""); // 입력창 초기화
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="편지를 입력하세요"
        rows={6}
        style={{ width: "100%" }}
      />
      <button type="submit">보내기</button>
    </form>
  );
}

export default LetterCompose; 