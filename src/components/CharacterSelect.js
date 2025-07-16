import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./CharacterSelect.css";

function CharacterSelect({ user, userData }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // 로그아웃 후 App.js에서 자동으로 로그인 화면으로 리다이렉트됩니다
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="character-select-container">
      <div className="header">
        <div className="user-info">
          <h2>캐릭터 선택</h2>
          <p className="welcome-text">{userData?.nickname}님, 환영합니다!</p>
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
            <p>따뜻한 가을의 정취를 담은 캐릭터</p>
            <button className="select-btn">선택하기</button>
          </div>
          
          <div className="character-card">
            <div className="character-avatar">🌸</div>
            <h3>벚꽃</h3>
            <p>봄의 아름다움을 담은 캐릭터</p>
            <button className="select-btn">선택하기</button>
          </div>
          
          <div className="character-card">
            <div className="character-avatar">❄️</div>
            <h3>눈송이</h3>
            <p>겨울의 신비로움을 담은 캐릭터</p>
            <button className="select-btn">선택하기</button>
          </div>
          
          <div className="character-card">
            <div className="character-avatar">🌻</div>
            <h3>해바라기</h3>
            <p>여름의 활기찬 에너지를 담은 캐릭터</p>
            <button className="select-btn">선택하기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterSelect; 