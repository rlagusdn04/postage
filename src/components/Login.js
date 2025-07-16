import React, { useState } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

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
    <div>
      {!user ? (
        <button onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "로그인 중..." : "구글로 로그인"}
        </button>
      ) : (
        <div>
          <input
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
          <button onClick={handleSaveNickname} disabled={!nickname || loading}>
            {loading ? "저장 중..." : "닉네임 저장"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Login; 