import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Tutorial from "./components/Tutorial";
import CharacterSelect from "./components/CharacterSelect";
import LetterSystem from "./components/LetterSystem";
import RandomInbox from "./components/RandomInbox";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isRandomMatching, setIsRandomMatching] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [showRandomInbox, setShowRandomInbox] = useState(false);

  useEffect(() => {
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));
    let authUnsubscribe;
    let userUnsubscribe;
    const authPromise = new Promise(resolve => {
      authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        if (firebaseUser) {
          const userRef = doc(db, "users", firebaseUser.uid);
          userUnsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
              setUserData(userSnap.data());
            } else {
              setUserData(null);
            }
            resolve();
          });
        } else {
          setUserData(null);
          resolve();
        }
      });
    });
    Promise.all([minLoadingTime, authPromise]).then(() => {
      setLoading(false);
    });
    return () => {
      if (authUnsubscribe) authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  // 캐릭터 선택 시 콜백
  const handleCharacterSelect = (characterId) => {
    if (characterId === 'random_matching') {
      setShowRandomInbox(true);
    } else {
      setSelectedCharacter(characterId);
    }
  };

  // 편지 시스템에서 돌아가기
  const handleBackToCharacterSelect = () => {
    setSelectedCharacter(null);
    setCurrentMatch(null);
    setShowRandomInbox(false);
  };

  // 랜덤 매칭 완료 시 콜백
  const handleRandomMatchComplete = (matchId, otherUserNickname) => {
    setIsRandomMatching(false);
    setCurrentMatch({ matchId, otherUserNickname });
    setSelectedCharacter(`random_${matchId}`);
  };

  // 랜덤 매칭 취소 시 콜백
  const handleRandomMatchCancel = () => {
    setIsRandomMatching(false);
  };

  // 랜덤 편지함에서 새 편지 작성하기 클릭 시
  const handleWriteNewRandomLetter = () => {
    setIsRandomMatching(true);
    setShowRandomInbox(false);
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
        {!user || !userData?.nickname ? (
          <Route path="*" element={<Login onLogin={setUser} />} />
        ) : userData.tutorialDone ? (
          showRandomInbox ? (
            <Route path="*" element={
              <RandomInbox
                user={user}
                onWriteNewLetter={handleWriteNewRandomLetter}
              />
            } />
          ) : isRandomMatching ? (
            <Route path="*" element={
              <LetterSystem 
                user={user} 
                userData={userData} 
                characterId={selectedCharacter}
                onBack={handleBackToCharacterSelect}
                currentMatch={currentMatch}
              />
            } />
          ) : selectedCharacter ? (
            <Route path="*" element={
              <LetterSystem 
                user={user} 
                userData={userData} 
                characterId={selectedCharacter}
                onBack={handleBackToCharacterSelect}
                currentMatch={currentMatch}
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
          <Route path="*" element={<Tutorial user={user} userData={userData} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
