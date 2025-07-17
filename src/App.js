import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Tutorial from "./components/Tutorial";
import CharacterSelect from "./components/CharacterSelect";
import LetterSystem from "./components/LetterSystem";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // 로그인 상태 감지 및 최소 로딩 시간 보장
  useEffect(() => {
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));

    let authUnsubscribe;
    const authPromise = new Promise(resolve => {
      authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
        resolve(); // 인증 및 데이터 로드 완료
      });
    });

    Promise.all([minLoadingTime, authPromise]).then(() => {
      setLoading(false);
    });

    return () => {
      if (authUnsubscribe) {
        authUnsubscribe(); // 컴포넌트 언마운트 시 리스너 정리
      }
    };
  }, []);

  // Login 컴포넌트에서 로그인/닉네임 입력 완료 시 콜백
  const handleLogin = async (firebaseUser) => {
    setUser(firebaseUser);
    if (firebaseUser) {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
    }
  };

  // 캐릭터 선택 시 콜백
  const handleCharacterSelect = (characterId) => {
    setSelectedCharacter(characterId);
  };

  // 편지 시스템에서 돌아가기
  const handleBackToCharacterSelect = () => {
    setSelectedCharacter(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <div className="loading-spinner-large"></div>
          <h2 className="loading-text">Postage</h2>
          <p className="loading-subtext">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 로그인 안 된 경우 */}
        {!user || !userData?.nickname ? (
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        ) : userData.tutorialDone ? (
          // 튜토리얼 완료 → 캐릭터 선택 또는 편지 시스템
          selectedCharacter ? (
            <Route path="*" element={
              <LetterSystem 
                user={user} 
                userData={userData} 
                characterId={selectedCharacter}
                onBack={handleBackToCharacterSelect}
              />
            } />
          ) : (
            <Route path="*" element={
              <CharacterSelect 
                user={user} 
                userData={userData} 
                onCharacterSelect={handleCharacterSelect}
              />
            } />
          )
        ) : (
          // 튜토리얼 미완료 → 튜토리얼
          <Route path="*" element={<Tutorial user={user} userData={userData} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
