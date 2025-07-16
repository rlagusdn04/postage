import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Tutorial from "./components/Tutorial";
import CharacterSelect from "./components/CharacterSelect";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Firestore에서 유저 정보 불러오기
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
      setLoading(false);
    });
    return () => unsubscribe();
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
          // 튜토리얼 완료 → 캐릭터 선택(메인)
          <Route path="*" element={<CharacterSelect user={user} userData={userData} />} />
        ) : (
          // 튜토리얼 미완료 → 튜토리얼
          <Route path="*" element={<Tutorial user={user} userData={userData} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
