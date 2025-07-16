import React, { useState } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./Login.css";

function Login({ onLogin }) {
  const [nickname, setNickname] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // 구글 로그인
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      // Firestore에 유저 문서 생성/업데이트
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || !userSnap.data().nickname) {
        setNickname(""); // 닉네임 입력 UI 표시
      } else {
        onLogin(result.user); // 이미 닉네임 있음 → 바로 로그인 처리
      }
    } catch (e) {
      alert("로그인 실패: " + e.message);
    }
    setLoading(false);
  };

  // 닉네임 저장
  const handleSaveNickname = async () => {
    if (!nickname) return;
    setLoading(true);
    await setDoc(doc(db, "users", user.uid), {
      nickname,
      tutorialDone: false,
      lastSentDate: null,
      selectedCharacterToday: "",
    });
    onLogin(user);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Postage</h1>
          <p className="login-subtitle">당신의 일상을 편지로 전해보세요</p>
        </div>
        
        {!user ? (
          <div className="login-section">
            <button 
              className="google-login-btn" 
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  구글로 로그인
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="nickname-section">
            <div className="user-info">
              <img 
                src={user.photoURL || "https://via.placeholder.com/60"} 
                alt="프로필" 
                className="user-avatar"
              />
              <p className="user-email">{user.email}</p>
            </div>
            <div className="nickname-form">
              <input
                type="text"
                placeholder="닉네임을 입력해주세요"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="nickname-input"
                maxLength={10}
              />
              <button 
                className="save-nickname-btn" 
                onClick={handleSaveNickname} 
                disabled={!nickname || loading}
              >
                {loading ? "저장 중..." : "시작하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login; 