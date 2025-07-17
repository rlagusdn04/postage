import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./CharacterSelect.css";

function CharacterSelect({ user, userData, onCharacterSelect }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // 로그아웃 후 App.js에서 자동으로 로그인 화면으로 리다이렉트됩니다
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const handleCharacterSelect = (characterId) => {
    setSelectedCharacter(characterId);
    if (onCharacterSelect) {
      onCharacterSelect(characterId);
    }
  };

  return (
    <div className="character-select-container">
      <div className="header">
        <div className="user-info">
          <h2>편지 친구 선택</h2>
          <p className="welcome-text">{userData?.nickname}님, 누구와 편지를 나누고 싶으신가요?</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          로그아웃
        </button>
      </div>
      
      <div className="content">
        <div className="character-grid">
          <div className="character-card">
            <div className="character-avatar">🍁</div>
            <h3>단풍</h3>
            <p className="character-quote">"단풍"</p>
            <p className="character-description">왠지 답신이 없을 것 같은 기분이 든다.</p>
            <button 
              className="select-btn"
              onClick={() => handleCharacterSelect('danpoong')}
            >
              편지 시작하기
            </button>
          </div>
          
          <div className="character-card">
            <div className="character-avatar">🎭</div>
            <h3>Chet</h3>
            <p className="character-quote">"Chet"</p>
            <p className="character-description">매 순간을 선물이라 여겨야 해</p>
            <button 
              className="select-btn"
              onClick={() => handleCharacterSelect('chet')}
            >
              편지 시작하기
            </button>
          </div>
          
          <div className="character-card">
            <div className="character-avatar">🫨</div>
            <h3>김현우</h3>
            <p className="character-quote">?</p>
            <p className="character-description">"그래도 편지를 보내보세요."</p>
            <button 
              className="select-btn"
              onClick={() => handleCharacterSelect('hyunwoo')}
            >
              편지 시작하기
            </button>
          </div>

          <div className="character-card">
            <div className="character-avatar">👨</div>
            <h3>상순</h3>
            <p className="character-quote">"돈 벌 방법 어디 없소?"</p>
            <p className="character-description">囊中之錐.</p>
            <button 
              className="select-btn"
              onClick={() => handleCharacterSelect('sangsoon')}
            >
              편지 시작하기
            </button>
          </div>

          <div className="character-card">
            <div className="character-avatar"></div>
            <h3>김홍아</h3>
            <p className="character-quote">수신인 불명</p>
            <p className="character-description">집을 자주 비웁니다</p>
            <button 
              className="select-btn"
              onClick={() => handleCharacterSelect('honga')}
            >
              편지 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterSelect; 