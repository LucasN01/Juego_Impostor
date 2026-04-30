function getPista(palabra, categoria) {
  if (PISTAS[palabra]) return PISTAS[palabra];
  const catMap = {
    "Países":"País del mundo","Fútbol":"Relacionado con el fútbol",
    "Cine y TV":"Película o serie","Famosos Arg":"Famoso argentino",
    "Famosos":"Persona famosa","Objetos":"Objeto cotidiano"
  };
  return catMap[categoria] || "Pista general";
}

// STATE
let state = {
  playerCount: 4,
  players: [],
  impostors: 1,
  mode: 'CLASICO',
  pistaActiva: false,
  secretWord: '',
  categoria: '',
  excludedIndex: -1,
  impostorIndices: [],
  currentPlayer: 0,
  cardFlipped: false,
  wordShown: false,
  availableWords: [],
  selectedCategories: new Set(['Países','Fútbol','Cine y TV']),
};

// NAVIGATION
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0,0);
}

// HOME
function showRules() {
  const m = document.getElementById('rulesModal');
  m.style.display = 'flex';
}
function hideRules() {
  document.getElementById('rulesModal').style.display = 'none';
}

// PLAYER COUNT
function changeCount(delta) {
  state.playerCount = Math.max(3, Math.min(30, state.playerCount + delta));
  document.getElementById('playerCount').textContent = state.playerCount;
}

function goToNames() {
  const container = document.getElementById('namesContainer');
  container.innerHTML = '';
  for (let i = 0; i < state.playerCount; i++) {
    const existing = state.players[i] || '';
    const div = document.createElement('div');
    div.style.cssText = 'width:100%;margin-bottom:10px;';
    div.innerHTML = `<input type="text" placeholder="Jugador ${i+1}" value="${existing}" data-idx="${i}" style="width:100%;" onkeydown="if(event.key==='Enter'){const nxt=document.querySelector('[data-idx=\\'${i+1}\\']');if(nxt)nxt.focus();}">`;
    container.appendChild(div);
  }
  goTo('screenNames');
  setTimeout(() => {
    const first = container.querySelector('input');
    if (first) first.focus();
  }, 200);
}

function goToSetup() {
  const inputs = document.querySelectorAll('#namesContainer input');
  state.players = [];
  for (let inp of inputs) {
    const v = inp.value.trim();
    if (!v) { inp.style.borderColor='var(--accent)'; inp.focus(); return; }
    inp.style.borderColor = '';
    state.players.push(v);
  }
  state.impostors = Math.min(state.impostors, state.players.length - 1);
  document.getElementById('totalPlayers').textContent = state.players.length;
  document.getElementById('impostorCount').textContent = state.impostors;
  goTo('screenSetup');
}

// SETUP
function selectMode(mode) {
  state.mode = mode;
  document.getElementById('modeClasico').classList.toggle('active', mode==='CLASICO');
  document.getElementById('modeCategorias').classList.toggle('active', mode==='CATEGORIAS');
}

function changeImpostors(delta) {
  const max = state.players.length - 1;
  state.impostors = Math.max(1, Math.min(max, state.impostors + delta));
  document.getElementById('impostorCount').textContent = state.impostors;
}

function goToGameMode() {
  state.pistaActiva = document.getElementById('togglePista').checked;
  if (state.mode === 'CLASICO') {
    buildExcludeList();
    goTo('screenClassic');
  } else {
    buildCatGrid();
    goTo('screenCategories');
  }
}

// CLASSIC
function buildExcludeList() {
  const container = document.getElementById('excludeList');
  container.innerHTML = '';
  state.players.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-cat';
    btn.dataset.idx = i;
    btn.innerHTML = `<span>${p[0].toUpperCase()}</span><span style="font-size:0.8rem;">${p}</span>`;
    if (i === (state.excludedIndex === -1 ? 0 : state.excludedIndex)) btn.classList.add('selected');
    btn.onclick = () => {
      document.querySelectorAll('#excludeList .btn-cat').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.excludedIndex = i;
    };
    container.appendChild(btn);
  });
  if (state.excludedIndex === -1) state.excludedIndex = 0;
}

function startGame() {
  const word = document.getElementById('secretWord').value.trim();
  if (!word) { document.getElementById('secretWord').style.borderColor='var(--accent)'; return; }
  state.secretWord = word;
  state.categoria = '';
  state.availableWords = [];
  assignImpostors();
  startRound();
}

// CATEGORIES
function buildCatGrid() {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = '';
  const catIcons = {"Países":"🌍","Fútbol":"⚽","Cine y TV":"🎬","Famosos Arg":"🇦🇷","Famosos":"⭐","Objetos":"📦"};
  Object.keys(CATEGORIES).forEach(cat => {
    const btn = document.createElement('div');
    btn.className = 'btn-cat' + (state.selectedCategories.has(cat) ? ' selected' : '');
    btn.innerHTML = `<span>${catIcons[cat]||'📌'}</span><span>${cat}</span>`;
    btn.onclick = () => {
      if (state.selectedCategories.has(cat)) {
        if (state.selectedCategories.size > 1) state.selectedCategories.delete(cat);
      } else {
        state.selectedCategories.add(cat);
      }
      btn.classList.toggle('selected', state.selectedCategories.has(cat));
    };
    grid.appendChild(btn);
  });
}

function startCategoriesGame() {
  const allWords = [];
  state.selectedCategories.forEach(cat => {
    CATEGORIES[cat].forEach(w => allWords.push({word:w, cat}));
  });
  const chosen = allWords[Math.floor(Math.random()*allWords.length)];
  state.secretWord = chosen.word;
  state.categoria = chosen.cat;
  state.availableWords = allWords;
  state.excludedIndex = -1;
  assignImpostors();
  startRound();
}

// GAME LOGIC
function assignImpostors() {
  state.impostorIndices = [];
  const possible = state.players.map((_,i) => i);

  if (state.mode === 'CLASICO') {
    const nameMatch = state.players.findIndex(p => p.toLowerCase() === state.secretWord.toLowerCase());
    if (nameMatch !== -1) {
      state.impostorIndices.push(nameMatch);
      const rest = possible.filter(i => i !== nameMatch && i !== state.excludedIndex);
      rest.sort(() => Math.random()-0.5);
      state.impostorIndices.push(...rest.slice(0, state.impostors - 1));
    } else {
      const rest = possible.filter(i => i !== state.excludedIndex);
      rest.sort(() => Math.random()-0.5);
      state.impostorIndices = rest.slice(0, state.impostors);
    }
  } else {
    const rest = [...possible].sort(() => Math.random()-0.5);
    state.impostorIndices = rest.slice(0, state.impostors);
  }
}

function startRound() {
  state.currentPlayer = 0;
  state.cardFlipped = false;
  state.wordShown = false;
  goTo('screenGame');
  showCurrentPlayer();
}

function showCurrentPlayer() {
  const total = state.players.length;
  const idx = state.currentPlayer;

  document.getElementById('progressFill').style.width = `${(idx/total)*100}%`;
  document.getElementById('playerCounterText').textContent = `${idx+1} / ${total}`;

  const cardInner = document.getElementById('gameCardInner');
  const cardBack = document.getElementById('cardBack');

  // Reset card
  cardInner.classList.remove('flipped');
  cardBack.className = 'card-back normal game-card-face';
  document.getElementById('cardWord').innerHTML = '';
  document.getElementById('cardPistaEl').innerHTML = '';

  // FIX: Seteamos el nombre tanto en el frente como en el dorso
  document.getElementById('cardPlayerName').textContent = state.players[idx];
  document.getElementById('cardPlayerNameBack').textContent = state.players[idx];
  
  document.getElementById('cardQuestion').textContent = '?';
  document.getElementById('cardHint').textContent = 'Toca para ver tu rol';
  document.getElementById('tapHintText').textContent = '👆 Tocá la tarjeta para revelar tu rol';

  state.cardFlipped = false;
  state.wordShown = false;
}

function handleCardTap() {
  if (!state.wordShown) {
    // First tap - reveal
    const isImpostor = state.impostorIndices.includes(state.currentPlayer);
    const cardInner = document.getElementById('gameCardInner');
    const cardBack = document.getElementById('cardBack');

    if (isImpostor) {
      cardBack.className = 'card-back impostor game-card-face';
      document.getElementById('cardWord').innerHTML = `<div class="card-impostor-label">IMPOSTOR</div>`;

      if (state.pistaActiva && state.categoria) {
        const pista = getPista(state.secretWord, state.categoria);
        document.getElementById('cardPistaEl').innerHTML = `<div class="card-pista"><strong>Pista:</strong> ${pista}</div>`;
      }

      // Red flash effect
      cardBack.animate([{background:'rgba(18,5,5,0.95)'},{background:'rgba(80,5,5,0.95)'},{background:'rgba(18,5,5,0.95)'}],{duration:600,iterations:1});

    } else {
      cardBack.className = 'card-back normal game-card-face';
      document.getElementById('cardWord').innerHTML = `<div class="card-word">${state.secretWord}</div>`;
      if (state.categoria) {
        document.getElementById('cardPistaEl').innerHTML = `<div style="margin-top:1rem;font-size:0.8rem;color:var(--muted);">Categoría: ${state.categoria}</div>`;
      }
    }

    cardInner.classList.add('flipped');
    document.getElementById('tapHintText').textContent = '👆 Tocá de nuevo para pasar el teléfono';
    state.wordShown = true;

  } else {
    // Second tap - next player or end
    state.currentPlayer++;
    if (state.currentPlayer < state.players.length) {
      // Flip back first
      const cardInner = document.getElementById('gameCardInner');
      cardInner.classList.remove('flipped');
      setTimeout(() => showCurrentPlayer(), 350);
    } else {
      showEnd();
    }
  }
}

// END SCREEN
function showEnd() {
  document.getElementById('progressFill').style.width = '100%';
  launchConfetti();
  goTo('screenEnd');
}

function newRound() {
  if (state.mode === 'CLASICO') {
    buildExcludeList();
    document.getElementById('secretWord').value = '';
    goTo('screenClassic');
  } else {
    startCategoriesGame();
  }
}

// CONFETTI
function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#e63946','#f4a261','#2ec4b6','#7b2d8b','#f8f8f8','#ff6b6b','#ffd166'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random()*100}%;
      top:${-10-Math.random()*20}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      transform:rotate(${Math.random()*360}deg);
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      animation-duration:${2+Math.random()*2}s;
      animation-delay:${Math.random()*0.8}s;
    `;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

// =============================================
// ============ MODO ONLINE ====================
// =============================================

// ----- Firebase config -----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAE8FlEPKh5WKto5emBBvXYBYAsnx8MLeI",
  authDomain: "impostor-game-14706.firebaseapp.com",
  databaseURL: "https://impostor-game-14706-default-rtdb.firebaseio.com",
  projectId: "impostor-game-14706",
  storageBucket: "impostor-game-14706.firebasestorage.app",
  messagingSenderId: "507150859344",
  appId: "1:507150859344:web:dafd4a09925b412b3f2555"
};

// Estado online
let onlineState = {
  roomCode: '',
  myId: '',
  myName: '',
  isAdmin: false,
  mode: 'CLASICO',
  impostors: 1,
  selectedCategories: new Set(['Países','Fútbol','Cine y TV']),
  cardRevealed: false,
};

let db = null;
let roomRef = null;
let unsubscribers = [];

function initFirebase() {
  if (db) return true;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    return true;
  } catch(e) {
    showFirebaseError();
    return false;
  }
}

function showFirebaseError() {
  alert('⚠️ Para el modo online necesitás configurar Firebase.\n\nReemplazá el objeto FIREBASE_CONFIG en el código con los datos de tu proyecto de Firebase (gratis en firebase.google.com).');
}

function uid() {
  return Math.random().toString(36).slice(2,10);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i=0;i<4;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

// ----- Cleanup listeners -----
function clearListeners() {
  unsubscribers.forEach(fn => fn());
  unsubscribers = [];
}

// ----- Crear sala -----
async function createRoom() {
  const name = document.getElementById('adminNameInput').value.trim();
  const errEl = document.getElementById('createRoomErr');
  errEl.style.display = 'none';
  if (!name) { errEl.style.display='block'; return; }
  if (!initFirebase()) return;

  const code = generateRoomCode();
  const myId = uid();
  onlineState.roomCode = code;
  onlineState.myId = myId;
  onlineState.myName = name;
  onlineState.isAdmin = true;
  roomRef = db.ref('rooms/' + code);

  try {
    await roomRef.set({
      status: 'lobby',
      adminId: myId,
      createdAt: Date.now(),
      players: { [myId]: { name, isAdmin:true, ready:false, joined: Date.now() } }
    });

    // Auto-cleanup after 3 hours
    roomRef.child('createdAt').onDisconnect().remove();

    document.getElementById('displayRoomCode').textContent = code;
    goTo('screenAdminLobby');
    listenAdminLobby();

    // Setup online config defaults
    document.getElementById('onlineTotalPlayers').textContent = '?';
    document.getElementById('onlineImpostorCount').textContent = onlineState.impostors;
    buildOnlineCatGrid();

  } catch(e) {
    alert('Error al crear sala. Revisá tu conexión.');
  }
}

function copyRoomCode() {
  navigator.clipboard.writeText(onlineState.roomCode).then(() => {
    const el = document.getElementById('displayRoomCode');
    const prev = el.textContent;
    el.textContent = '✓✓✓';
    setTimeout(() => el.textContent = prev, 1200);
  });
}

function listenAdminLobby() {
  clearListeners();
  const ref = roomRef.child('players');
  const handler = ref.on('value', snap => {
    const players = snap.val() || {};
    const list = Object.entries(players).sort((a,b) => a[1].joined - b[1].joined);
    const container = document.getElementById('adminPlayerList');
    container.innerHTML = '';
    list.forEach(([id, p]) => {
      const div = document.createElement('div');
      div.className = 'player-item-online';
      div.innerHTML = `
        <div class="p-avatar">${p.name[0].toUpperCase()}</div>
        <span class="p-name">${p.name}</span>
        ${p.isAdmin ? '<span class="admin-tag">Admin</span>' : ''}
      `;
      container.appendChild(div);
    });
    document.getElementById('adminPlayerCount').textContent = `${list.length} jugador${list.length!==1?'es':''}`;
    document.getElementById('onlineTotalPlayers').textContent = list.length;
    document.getElementById('onlineImpostorCount').textContent = Math.min(onlineState.impostors, list.length-1);
    onlineState.impostors = Math.min(onlineState.impostors, list.length-1);
  });
  unsubscribers.push(() => ref.off('value', handler));

  // Listen for status changes (new round etc.)
  const statusRef = roomRef.child('status');
  const statusHandler = statusRef.on('value', snap => {
    const status = snap.val();
    if (status === 'playing') {
      // Check if we already navigated
    }
  });
  unsubscribers.push(() => statusRef.off('value', statusHandler));
}

function goToOnlineSetup() {
  goTo('screenOnlineSetup');
  // Update total players display
  roomRef.child('players').once('value', snap => {
    const count = Object.keys(snap.val()||{}).length;
    document.getElementById('onlineTotalPlayers').textContent = count;
    onlineState.impostors = Math.min(onlineState.impostors, count-1);
    document.getElementById('onlineImpostorCount').textContent = onlineState.impostors;
  });
}

function selectOnlineMode(mode) {
  onlineState.mode = mode;
  document.getElementById('onlineModeClasico').classList.toggle('active', mode==='CLASICO');
  document.getElementById('onlineModeCategorias').classList.toggle('active', mode==='CATEGORIAS');
  document.getElementById('onlineWordSection').style.display = mode==='CLASICO'?'block':'none';
  document.getElementById('onlineCatSection').style.display = mode==='CATEGORIAS'?'block':'none';
}

function changeOnlineImpostors(delta) {
  roomRef.child('players').once('value', snap => {
    const max = Object.keys(snap.val()||{}).length - 1;
    onlineState.impostors = Math.max(1, Math.min(max, onlineState.impostors + delta));
    document.getElementById('onlineImpostorCount').textContent = onlineState.impostors;
  });
}

function buildOnlineCatGrid() {
  const grid = document.getElementById('onlineCatGrid');
  grid.innerHTML = '';
  const catIcons = {"Países":"🌍","Fútbol":"⚽","Cine y TV":"🎬","Famosos Arg":"🇦🇷","Famosos":"⭐","Objetos":"📦"};
  Object.keys(CATEGORIES).forEach(cat => {
    const btn = document.createElement('div');
    btn.className = 'btn-cat' + (onlineState.selectedCategories.has(cat) ? ' selected' : '');
    btn.innerHTML = `<span>${catIcons[cat]||'📌'}</span><span>${cat}</span>`;
    btn.onclick = () => {
      if (onlineState.selectedCategories.has(cat)) {
        if (onlineState.selectedCategories.size > 1) onlineState.selectedCategories.delete(cat);
      } else {
        onlineState.selectedCategories.add(cat);
      }
      btn.classList.toggle('selected', onlineState.selectedCategories.has(cat));
    };
    grid.appendChild(btn);
  });
}

async function launchOnlineGame() {
  const errEl = document.getElementById('onlineSetupErr');
  errEl.style.display='none';

  let secretWord = '', categoria = '';
  const pistaActiva = document.getElementById('onlineTogglePista').checked;

  if (onlineState.mode === 'CLASICO') {
    secretWord = document.getElementById('onlineSecretWord').value.trim();
    if (!secretWord) {
      errEl.textContent = 'Ingresá una palabra secreta.';
      errEl.style.display='block';
      return;
    }
  } else {
    const allWords = [];
    onlineState.selectedCategories.forEach(cat => {
      CATEGORIES[cat].forEach(w => allWords.push({word:w, cat}));
    });
    const chosen = allWords[Math.floor(Math.random()*allWords.length)];
    secretWord = chosen.word;
    categoria = chosen.cat;
  }

  // Get players
  const snap = await roomRef.child('players').once('value');
  const playersObj = snap.val() || {};
  const playersList = Object.entries(playersObj).sort((a,b)=>a[1].joined-b[1].joined);
  const playerIds = playersList.map(([id])=>id);

  // Assign impostors
  const shuffled = [...playerIds].sort(()=>Math.random()-0.5);
  const impostorIds = new Set(shuffled.slice(0, onlineState.impostors));

  // Build assignments
  const assignments = {};
  playerIds.forEach(id => {
    const isImpostor = impostorIds.has(id);
    let pista = '';
    if (isImpostor && pistaActiva && categoria) {
      pista = getPista(secretWord, categoria);
    }
    assignments[id] = { isImpostor, pista, ready: false };
  });

  // Push game state
  await roomRef.update({
    status: 'playing',
    game: {
      secretWord,
      categoria,
      pistaActiva,
      impostors: onlineState.impostors,
      mode: onlineState.mode,
      assignments,
      startedAt: Date.now(),
      readyCount: 0,
    }
  });

  // Admin shows his own card using in-memory data (no extra Firebase read needed)
  const myAssignment = assignments[onlineState.myId];
  onlineState.cardRevealed = false;

  document.getElementById('onlineCardPlayerName').textContent = onlineState.myName;
  document.getElementById('onlineCardPlayerNameBack').textContent = onlineState.myName;
  document.getElementById('onlineCardInner').classList.remove('flipped');

  if (myAssignment && myAssignment.isImpostor) {
    document.getElementById('onlineCardBack').className = 'card-back impostor game-card-face';
    document.getElementById('onlineCardWord').innerHTML = `<div class="card-impostor-label">IMPOSTOR</div>`;
    document.getElementById('onlineCardPista').innerHTML = myAssignment.pista
      ? `<div class="card-pista"><strong>Pista:</strong> ${myAssignment.pista}</div>` : '';
  } else {
    document.getElementById('onlineCardBack').className = 'card-back normal game-card-face';
    document.getElementById('onlineCardWord').innerHTML = `<div class="card-word">${secretWord}</div>`;
    document.getElementById('onlineCardPista').innerHTML = categoria
      ? `<div style="margin-top:1rem;font-size:0.8rem;color:var(--muted);">Categoría: ${categoria}</div>` : '';
  }

  document.getElementById('onlineWaitOthers').textContent = '';
  clearListeners();
  goTo('screenOnlineCard');

  // Listen for new round (status back to lobby)
  const sRef = roomRef.child('status');
  const sHandler = sRef.on('value', snap => {
    if (snap.val() === 'lobby') {
      clearListeners();
      document.getElementById('waitingRoomTitle').textContent = 'Sala ' + onlineState.roomCode;
      onlineState.cardRevealed = false;
      goTo('screenAdminLobby');
      listenAdminLobby();
    }
  });
  unsubscribers.push(() => sRef.off('value', sHandler));
}

function launchConfettiOnline() {
  const container = document.getElementById('confettiContainerOnline');
  container.innerHTML = '';
  const colors = ['#e63946','#f4a261','#2ec4b6','#7b2d8b','#f8f8f8','#ff6b6b'];
  for (let i=0;i<50;i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;top:${-10-Math.random()*20}px;background:${colors[Math.floor(Math.random()*colors.length)]};transform:rotate(${Math.random()*360}deg);width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*0.8}s;`;
    container.appendChild(p);
    setTimeout(()=>p.remove(),4000);
  }
}

function listenAdminEnd(totalPlayers, secretWord, impostorIds, playersObj) {
  clearListeners();
  // just keep listening to lobby in background for new round
}

async function newOnlineRound() {
  await roomRef.update({ status:'lobby', game:null });
  goTo('screenAdminLobby');
  listenAdminLobby();
}

// ----- UNIRSE -----
async function joinRoom() {
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  const name = document.getElementById('joinNameInput').value.trim();
  const errEl = document.getElementById('joinRoomErr');
  errEl.style.display='none';

  if (!code || code.length!==4) { errEl.textContent='Ingresá el código de 4 letras.'; errEl.style.display='block'; return; }
  if (!name) { errEl.textContent='Ingresá tu nombre.'; errEl.style.display='block'; return; }

  if (!initFirebase()) return;

  const ref = db.ref('rooms/'+code);
  let snap;
  try { snap = await ref.once('value'); } catch(e) { errEl.textContent='Error de conexión.'; errEl.style.display='block'; return; }

  if (!snap.exists()) { errEl.textContent='No existe esa sala. Revisá el código.'; errEl.style.display='block'; return; }

  const roomData = snap.val();
  if (roomData.status === 'playing') { errEl.textContent='La partida ya comenzó. Esperá la próxima ronda.'; errEl.style.display='block'; return; }

  const myId = uid();
  onlineState.roomCode = code;
  onlineState.myId = myId;
  onlineState.myName = name;
  onlineState.isAdmin = false;
  roomRef = ref;
  onlineState.cardRevealed = false;

  await ref.child('players/'+myId).set({ name, isAdmin:false, ready:false, joined:Date.now() });
  ref.child('players/'+myId).onDisconnect().remove();

  document.getElementById('waitingRoomTitle').textContent = 'Sala ' + code;
  goTo('screenPlayerWaiting');
  listenPlayerWaiting();
}

function listenPlayerWaiting() {
  clearListeners();

  // Listen players list
  const pRef = roomRef.child('players');
  const pHandler = pRef.on('value', snap => {
    const players = snap.val()||{};
    const list = Object.entries(players).sort((a,b)=>a[1].joined-b[1].joined);
    const container = document.getElementById('guestPlayerList');
    container.innerHTML='';
    list.forEach(([id,p])=>{
      const div = document.createElement('div');
      div.className='player-item-online';
      div.innerHTML=`<div class="p-avatar">${p.name[0].toUpperCase()}</div><span class="p-name">${p.name}</span>${p.isAdmin?'<span class="admin-tag">Admin</span>':''}`;
      container.appendChild(div);
    });
    document.getElementById('guestPlayerCount').textContent=`${list.length} jugador${list.length!==1?'es':''}`;
  });
  unsubscribers.push(()=>pRef.off('value',pHandler));

  // Listen game start
  const sRef = roomRef.child('status');
  const sHandler = sRef.on('value', snap => {
    if (snap.val()==='playing') {
      showOnlineCard();
    }
  });
  unsubscribers.push(()=>sRef.off('value',sHandler));
}

async function showOnlineCard() {
  clearListeners();
  const gameSnap = await roomRef.child('game').once('value');
  const game = gameSnap.val();
  const myAssignment = game.assignments[onlineState.myId];

  onlineState.cardRevealed = false;

  // Set names on card
  document.getElementById('onlineCardPlayerName').textContent = onlineState.myName;
  document.getElementById('onlineCardPlayerNameBack').textContent = onlineState.myName;
  document.getElementById('onlineCardInner').classList.remove('flipped');

  if (myAssignment.isImpostor) {
    document.getElementById('onlineCardBack').className = 'card-back impostor game-card-face';
    document.getElementById('onlineCardWord').innerHTML = `<div class="card-impostor-label">IMPOSTOR</div>`;
    if (myAssignment.pista) {
      document.getElementById('onlineCardPista').innerHTML = `<div class="card-pista"><strong>Pista:</strong> ${myAssignment.pista}</div>`;
    } else {
      document.getElementById('onlineCardPista').innerHTML = '';
    }
  } else {
    document.getElementById('onlineCardBack').className = 'card-back normal game-card-face';
    document.getElementById('onlineCardWord').innerHTML = `<div class="card-word">${game.secretWord}</div>`;
    if (game.categoria) {
      document.getElementById('onlineCardPista').innerHTML = `<div style="margin-top:1rem;font-size:0.8rem;color:var(--muted);">Categoría: ${game.categoria}</div>`;
    } else {
      document.getElementById('onlineCardPista').innerHTML = '';
    }
  }

  document.getElementById('onlineWaitOthers').textContent = '';
  goTo('screenOnlineCard');

  // Listen for status back to lobby (new round)
  const sRef = roomRef.child('status');
  const sHandler = sRef.on('value', snap => {
    if (snap.val()==='lobby') {
      clearListeners();
      document.getElementById('waitingRoomTitle').textContent = 'Sala ' + onlineState.roomCode;
      onlineState.cardRevealed = false;
      goTo('screenPlayerWaiting');
      listenPlayerWaiting();
    }
  });
  unsubscribers.push(()=>sRef.off('value',sHandler));
}

function handleOnlineCardTap() {
  if (!onlineState.cardRevealed) {
    // Primer toque: revela la tarjeta
    document.getElementById('onlineCardInner').classList.add('flipped');
    document.getElementById('tapHintOnline').textContent = '👆 Tocá de nuevo para confirmar';
    onlineState.cardRevealed = true;
  } else {
    // Segundo toque: avanza
    roomRef.child('game/assignments/'+onlineState.myId+'/ready').set(true);
    goTo('screenOnlineWaitEnd');
    const adminBtn = document.getElementById('adminNewRoundBtn');
    adminBtn.style.display = onlineState.isAdmin ? 'flex' : 'none';
    listenWaitEnd();
  }
}

function listenWaitEnd() {
  const sRef = roomRef.child('status');
  const sHandler = sRef.on('value', snap => {
    if (snap.val()==='lobby') {
      clearListeners();
      document.getElementById('waitingRoomTitle').textContent = 'Sala '+onlineState.roomCode;
      onlineState.cardRevealed = false;
      goTo('screenPlayerWaiting');
      listenPlayerWaiting();
    }
  });
  unsubscribers.push(()=>sRef.off('value',sHandler));
}

// ----- Salir de sala -----
function leaveRoom() {
  clearListeners();
  if (roomRef && onlineState.myId) {
    if (onlineState.isAdmin) {
      roomRef.remove();
    } else {
      roomRef.child('players/'+onlineState.myId).remove();
    }
  }
  roomRef = null;
  onlineState = {
    roomCode:'', myId:'', myName:'', isAdmin:false,
    mode:'CLASICO', impostors:1,
    selectedCategories: new Set(['Países','Fútbol','Cine y TV']),
    cardRevealed:false,
  };
  goTo('screenHome');
}