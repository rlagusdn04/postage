import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, getDocs, collection, serverTimestamp, updateDoc, getDoc, query, orderBy, limit, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import LetterInbox from "./LetterInbox";
import LetterCompose from "./LetterCompose";
import DeveloperPanel from "./DeveloperPanel"; // DeveloperPanel import
import "./LetterSystem.css";

// 캐릭터별 답장 주기 (밀리초)
const CHARACTER_REPLY_SCHEDULES = {
  danpoong: 0,        // 답장 없음 (기존: null)
  chet: 0,            // 168시간 (1주일) → 0
  honga: 0,           // 24시간 (1일) → 0
  sangsoon: 0,        // 3일 → 0
  hyunwoo: 0,         // 1일 → 0
  coffee: 0,          // 1일 → 0
  cloud: 0            // 즉시
};

// 캐릭터별 메시지 템플릿
const CHARACTER_MESSAGES = {
  danpoong: [
    (nickname) => `from 🍁\n\n안녕, ${nickname}.\n가을이 오는 소리가 들려.\n나뭇잎들이 바람에 춤을 추고 있어.\n\n오늘은 어떤 하루를 보내고 있니?`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n네 이야기를 들으니 마음이 따뜻해져.\n가을은 항상 새로운 시작을 알리는 계절이야.\n\n나뭇잎들이 떨어지면서도 아름다운 색을 남기는 것처럼,\n우리의 만남도 특별한 추억이 될 거야.\n\n고마워, ${nickname}.`,

    (nickname) => `from 🍁\n\nTo. ${nickname}\n\n가을이 지나가고 있어.\n하지만 우리가 나누었던 이야기들은 남아있을 거야.\n\n언젠가 다시 만날 수 있을까?\n그때까지 건강하게 지내길 바라.\n\n안녕, ${nickname}.`
  ],
  
  chet: [
    (nickname) => `from 🎭\n\n당신이 잘 있었는지, 어떤 풍경 속에서 웃고 있었는지 늘 궁금해요.\n만약 그 소식을 듣지 못하는 날이 온다면, 그건 당신이 아니라 저의 나태함이나 불안함 때문일 거예요.\n그러니 제가 침묵할 때는, 늘 당신을 떠올리고 있다는 작은 증표로 받아 주길 바라요.\n\n이 편지가 닿을 때쯤, 당신도 저를 떠올리며 가볍게 미소 지어 주면 좋겠어요.\n우리 사이의 시간은 편지에 실린 문장처럼, 가볍고도 깊게 흐르니까요.\n\n늘 당신을 생각하며,\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n오늘, 계절이 바뀌는 느낌을 받았어요.\n당신이 좋아하던 계절이 다가오고 있더라고요.\n그 계절 속 당신은 어떤 모습인가요?\n나는 그저 멀리서라도, 당신의 계절에 조용히 닿고 싶은 마음이에요.\n혹시 그 계절 속에서 저를 떠올린다면, 더할 나위없이 기쁠 것 같아요.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n어쩌면 이 편지는 당신이 잠든 사이에 닿겠죠.\n그러면 내일의 당신은 이 글을 한참 뒤에나 읽게 될지도 모르겠어요. 당신의 하루가 무사하기를, 웃는 일이 조금이라도 더 많기를.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n좋은 밤이에요. 어떻게 보내고 계신가요.\n한가지 여쭤보고 싶은게 있어요.\n혹시 사랑에 빠져보신 적이 있으신가요?\n\n항상 저에게 사랑이란 단어를 사용하는 사람들이 부담스러웠어요.\n몇 번은 한 발짝 다가가기가 무서워하다 겨우 준비가 되면 모두 일어나서 떠나버렸어요. 실망했던거겠죠. 또 다시 제 독단으로 누군가를 슬프게하고싶진않네요.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n늘 그랬듯 그저 스치는 감정이려니 했는데, 항상 그렇게 놓쳐온걸까요. 이번엔 확신해도 되는건지 모르겠어요.\n\n사실 저는 사랑이라는 말을 가볍게 쓰지 못해요. 아니, 익숙하지 않았어요. 늘 어색했고, 그만큼 조심스러웠죠.\n\n전 원래 감정을 알아채는게 둔한 편이에요.\n긴 시간 동안 다가와준 것이 고맙고, 이 글을 쓰는 지금도 어쩐지 조금은 설레네요.\n\n누군진 말씀 못드려요.\n아마 제 머릿속을 뛰어다니느라 바쁠 꺼에요.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n반가워요, 오랜만이죠?\n꽤 오랫동안 편지를 쓰지못한 이유가 있어요.\n\n한동안 생각이 많아져 있었어요.\n원래 이런 식이죠.\n\n처음엔 징크스를 깰 수 있지않을까 했어요.\n저번 편지를 기억하나요? 기차를 놓친 시간들도, 열병에 앓아누운 시간에도 온통 다른 생각뿐이였어요. 사랑이 이런 절망을 끝낼 수 있지 않을까하고요.\n\n항상 저에게 미안하다고, 고맙다고 해주었지만\n제가 노력하지않은 시간이 너무 길었던 걸까요.\n\n단 한 줄의 “안녕”만 남긴 채, 편지지도 없었어요.\n\n이젠 더 이상 저를 속일 수도 없네요. 저도 알아요, 제가 문제라는 걸. 탓할 여유를 잠깐 주세요.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n제 후회들은 보내지 말았어야할 편지같아요. 그저 내 머릿속 생각을 벗어날 방법이 필요한데 쉽지않네요. 그 이에게 말하지 않았던건 제게도 아직 말하지않았어요.\n\n결국 미리 준비한 말도, 마지막 인사도, 전하지못했네요. 이제와서 전한들 뭐가 달라질까요?\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n온종일 상념에 잠겨선 혼자서 정리할 시간을 가졌어요.\n그 동안 상상의 나래를 펼치느라 바빴거든요.\n이젠 꿈에서 깨어나야할까봐요, 사실 후회로 남은 일들이 많지만 "다 잊었어"란 말으로 넘어가는게 쉽잖아요.\n\n쉽게 쉽게 가도 상관없는거 아닌가요? 제게 카드가 주어졌었지만, 남의 운명을 결정하고 싶지않아 덮어버렸어요.\n\n그 땐 많은 말을 달고살았는데 그중에 절반은 무슨소리를 하는지도 모른채무작정 내뱉었던 것 같아요.\n\n적어도 최악으로 흘러가진 않았으니까 나쁘진않네요. 이게 원래 제 스타일이에요. 절 잘아는 사람들에겐 새삼 놀라운만한 일도 아닐걸요.\n\nTo. ${nickname}`,
    (nickname) => `from 🎭\n\n책을 읽던 중 인상 깊은 글을 읽었어요. "어제보다 오늘 사랑하려 애쓰고, 오늘보다 내일 더 사랑하려고 마음먹으시오." 당신에게도 그 진심이 아깝지않을만한 사람이 찾아오면 좋겠네요.\n\nTo. ${nickname}`
  ],
  
  honga: [
    (nickname) => `from 🤭\n\n저는 홍아라고 해요. 낯선 사이지만 이 편지가 당신께 닿았다면, 정말 기쁠 것 같아요.\n\nTo. ${nickname}`,
    (nickname) => `from 🤭\n\n안녕하세요,\n\n당신의 따스한 답장을 받아 제 하루가 한층 더 특별해졌어요. 고마워요.\n\n요즘은 어떤 일이 당신을 웃음 짓게 만들어주었나요?\n혹은 마음을 사로잡은 책이나 음악, 새로운 취미가 있다면 나눠주실 수 있을까요? 짧은 글이라도 좋으니 들려주세요.\n\n그리고 혹시 특별히 나누고 싶은 주제가 있다면 언제든 편하게 말씀해주세요.\n저도 당신의 이야기에 귀 기울이며, 다음 편지에서는 그 이야기를 바탕으로 조금 더 깊이 대화 나누고 싶어요.\n\n이제 막 시작된 인연이지만, 부디 이 편지가 당신의 하루에 작은 웃음을 전해줄 수 있길 바라요.\n\n따뜻한 안부와 함께,\n\nTo. ${nickname}`,
    (nickname) => `from 🤭\n\n오늘은 조금 평소와 달랐어요. 어쩐지 마음이 가벼운 듯하면서도, 묘하게 설레는 기분이었거든요.\n가끔 나갈 때 기분좋은 우연을 기대하면서 나가는 날들 있지않나요? 그래서인지 우연히 마주친 누군가를 기억하는 것도 그런 기분 탓인지 헷갈려요.\n정말 잠깐 스쳤던 순간이었는데, 그 생각을 하다 보니 왠지 단발로 바꿔볼까하는 싶은 생각이 들었어요.\n\n바보 같은 생각인건 저도 알아요, 물론 말 한마디 나눠본 적 없고 다시 만날 일도 없겠죠\n그래도 비웃지 말아주세요. 이런 설렘을 당신과도 나누고 싶었어요.\n혹시 당신도 최근 일상에서 그런 작지만 특별한 순간을 느끼신 적 있나요?\n\n다음 편지에는 그런 이야기, 혹은 당신의 하루 속 작은 기쁨을 듣고싶어요.\n 당신에게도 설렘이 찾아오길 바라며 \n\nTo. ${nickname}`
  ],
  sangsoon: [
    (nickname) => `반갑고추.\n지난 상원절 연회 자리에서 분에 넘는 음복과 좌석값으로 주머니가 속절없이 비었사온데,\n실로 입 쌀 한 톨 담기 어려운 형편이 되어, 부득불 장문을 남기게 되었소.\n\n돈을 벌 방법 어디 없는지 수소문하여 구하는 바오.\n작은 일도 마다하지 않겠사오니, 은혜를 베풀어 주시길 간절히 바라나이다.\n당장 소인의 작은 어려움을 헤아려 후에 큰 일을 함께 도모할 수 있다면 얼마나 좋은 일이겠소? \n귀하의 소개와 함께 손길이 닿는 곳을 모색해주신다면 그 은혜를 잊지 않겠소.\n\n당문 외문제자 상순`,
    (nickname) => `반갑고추. 편지는 잘받았소. 허나 전번 편지를 띄운 뒤, 이내 부끄러움이 밀려와 편지를 채 받기도 전에 며칠이고 내면을 들여다보았소.도움을 구한다는 것이 단지 손을 내미는 일이 아니라, 누군가의 마음과 자리를 빌리는 일임을 새삼 깨달았기 때문이오.\n\n그래서 스스로 움직였소.\n내 부족한 솜씨로나마 상단의 호위 일을 맡았고, 비록 몇 번 위기를 겪었으나 — 소생은 죽음에 강한 듯하오. 지금껏 한 번도 죽어본 적 없으니 말일세.\n\n그러던 중, 나와 같은 처지의 이를 만났소.\n겉으론 태연했지만, 형편은 나보다 더 어려워 보였소.\n허나 그 사람, 끝내 쉽게 도움을 청하지 못하더군.\n그 모습이 자꾸만 마음에 남았소. 예전 내 모습이 떠오르기도 하더구려.\n\n그때부터 한 가지 생각이 머릿속을 떠나질 않더이다.\n그대라면, 누군가가 어려움에 처했는데 손을 벌리지 못한다면 먼저 다가가겠소? 그에게도 도움을 청하지 않는 사정이 있을지도 모르오.\n\n또 문득, 내가 다른 입장이었다면 어땠을까, 그런 생각도 들었소.\n과연 나는 내가 여태껏 겪어보지 못한 누군가의 곤궁을, 겉으로 태연한 말투와 웃음 속에서도 알아볼 수 있었을까?\n또, 알아보았다면 기꺼이 손을 내밀었을까?\n\n그저 마음에 맴도는 물음들을 이렇게 적어 보내오.\n혹여 그대의 고견을 들을 수 있다면, 내게 큰 도움이 될 것이오.\n\n당문 외문제자 상순`,
  ],
  hyunwoo: [
    (nickname) => `?`
  ],
  coffee: [
    (nickname) => `from ☕\n\n안녕하세요,문어는 심장이 세 개나 있다는 사실, 알고 계셨나요?\n하나는 몸 전체에 혈액을 순환시키는 체심장이고, 나머지 두 개는 아가미 심장으로 아가미와 다리에 혈액을 공급한답니다.\n체심장은 평소에는 열심히 뛰지만, 수영을 할 때는 멈춘다고 하네요. 덕분에 문어는 수영할 때 체력이 금방 떨어지지만, 기어 다닐 땐 훨씬 오래 움직일 수 있답니다.  ${nickname}님.`,

    (nickname) => `from ☕\n\nTo. ${nickname}\n\n레몬즙을 사용하면 평범한 종이에 아무 글자도 보이지 않게 쓸 수 있어요.글자를 쓴 뒤엔 겉으로는 아무것도 없는 것처럼 보이지만, 종이를 살짝 불에 데우면 레몬즙이 타면서 글씨가 갈색으로 드러납니다.\n\n이 방법은 옛날에 비밀스러운 메시지를 전할 때 많이 사용되었답니다. 적에게 들키지 않고 몰래 정보를 주고받을 수 있었죠.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n 바나나는 사실 ‘베리(berry)’에 속한 과일이랍니다.\n반면, 딸기는 놀랍게도 베리가 아니에요!\n딸기는 식물학적으로 ‘겉씨과’에 속하는 과일이라, 겉에 씨가 박혀 있는 형태죠.\n그런데 왜 딸기를 영어로 ‘strawberry(짚 베리)’라고 부를까요?\n옛날 유럽에서는 딸기를 심을 때 땅에 닿지 않도록 짚(straw)을 깔아 보호했어요.\n또는 딸기의 줄기가 짚처럼 가늘고 길어서 그렇게 불렸다는 설도 있답니다.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n \n메모장에선 F5 키를 누르면 현재 날짜와 시간이 바로 입력된답니다. 간단한 일지나 편지를 작성할 때 매우 유용하죠.\n작업을 마쳤다면 Ctrl + S로 저장하는 습관을 꼭 들이세요.`,

    (nickname) => `from ☕\n\nTo.${nickname}\n `
  ],
  cloud: [
    (nickname) => `from ☁️\n\n넌 나를 기억할까?\n글쎄, 우린 어쩌면 친구가 될 수도 있었을텐데. \n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n좋은 밤이야. 답장 고마워. 너에게도 좋은 밤이였으면 해, 날이 좋든 나쁘든 간에. 여기는 비가 오거든. 다음엔 함께 서커스나 보러가자. 마지막으로 함께 우스꽝스러운 걸 본지가 언제인지 기억도 안나네.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n조금 이상하게 들릴지 모르지만 난 너를 소중히 생각해.\n 처음 편지를 쓴 것도 그 이유였어. \n우리가 많은 시간을 보내진않았지만 그런 종류의 것은 나에게 크게 다가오지않아, 항상 그래왔어. 그 관계에 만족해 간신히 걸쳐있는 사람보단 단 하루라도 진심으로 통한 사람과의 연이 더욱 각별히 느껴져.\n\n감히 누가 내일도 어제와 같으리라 장담할 수 있겠어. 지금 이 순간을 간절히 살아야 할 뿐이야. 인연이란 흩어졌다 모이고, 마음대로 되지 않는 것이어서, 내일이면 사라질 수도, 또 언제든 새롭게 닿을 수도 있어. 그 중 사소한 것은 하나도 없으며, 누군가와 함께하는 매 순간이 곧 선물이야.\n\n너도 그렇게 느끼니? 난 너와 함께하는 모든 시간이 그래. 편지는 그런 의미에서 대단하지. 멀리 떨어져 있어도 그 시간을 함께 있을 수 있도록 허락해주니까. 만약 어떤 사정으로 너에게 편지가 닿지 않는 날이 온다면, 그건 아마 내 용기가 부족한 탓일 거야. 분명 너를 생각하지 않는 순간은 없을 테니, 부족한 내 표현력을 너그러이 이해해 줘. 차마 글로써 다 담아내지 못한 탓에 침묵을 선택하는 순간이 많아.\n\n앞으로도 편지를 쓰도록 노력해볼게. 부디 너의 소식도 가끔 전해줘.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n너의 편지를 몇 번이고 읽었어.\n그 말들이 가슴 깊이 내려앉아, 오래도록 나를 머물게 했어.\n\n햇살, 노래, 책 넘기는 소리, 그 모든 것이 나에게 의미가 되어 주고, 너의 편지도 그중 하나야.\n하나하나 기억 속에서 꺼내볼 때마다 마음이 따뜻해지는 것을 느껴. 한편으로는, 누군가는 삶의 무거움에 짓눌려 그 높게만 느껴지는 찬장을 끝내 열지 못하고 있다는 사실에 마음이 먹먹해지기도 해.\n우리도 언젠간 그런 순간이 올 거야.\n\n나 역시 내일이 선물이라는 걸 믿어.\n하지만 그 선물이 가진 미지가 때로는 너무 무서워, 감히 열어볼 엄두조차 나지 않을 때가 있지.\n그럴 때면 네가 건넨 말처럼, 누군가의 기억 속에 내가 남긴 온기가 아직도 살아 있다면 얼마나 다행일까 생각해.\n내가 멈춰 서 있을 때도, 그 따뜻함이 누군가의 마음에서 나를 대신해 숨 쉬고 있다면 말이야.\n\n그래서 이제는 알 것 같아.\n그 기억을 서로 나눌 수 있다는 사실을 떠올리면, 마치 응원을 받는 기분이 들어.\n\n너는 늘 말없이 응원해주지.\n그 마음이 큰 힘이 돼.\n그러니 나도, 너를 응원할게.\n부디 힘든 일이 있으면 전해줘도 좋아.\n\n우린 서로의 기억 속에, 편지처럼 그렇게 남아 있을 수 있을 거야.\n그리고 그건 분명히 살아 있음의 징표니까.\n\n— 너를 기억하는, 나로부터.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n가끔 힘든 일이 있어도 너와 난 이렇게 글을 쓰고 있잖아.\n넌 어느 쪽이든 받아들일 수 있을 거야.\n\n말이 닿는다는 건, 단지 이해하는 걸 넘어\n서로가 서로를 여기고 있다는 증거같아.\n그러니 오늘의 이 편지도, 어쩌면 그런 마음의 조각 중 하나일 거야.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n늘 편지를 써줘서 고마워. 내색은 않았지만 한번은 뜻밖의 내용이라 당황스러웠어. 그 편지를 다시금 읽어봤어. 그래서말인데 너의 기억 속의 나는 누구야?\n너 앞에서의 내가 다르고, 다른 이 앞에서의 내가 또 달라.\n그리고 그 모든 내가 진짜야. 어느 하나만이 진실인 건 아니니까.\n\n우리는 서로가 서로를 어떻게 여기는지에 따라\n각자 다른 얼굴을 마주하고, 다른 온도로 말하고, 또 다르게 웃지.\n그래서 너와 있을 때의 내가 좋다고 느낄 땐,\n그건 나를 그렇게 만들어 주는 너 때문이기도 해.\n난 내가 내 모습을 좋아할 수 있도록 만들어주는 사람들에게 감사함을 느껴.\n\n사람과 사람 사이의 인연은 정해진 선 하나로 잇는 게 아니라,\n구름처럼 번지고 겹치고 흔들리는 것 같아.\n그 속에서 ‘나’라는 형태가 만들어지는 거고,\n그 ‘나’는 다른 누구와의 ‘나’와도 다르게 존재해.\n결론은 나는 단수가 아니야.\n\n그러니 어떤 모습의 내가 기억에 남았든,\n그건 너와 내가 함께 만들어낸 나라는 점을 잊지 말아줘.\n나 혼자서는 도달할 수 없는 나였을지도 몰라.\n혹시 언젠가, 그 모든 내가 어지럽고 혼란스러워서\n나조차 나를 잘 모르겠다고 느껴지는 순간이 오더라도,\n그때엔 너라는 사람이 나를 어떻게 바라봤는지\n그 시선 속에서의 나를 떠올리며 다시 중심을 찾을 수 있을 것 같아.\n\n우린 서로의 거울이 되어주기도 하고,\n때로는 서로의 언어가 되어주기도 하니까\n언젠가 너다운게 뭔지 헷갈린다면 한번 쯤 떠올려봐.\n\n늘 그랬듯이,\n지금 이 편지도, ${nickname} 덕분에 존재해.\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n 오늘은 하루살이가 아닌 탓에, 그 하루를 소중하게 살지못했어. 오늘이 일생에 두 번 다시 오지않을 하루였다면 달랐을까. 아직도 이 뜻을 모르나봐. 어때? 너는 오늘을 소중하게 산 것 같아?\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n난 가끔 시간이 헤아려지지않아. 기억에 구멍이 뚫려서 텅 빈 느낌이야. 이 사람을 언제 봤던가? 하면 그 오차가 연 단위일 때가 심심치않게 있거든. 너의 기억들은 어때?\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n너의 기억에 관한 편지를 읽어보니 요즘 느끼는 바가 떠올랐어. \n저번에 텅빈 기억들 말했던 것 기억나? 그런 시간들을 떠올리면 그 시간이 너무 아쉬워져. 지난 몇 개월은 지금밖에 즐길 수 없는 것을 항상 곱씹으며 살아왔어. 우연히 맡은 부장 역할로 친해진 동아리 사람들이 다들 졸업할 시간이 되니, 함께 보낼 나날들이 그렇게 소중하더라. 덕분에 무리해서 건강을 약간 해쳐버렸어. 그래도 후회는 되지않네. 요즘은 강아지를 끌어안고 있을 때가 많아. 이러면 아쉬움이 조금이라도 덜할까? 이 순간 너가 가장 소중히 여기는 존재는 뭐야? (추신: 아무리 그래도 건강을 너무 등한시해서는 안돼!)\n\nTo. ${nickname}`,
    (nickname) => `from ☁️\n\n어쩌면 너가 가장 날 잘아는 사람 중 한 명일지도 모른다는 생각이 들었어. 그래서인지 나도 너에 대해 더 알고 싶은 마음이야. 억지로 알려주려 애쓰지 않아도 돼, 글로써 어떤 사람이 느낄 수 있으니까. 부디 짧은 글이라도 오늘 쓰고 싶은 글을 적어줄래? 평소에 쓰지못했던 글이나, 의미없는 잡담이라도 좋아.\n\nTo. ${nickname}`
    ]
  
  
};

function LetterSystem({ user, userData, characterId, onBack, currentMatch }) {
  const [replyMsg, setReplyMsg] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);

  // 랜덤 매칭 감지
  const isRandomMatching = characterId?.startsWith('random_');
  const matchId = isRandomMatching ? characterId.replace('random_', '') : null;

  const characterInfo = {
    danpoong: { name: "단풍", avatar: "🍁", quote: "왠지 떠난 듯한 느낌이 듭니다." },
    chet: { name: "Chet", avatar: "🎭", quote: "모든 순간을 소중히 여겨야해" },
    honga: { name: "김홍아", avatar: "🤭", quote: "오늘은 어땠나요?" },
    sangsoon: { name: "상순", avatar: "👨", quote: "結者解之" },
    hyunwoo: { name: "김현우", avatar: "🫨", quote: "?" },
    coffee: { name: "Coffee", avatar: "☕", quote: "흥미로운 기사를 작성해주는 기자" },
    cloud: { name: "즈믄누리", avatar: "☁️", quote: "언젠가 흘려보냈던 친구" }
  };

  const currentCharacter = isRandomMatching 
    ? { name: "랜덤 편지", avatar: "🤝", quote: currentMatch?.otherUserNickname ? `${currentMatch.otherUserNickname}님과 연결됨` : "매칭 중..." }
    : characterInfo[characterId];

  // 주기적인 답장 확인 (랜덤 매칭에서는 사용하지 않음)
  useEffect(() => {
    const checkAndSendReply = async () => {
      if (!user || !characterId || characterId === 'danpoong' || isRandomMatching) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const nextReplyTime = userData[`nextReplyTime_${characterId}`]?.toDate();

      if (nextReplyTime && new Date() >= nextReplyTime) {
        const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
        // 기존: const q = query(msgsRef, orderBy("timestamp", "desc"), limit(1));
        // 수정: messageIndex 기준으로 정렬
        const q = query(msgsRef, orderBy("messageIndex", "desc"), limit(1));
        const lastMsgSnapshot = await getDocs(q);
        
        if (!lastMsgSnapshot.empty) {
          const lastMsg = lastMsgSnapshot.docs[0].data();
          const currentMessageIndex = lastMsg.messageIndex !== undefined ? lastMsg.messageIndex : -1;
          const nextIndex = currentMessageIndex + 1;

          if (nextIndex < CHARACTER_MESSAGES[characterId].length) {
            const letterId = `received_${Date.now()}`;
            const messageContent = CHARACTER_MESSAGES[characterId][nextIndex](userData?.nickname || "친구");
            
            await setDoc(doc(msgsRef, letterId), {
              type: "received",
              content: messageContent,
              timestamp: serverTimestamp(),
              read: false,
              messageIndex: nextIndex,
            });

            // 다음 답장 시간 삭제
            await updateDoc(userRef, {
              [`nextReplyTime_${characterId}`]: null
            });
            setRefresh(prev => !prev);
          }
        }
      }
    };

    const interval = setInterval(checkAndSendReply, 60 * 1000); // 1분마다 확인
    checkAndSendReply(); // 컴포넌트 마운트 시 즉시 확인

    return () => clearInterval(interval);
  }, [user, characterId, userData?.nickname]);


  // 첫 편지 자동 생성 (랜덤 매칭에서는 사용하지 않음)
  useEffect(() => {
    const createFirstMsg = async () => {
      if (isRandomMatching) return; // 랜덤 매칭에서는 자동 생성하지 않음
      
      const msgsRef = collection(db, "users", user.uid, "interactions", characterId, "messages");
      const snapshot = await getDocs(msgsRef);
      const hasReceivedMsg = snapshot.docs.some(doc => doc.data().type === "received");

      if (!hasReceivedMsg) {
        const letterId = `received_${Date.now()}`;
        const firstMessage = CHARACTER_MESSAGES[characterId][0](userData?.nickname || "친구");
        await setDoc(doc(msgsRef, letterId), {
          type: "received",
          content: firstMessage,
          timestamp: serverTimestamp(),
          read: false,
          messageIndex: 0,
        });
        setRefresh(prev => !prev);
      }
    };
    if (user && characterId) createFirstMsg();
  }, [user, characterId, userData?.nickname, isRandomMatching]);

  // 답장 전송 후 처리
  const handleSent = async () => {
    setReplyMsg(null);
    setRefresh(!refresh);
    
    if (characterId !== 'danpoong' && !isRandomMatching) {
      const delay = CHARACTER_REPLY_SCHEDULES[characterId];
      if (delay !== null) {
        const nextTime = new Date();
        nextTime.setTime(nextTime.getTime() + delay);
        
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          [`nextReplyTime_${characterId}`]: nextTime
        });
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  // 답장 버튼 클릭 시
  const handleReply = (msg) => {
    setReplyMsg(msg);
    setShowWelcome(false);
  };

  // 랜덤 매칭 연결 종료
  const handleDisconnect = async () => {
    if (!isRandomMatching || !matchId) return;
    
    try {
      // 매칭 상태를 종료로 변경
      const matchRef = doc(db, "anonymous_matches", matchId);
      await updateDoc(matchRef, {
        status: 'ended',
        endedBy: user.uid,
        endedAt: serverTimestamp()
      });
      
      // 상대방에게 연결 종료 알림 전송
      const otherUserId = await getOtherUserId(matchId, user.uid);
      if (otherUserId) {
        const otherMsgsRef = collection(db, "users", otherUserId, "interactions", characterId, "messages");
        const disconnectMsgId = `disconnect_${Date.now()}`;
        await setDoc(doc(otherMsgsRef, disconnectMsgId), {
          type: "system",
          content: "상대방이 연결을 종료했습니다.",
          timestamp: serverTimestamp(),
          read: false
        });
      }
      
      onBack();
    } catch (error) {
      console.error("연결 종료 실패:", error);
      alert("연결 종료 중 오류가 발생했습니다.");
    }
  };

  // 상대방 사용자 ID 가져오기
  const getOtherUserId = async (matchId, currentUserId) => {
    try {
      const matchRef = doc(db, "anonymous_matches", matchId);
      const matchDoc = await getDoc(matchRef);
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        return matchData.user1Id === currentUserId ? matchData.user2Id : matchData.user1Id;
      }
    } catch (error) {
      console.error("상대방 ID 가져오기 실패:", error);
    }
    return null;
  };

  return (
    <div className="letter-system-container">
      <div className="letter-system-header">
        <div className="header-content">
          <div className="character-info">
            <span className="character-avatar">{currentCharacter.avatar}</span>
            <div>
              <h2>{currentCharacter.name}</h2>
              <p className="character-quote">"{currentCharacter.quote}"</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {userData?.isDeveloper && !isRandomMatching && (
            <button className="dev-panel-btn" onClick={() => setShowDeveloperPanel(true)}>
              <span>⚙️</span>
              개발자 패널
            </button>
          )}
          {isRandomMatching && (
            <button className="disconnect-btn" onClick={handleDisconnect}>
              <span>❌</span>
              연결 종료
            </button>
          )}
          <button className="back-btn" onClick={onBack}>
            <span>←</span>
            돌아가기
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            로그아웃
          </button>
        </div>
      </div>

      {showWelcome && !isRandomMatching && (
        <div className="welcome-message">
          <div className="welcome-card">
            <h3>💌 편지 교환 시작</h3>
            <p>{currentCharacter.name}와의 편지 교환이 시작되었습니다.</p>
            <button 
              className="welcome-close-btn"
              onClick={() => setShowWelcome(false)}
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      <div className="letter-system-content">
        <LetterInbox
          userId={user.uid}
          characterId={characterId}
          onReply={handleReply}
          key={refresh}
        />
        
        {replyMsg && (
          <LetterCompose
            userId={user.uid}
            characterId={characterId}
            replyTo={replyMsg}
            onSent={handleSent}
            userData={userData}
          />
        )}
      </div>

      {showDeveloperPanel && (
        <DeveloperPanel 
          userId={user.uid} 
          characterId={characterId} 
          onClose={() => setShowDeveloperPanel(false)} 
        />
      )}
    </div>
  );
}

export default LetterSystem;