// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCPFWFfOu52lXsn4zw9g_MpolXliKSAz0",
  authDomain: "qur3a-acad5.firebaseapp.com",
  databaseURL: "https://qur3a-acad5-default-rtdb.firebaseio.com",
  projectId: "qur3a-acad5",
  storageBucket: "qur3a-acad5.firebasestorage.app",
  messagingSenderId: "43636337221",
  appId: "1:43636337221:web:201025dca4d26e9713512c"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let currentRoomCode = "2442";
let currentUser = "";
let isHost = false;
let roomRef = null;

const screens = {
  home: document.getElementById("homeScreen"),
  create: document.getElementById("createScreen"),
  join: document.getElementById("joinScreen"),
  waiting: document.getElementById("waitingScreen"),
  game: document.getElementById("gameScreen")
};

const createButton = document.getElementById("createButton");
const joinButton = document.getElementById("joinButton");
const createGameButton = document.getElementById("createGameButton");
const joinGameButton = document.getElementById("joinGameButton");
const backFromCreate = document.getElementById("backFromCreate");
const backFromJoin = document.getElementById("backFromJoin");
const copyCodeButton = document.getElementById("copyCodeButton");
const addQuestionButton = document.getElementById("addQuestionButton");
const startGameButton = document.getElementById("startGameButton");
const drawButton = document.getElementById("drawButton");
const leaveGameButton = document.getElementById("leaveGameButton");

const hostNameInput = document.getElementById("hostName");
const createPinInput = document.getElementById("createPinInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const playerNameInput = document.getElementById("playerName");
const joinError = document.getElementById("joinError");
const roomCodeDisplay = document.getElementById("roomCode");
const gameRoomCodeDisplay = document.getElementById("gameRoomCode");
const questionInput = document.getElementById("questionInput");
const playersList = document.getElementById("playersList");
const questionsList = document.getElementById("questionsList");
const playerCount = document.getElementById("playerCount");
const questionCount = document.getElementById("questionCount");
const onlineCount = document.getElementById("onlineCount");
const hostControls = document.getElementById("hostControls");
const waitingMessage = document.getElementById("waitingMessage");

const selectedPlayerDisplay = document.getElementById("selectedPlayer");
const selectedQuestionDisplay = document.getElementById("selectedQuestion");
const questionBox = document.getElementById("questionBox");
const drawStatus = document.getElementById("drawStatus");
const gamePlayersList = document.getElementById("gamePlayersList");
const remainingPlayers = document.getElementById("remainingPlayers");

function showScreen(screenName) {
  Object.keys(screens).forEach(key => {
    if (screens[key]) screens[key].classList.remove("active");
  });
  if (screens[screenName]) screens[screenName].classList.add("active");
}

createButton?.addEventListener("click", () => showScreen("create"));
joinButton?.addEventListener("click", () => showScreen("join"));
backFromCreate?.addEventListener("click", () => showScreen("home"));
backFromJoin?.addEventListener("click", () => showScreen("home"));

createGameButton?.addEventListener("click", () => {
  const hostName = hostNameInput.value.trim();
  const pin = createPinInput ? createPinInput.value.trim() : "2442";

  if (!hostName) {
    alert("A3fak kteb smiytek!");
    return;
  }

  currentUser = hostName;
  isHost = true;
  currentRoomCode = pin || "2442";
  roomRef = db.ref(`rooms/${currentRoomCode}`);

  roomRef.set({
    created: Date.now(),
    host: currentUser,
    state: "lobby"
  });

  roomRef.child(`players/${currentUser}`).set({
    name: currentUser,
    isHost: true
  });

  setupRoomListeners();
  enterLobby();
});

joinGameButton?.addEventListener("click", () => {
  const code = roomCodeInput.value.trim();
  const name = playerNameInput.value.trim();
  joinError.innerText = "";

  if (!code || !name) {
    joinError.innerText = "Kteb code w smiya dyalek!";
    return;
  }

  db.ref(`rooms/${code}`).once('value', (snapshot) => {
    if (!snapshot.exists()) {
      joinError.innerText = "Had code ma kaynch! T2kkad mno.";
      return;
    }

    currentUser = name;
    isHost = false;
    currentRoomCode = code;
    roomRef = db.ref(`rooms/${currentRoomCode}`);

    roomRef.child(`players/${currentUser}`).set({
      name: currentUser,
      isHost: false
    });

    setupRoomListeners();
    enterLobby();
  });
});

function enterLobby() {
  if (roomCodeDisplay) roomCodeDisplay.innerText = currentRoomCode;
  if (gameRoomCodeDisplay) gameRoomCodeDisplay.innerText = currentRoomCode;

  if (isHost) {
    hostControls?.classList.remove("hidden");
    waitingMessage?.classList.add("hidden");
  } else {
    hostControls?.classList.add("hidden");
    waitingMessage?.classList.remove("hidden");
  }

  showScreen("waiting");
}

function setupRoomListeners() {
  roomRef.child('players').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    const playerArray = Object.values(data);
    
    if (playerCount) playerCount.innerText = playerArray.length;
    if (onlineCount) onlineCount.innerText = playerArray.length;
    if (remainingPlayers) remainingPlayers.innerText = playerArray.length;

    renderPlayersLobby(playerArray);
    renderPlayersGame(playerArray);
  });

  roomRef.child('questions').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    const questionArray = Object.values(data);
    
    if (questionCount) questionCount.innerText = questionArray.length;
    renderQuestionsLobby(questionArray);
  });

  roomRef.child('state').on('value', (snapshot) => {
    const state = snapshot.val();
    if (state === "playing") {
      showScreen("game");
      setupChatUI();
      setupHistoryUI(); // تجهيز واجهة السجل
    } else if (state === "lobby") {
      showScreen("waiting");
    }
  });

  roomRef.child('lastDraw').on('value', (snapshot) => {
    const drawData = snapshot.val();
    if (drawData && drawData.timestamp > Date.now() - 10000) {
      animateAndShowDrawResult(drawData.player, drawData.question);
    }
  });

  // الاستماع للرسائل في الوقت الفعلي
  roomRef.child('chat').on('value', (snapshot) => {
    const chatData = snapshot.val() || {};
    renderChatMessages(chatData);
  });

  // الاستماع لـ Historique اللعبة في الوقت الفعلي
  roomRef.child('history').on('value', (snapshot) => {
    const historyData = snapshot.val() || {};
    renderHistoryItems(Object.values(historyData));
  });
}

function renderPlayersLobby(players) {
  if (!playersList) return;
  playersList.innerHTML = "";
  players.forEach(p => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="avatar">${p.name.charAt(0).toUpperCase()}</div>
      <span>${p.name}</span>
      ${p.isHost ? '<span class="host-badge">👑 Host</span>' : ''}
    `;
    playersList.appendChild(item);
  });
}

function renderPlayersGame(players) {
  if (!gamePlayersList) return;
  gamePlayersList.innerHTML = "";
  players.forEach(p => {
    const chip = document.createElement("div");
    chip.className = "game-player";
    chip.innerHTML = `<span>👤</span> ${p.name}`;
    gamePlayersList.appendChild(chip);
  });
}

function renderQuestionsLobby(questions) {
  if (!questionsList) return;
  questionsList.innerHTML = "";
  questions.forEach(q => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<span>❓</span> <span>${q.text}</span>`;
    questionsList.appendChild(item);
  });
}

addQuestionButton?.addEventListener("click", () => {
  const text = questionInput.value.trim();
  if (!text) return;

  roomRef.child('questions').push({ text: text, addedBy: currentUser });
  questionInput.value = "";
});

copyCodeButton?.addEventListener("click", () => {
  navigator.clipboard.writeText(currentRoomCode);
  alert("Code dyal la partie t-copia! Sifto l s7abek 📋");
});

leaveGameButton?.addEventListener("click", () => {
  if (confirm("Bghiti tkherj mn la partie?")) {
    roomRef.child(`players/${currentUser}`).remove();
    showScreen("home");
  }
});

startGameButton?.addEventListener("click", () => {
  roomRef.child('questions').once('value', (snapshot) => {
    if (!snapshot.exists()) {
      alert("Zido chi sou2al hwa l'lowel 3ad bda lqor3a!");
      return;
    }
    roomRef.update({ state: "playing" });
  });
});

drawButton?.addEventListener("click", () => {
  drawButton.disabled = true;

  roomRef.once('value', (snapshot) => {
    const data = snapshot.val() || {};
    const playersArr = Object.values(data.players || {});
    const questionsArr = Object.values(data.questions || {});

    if (playersArr.length === 0 || questionsArr.length === 0) return;

    const randomPlayer = playersArr[Math.floor(Math.random() * playersArr.length)].name;
    const randomQuestion = questionsArr[Math.floor(Math.random() * questionsArr.length)].text;

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    // تسجيل القرعة في الـ History
    roomRef.child('history').push({
      player: randomPlayer,
      question: randomQuestion,
      time: timeStr,
      timestamp: Date.now()
    });

    roomRef.child('lastDraw').set({
      player: randomPlayer,
      question: randomQuestion,
      timestamp: Date.now()
    });
  });
});

function animateAndShowDrawResult(player, question) {
  questionBox?.classList.add("hidden");
  if (drawStatus) drawStatus.innerText = "Lqor3a kaddor...";
  
  let counter = 0;
  const names = ["...", "🎲", "⚡", "✨", player];

  const interval = setInterval(() => {
    if (selectedPlayerDisplay) selectedPlayerDisplay.innerText = names[counter % names.length];
    counter++;

    if (counter > 12) {
      clearInterval(interval);
      if (selectedPlayerDisplay) selectedPlayerDisplay.innerText = player;
      if (selectedQuestionDisplay) selectedQuestionDisplay.innerText = `"${question}"`;
      questionBox?.classList.remove("hidden");
      if (drawStatus) drawStatus.innerText = "T9r3at lqor3a! 🎉";
      if (drawButton) drawButton.disabled = false;

      if (typeof confetti === 'function') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }
  }, 120);
}

// 1. إنشاء واجهة الشات والتعليقات
function setupChatUI() {
  let chatBox = document.getElementById("chatBoxContainer");
  if (!chatBox) {
    chatBox = document.createElement("div");
    chatBox.id = "chatBoxContainer";
    chatBox.className = "glass-card";
    chatBox.style.cssText = "margin-top: 25px; padding: 20px; border-radius: 20px; text-align: left;";
    
    chatBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; color: #7c9cff; display: flex; align-items: center; gap: 6px;">
          <span>💬</span> Chat & Ta3liqat
        </h3>
        <span style="font-size: 10px; color: #8189a8;">(Kliqi 🗑️ bach tmasah meysage dyalak)</span>
      </div>
      <div id="chatMessages" style="max-height: 160px; overflow-y: auto; font-size: 13px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;"></div>
      <div style="display: flex; gap: 8px;">
        <input id="answerInput" type="text" placeholder="Kteb meysage awla ta3liq..." style="margin: 0; font-size: 13px; flex: 1;">
        <button id="sendAnswerBtn" class="add-btn" style="width: 45px; font-size: 18px;">➔</button>
      </div>
    `;

    const drawArea = document.querySelector(".draw-area");
    if (drawArea && drawArea.parentNode) {
      drawArea.parentNode.insertBefore(chatBox, drawArea.nextSibling);
    }

    document.getElementById("sendAnswerBtn").addEventListener("click", sendMessage);
    document.getElementById("answerInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
}

// 2. إنشاء واجهة سجل القرعة (Historique)
function setupHistoryUI() {
  let historyBox = document.getElementById("historyBoxContainer");
  if (!historyBox) {
    historyBox = document.createElement("div");
    historyBox.id = "historyBoxContainer";
    historyBox.className = "glass-card";
    historyBox.style.cssText = "margin-top: 25px; padding: 20px; border-radius: 20px; text-align: left;";
    
    historyBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; color: #c17cff; display: flex; align-items: center; gap: 6px;">
          <span>📜</span> Historique d'L'Qor3a
        </h3>
        ${isHost ? `<button onclick="clearHistory()" style="background: none; border: none; color: #ff718a; font-size: 11px; cursor: pointer;">🗑️ Masah L'Historique</button>` : ''}
      </div>
      <div id="historyList" style="max-height: 180px; overflow-y: auto; font-size: 13px; display: flex; flex-direction: column; gap: 8px;"></div>
    `;

    const chatBox = document.getElementById("chatBoxContainer");
    if (chatBox && chatBox.parentNode) {
      chatBox.parentNode.insertBefore(historyBox, chatBox.nextSibling);
    }
  }
}

function sendMessage() {
  const answerInput = document.getElementById("answerInput");
  const text = answerInput.value.trim();
  if (!text) return;

  roomRef.child('chat').push({
    sender: currentUser,
    text: text,
    timestamp: Date.now()
  });

  answerInput.value = "";
}

function renderChatMessages(chatData) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  chatMessages.innerHTML = "";
  Object.keys(chatData).forEach(msgId => {
    const msg = chatData[msgId];
    const isMyMessage = msg.sender.toLowerCase() === currentUser.toLowerCase();

    const div = document.createElement("div");
    div.className = "item";
    div.style.cssText = "padding: 8px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); display: flex; justify-content: space-between; align-items: center;";
    
    div.innerHTML = `
      <div>
        <strong style="color: ${isMyMessage ? '#c17cff' : '#7c9cff'};">${msg.sender}:</strong>
        <span style="color: #fff; margin-left: 6px;">${msg.text}</span>
      </div>
      ${(isMyMessage || isHost) ? `<button onclick="deleteMessage('${msgId}')" style="background: none; border: none; color: #ff718a; font-size: 13px; cursor: pointer; padding: 2px 5px;" title="Masah">🗑️</button>` : ''}
    `;
    chatMessages.appendChild(div);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// عرض السجل
function renderHistoryItems(historyArray) {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = "";
  if (historyArray.length === 0) {
    historyList.innerHTML = `<span style="color: #8189a8; font-size: 12px;">Baqi ma kayn 7ta resultat f l'historique...</span>`;
    return;
  }

  // ترتيب السجل من الأحدث إلى الأقدم
  historyArray.reverse().forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.style.cssText = "padding: 10px 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.035); display: flex; flex-direction: column; gap: 4px;";
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: #7c9cff; font-size: 14px;">🎯 ${item.player}</strong>
        <span style="font-size: 10px; color: #8189a8;">🕒 ${item.time || ''}</span>
      </div>
      <span style="color: #f4f5ff; font-size: 12px; opacity: 0.9;">❓ "${item.question}"</span>
    `;
    historyList.appendChild(div);
  });
}

window.deleteMessage = function(msgId) {
  if (roomRef && msgId) {
    roomRef.child(`chat/${msgId}`).remove();
  }
};

window.clearHistory = function() {
  if (roomRef && confirm("Bghiti tmasah historique d'lqor3a كاملاً؟")) {
    roomRef.child('history').remove();
  }
};