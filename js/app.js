// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // ======================================================================
    // 1. DEKLARASI VARIABEL & ELEMEN DOM
    // ======================================================================
    
    let currentUser = null, currentNamaLengkap = null;
    let bankSoal = [], currentQuestionIndex = 0, userAnswers = {}, timerInterval;
    let flaggedQuestions = {};
    const TOTAL_TIME = 100 * 60;

    const views = document.querySelectorAll('.app-view');
    const loginView = document.getElementById('login-view');
    const lobbyView = document.getElementById('lobby-view');
    const testView = document.getElementById('test-view');
    const hasilView = document.getElementById('hasil-view');
    const countdownOverlay = document.getElementById('countdown-overlay');

    const loginBtn = document.getElementById('login-btn');
    const loginUsernameEl = document.getElementById('login-username');
    const loginPasswordEl = document.getElementById('login-password');

    const welcomeMessageEl = document.getElementById('welcome-message');
    const historyTableBody = document.querySelector('#history-table tbody');
    const noHistoryMessage = document.getElementById('no-history');
    const startNewTestBtn = document.getElementById('start-new-test-btn');
    const logoutBtnLobby = document.getElementById('logout-btn-lobby');

    const countdownText = document.getElementById('countdown-text');
    const testContainer = document.querySelector('.test-container');
    const questionTextEl = document.getElementById('question-text');
    const optionsAreaEl = document.getElementById('options-area');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const flagBtn = document.getElementById('flag-btn');
    const questionNavPillsEl = document.getElementById('question-nav-pills');
    const testTypeEl = document.getElementById('test-type');
    const timerEl = document.getElementById('timer');

    const userNameHasilEl = document.getElementById('user-name-hasil');
    const twkScoreEl = document.getElementById('twk-score');
    const tiuScoreEl = document.getElementById('tiu-score');
    const tkpScoreEl = document.getElementById('tkp-score');
    const totalScoreEl = document.getElementById('total-score');
    const lobbyBtnHasil = document.getElementById('lobby-btn-hasil');
    const downloadBtn = document.getElementById('download-btn');
    const logoutBtnHasil = document.getElementById('logout-btn-hasil');

    // ======================================================================
    // 2. MANAJEMEN TAMPILAN (ROUTER)
    // ======================================================================

    function showView(viewId) {
        views.forEach(view => view.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    // ======================================================================
    // 3. LOGIKA UTAMA & INISIALISASI
    // ======================================================================

    function initializeApp() {
        const sessionString = localStorage.getItem('session');
        if (sessionString) {
            const session = JSON.parse(sessionString);
            if (new Date().getTime() > session.expires) {
                logout(); return;
            }
            currentUser = session.username;
            currentNamaLengkap = session.namaLengkap;

            if (localStorage.getItem('testEndTime')) {
                if (confirm("Anda memiliki tes yang belum selesai. Lanjutkan?")) {
                    setupTestView(false); // false = jangan jalankan countdown
                } else {
                    setupLobbyView();
                }
            } else {
                setupLobbyView();
            }
        } else {
            showView('login-view');
        }
    }

    // ======================================================================
    // 4. LOGIKA PER-TAMPILAN
    // ======================================================================

    function handleLogin() {
        const username = loginUsernameEl.value;
        const password = loginPasswordEl.value;
        const user = USER_DATABASE.find(u => u.username === username && u.password === password);
        if (user) {
            const now = new Date();
            const expires = now.getTime() + (24 * 60 * 60 * 1000);
            const session = { username: user.username, namaLengkap: user.namaLengkap, expires: expires };
            localStorage.setItem('session', JSON.stringify(session));
            currentUser = user.username;
            currentNamaLengkap = user.namaLengkap;
            alert(`Login berhasil! Selamat datang, ${user.namaLengkap}.`);
            setupLobbyView();
        } else {
            alert('Username atau Password salah!');
        }
    }
    
    function setupLobbyView() {
        welcomeMessageEl.textContent = `Selamat Datang, ${currentNamaLengkap}!`;
        const scoreHistory = JSON.parse(localStorage.getItem('scoreHistory')) || {};
        const userHistory = scoreHistory[currentUser];
        if (userHistory && userHistory.length > 0) {
            document.getElementById('history-table').style.display = '';
            noHistoryMessage.style.display = 'none';
            historyTableBody.innerHTML = '';
            userHistory.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
            userHistory.forEach(score => {
                historyTableBody.innerHTML += `<tr><td>${score.date}</td><td>${score.twk}</td><td>${score.tiu}</td><td>${score.tkp}</td><td><strong>${score.total}</strong></td></tr>`;
            });
        } else {
            document.getElementById('history-table').style.display = 'none';
            noHistoryMessage.style.display = 'block';
        }
        showView('lobby-view');
    }

    function setupTestView(useCountdown = true) {
        showView('test-view');
        if (useCountdown) {
            testContainer.style.display = 'none';
            countdownOverlay.style.display = 'flex';
            runCountdown();
        } else {
            countdownOverlay.style.display = 'none';
            testContainer.style.display = 'block';
            startTest();
        }
    }
    
    function runCountdown() {
        let count = 3; countdownText.textContent = count; const countdownInterval = setInterval(() => { count--; if (count > 0) { countdownText.textContent = count; } else if (count === 0) { countdownText.textContent = "Mulai!"; countdownText.style.animation = 'none'; } else { clearInterval(countdownInterval); countdownOverlay.style.display = 'none'; testContainer.style.display = 'block'; startTest(); } }, 1000);
    }
    
    function startTest() {
        const savedAnswers = JSON.parse(localStorage.getItem('userAnswers'));
        if (savedAnswers) userAnswers = savedAnswers;
        const savedFlags = JSON.parse(localStorage.getItem('flaggedQuestions'));
        if (savedFlags) flaggedQuestions = savedFlags;

        Papa.parse('bank_soal.csv', {
            download: true, header: true, skipEmptyLines: true,
            complete: (results) => {
                bankSoal = results.data.filter(soal => soal.tipe && soal.soal);
                if (bankSoal.length === 0) { questionTextEl.innerHTML = "Gagal memuat soal."; return; }
                renderQuestion(currentQuestionIndex);
                renderNavPills();
                startTimer();
            },
            error: (err) => { questionTextEl.innerHTML = `Gagal memuat bank soal. Error: ${err.message}.`; }
        });
    }

    function setupHasilView() {
        const results = JSON.parse(localStorage.getItem('latestResult'));
        if (!results) { alert("Tidak ada hasil tes yang ditemukan."); setupLobbyView(); return; }
        userNameHasilEl.textContent = `Peserta: ${currentNamaLengkap}`;
        twkScoreEl.textContent = results.twk;
        tiuScoreEl.textContent = results.tiu;
        tkpScoreEl.textContent = results.tkp;
        totalScoreEl.textContent = results.total;
        showView('hasil-view');
    }

    // ======================================================================
    // 5. FUNGSI-FUNGSI LOGIKA TES
    // ======================================================================
    
    function renderQuestion(index){
        const question = bankSoal[index];
        testTypeEl.textContent = `Soal ${question.tipe}`;
        // === Hapus nomor soal: tidak lagi `${index+1}. `
        questionTextEl.innerHTML = `${question.soal}`;
        document.getElementById('question-image-area').innerHTML = '';
        if (question.gambar) {
            const img = document.createElement('img');
            img.src = question.gambar;
            img.className = 'question-image';
            document.getElementById('question-image-area').appendChild(img)
        }
        optionsAreaEl.innerHTML = '';
        ['a','b','c','d','e'].forEach(opt => {
            if (question[`opsi_${opt}`] != null) {
                const optionEl = document.createElement('div');
                optionEl.className = 'option';
                optionEl.innerHTML = `<input type="radio" id="opsi_${opt}" name="jawaban" value="${opt}"><label for="opsi_${opt}">${question[`opsi_${opt}`]}</label>`;
                optionsAreaEl.appendChild(optionEl)
            }
        });
        if (userAnswers[index]) { document.getElementById(`opsi_${userAnswers[index]}`).checked = true }
        if (window.renderMathInElement) { renderMathInElement(testContainer) }
        flagBtn.className = flaggedQuestions[index] ? 'active' : '';
        flagBtn.textContent = flaggedQuestions[index] ? 'Hapus Tanda' : 'Tandai Ragu-ragu';
        updateNavButtons();
        updateActivePill(index);
        document.querySelectorAll('input[name="jawaban"]').forEach(radio => {
            radio.addEventListener('change', () => {
                userAnswers[index] = radio.value;
                localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
                updateNavPillStatus(index, true);
                setTimeout(() => {
                    if (currentQuestionIndex < bankSoal.length - 1) {
                        currentQuestionIndex++;
                        renderQuestion(currentQuestionIndex)
                    }
                }, 300)
            })
        })
    }

    function renderNavPills(){
        questionNavPillsEl.innerHTML = '';
        bankSoal.forEach((_, index) => {
            const pill = document.createElement('div');
            pill.className = 'nav-pill';
            pill.textContent = index + 1;
            pill.dataset.index = index;
            pill.addEventListener('click', () => { currentQuestionIndex = index; renderQuestion(currentQuestionIndex) });
            if (userAnswers[index]) { pill.classList.add('answered') }
            if (flaggedQuestions[index]) { pill.classList.add('flagged') }
            questionNavPillsEl.appendChild(pill)
        });
        updateActivePill(currentQuestionIndex)
    }

    function updateNavPillStatus(index, isAnswered){
        const pill = document.querySelector(`.nav-pill[data-index='${index}']`);
        if (pill) { isAnswered ? pill.classList.add('answered') : pill.classList.remove('answered') }
    }

    function updateFlagPillStatus(index, isFlagged){
        const pill = document.querySelector(`.nav-pill[data-index='${index}']`);
        if (pill) { isFlagged ? pill.classList.add('flagged') : pill.classList.remove('flagged') }
    }

    function updateActivePill(activeIndex){
        document.querySelectorAll('.nav-pill').forEach(pill => {
            pill.classList.remove('current');
            if (parseInt(pill.dataset.index) === activeIndex) { pill.classList.add('current') }
        })
    }

    function updateNavButtons(){
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === bankSoal.length - 1
    }

    function startTimer(){
        let testEndTime = localStorage.getItem('testEndTime');
        if (!testEndTime) {
            testEndTime = Date.now() + TOTAL_TIME * 1000;
            localStorage.setItem('testEndTime', testEndTime)
        }
        timerInterval = setInterval(() => {
            const now = Date.now();
            const timeLeft = Math.round((testEndTime - now) / 1000);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerEl.textContent = "00:00";
                alert("Waktu habis!");
                finishTest();
                return
            }
            const minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerEl.textContent = `${minutes}:${seconds}`
        }, 1000)
    }

    function finishTest(){
        clearInterval(timerInterval);
        const scores = calculateScores();  // versi all-poin
        if (scores) { sendResultsToAdmin(scores) }
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('flaggedQuestions');
        localStorage.removeItem('testEndTime');
        setupHasilView()
    }

    // ======== HELPER: ambil poin dari opsi yang dipilih ========
    function getPoint(soal, answer) {
        const key = `poin_${(answer || "").toLowerCase()}`;
        const val = parseInt(soal[key], 10);
        return isNaN(val) ? 0 : val;
    }

    // ======== Skoring berbasis poin untuk semua tipe ========
    function calculateScores(){
        try {
            let scores = { twk: 0, tiu: 0, tkp: 0, total: 0 };
            bankSoal.forEach((soal, index) => {
                if (!soal || !soal.tipe) return;
                const userAnswer = userAnswers[index]; // 'a' | 'b' | 'c' | 'd' | 'e'
                if (!userAnswer) return;               // tidak menjawab = 0

                const tipe = (soal.tipe || "").toUpperCase();
                const poin = getPoint(soal, userAnswer); // ambil dari poin_*

                if (tipe === 'TWK') scores.twk += poin;
                else if (tipe === 'TIU') scores.tiu += poin;
                else if (tipe === 'TKP') scores.tkp += poin;
            });
            scores.total = scores.twk + scores.tiu + scores.tkp;

            // simpan ke localStorage & riwayat
            localStorage.setItem('latestResult', JSON.stringify(scores));
            const scoreHistory = JSON.parse(localStorage.getItem('scoreHistory')) || {};
            if (!scoreHistory[currentUser]) scoreHistory[currentUser] = [];
            const now = new Date();
            const newRecord = {
                ...scores,
                date: now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                rawDate: now.toISOString()
            };
            scoreHistory[currentUser].push(newRecord);
            localStorage.setItem('scoreHistory', JSON.stringify(scoreHistory));
            return scores;
        } catch (error) {
            console.error("Error saat menghitung skor (all-poin):", error);
            alert("Terjadi kesalahan saat memproses hasil Anda.");
            return null;
        }
    }

    function sendResultsToAdmin(scores){
        const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxzxU2jCz007u_7Uzjm2j9zF3dsMI179oPgxbxRDkt64zwUyoRXoMvUJovn8zqP-q6f/exec';
        const dataToSend = { username: currentUser, namaLengkap: currentNamaLengkap, ...scores };
        fetch(WEB_APP_URL, {
            method:'POST', mode:'no-cors',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify(dataToSend)
        })
        .then(() => console.log("Hasil berhasil dikirim ke admin."))
        .catch(error => console.error('Gagal mengirim hasil ke admin:', error))
    }
    
    // ======================================================================
    // 6. EVENT LISTENERS
    // ======================================================================
    
    loginBtn.addEventListener('click', handleLogin);
    startNewTestBtn.addEventListener('click', () => {
        if (localStorage.getItem('testEndTime')) {
            if (!confirm("Memulai tes baru akan menghapus progres tes sebelumnya. Lanjutkan?")) return;
        }
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('flaggedQuestions');
        localStorage.removeItem('testEndTime');
        setupTestView(true);
    });
    logoutBtnLobby.addEventListener('click', logout);
    prevBtn.addEventListener('click', () => { if (currentQuestionIndex > 0) renderQuestion(--currentQuestionIndex); });
    nextBtn.addEventListener('click', () => { if (currentQuestionIndex < bankSoal.length - 1) renderQuestion(++currentQuestionIndex); });
    flagBtn.addEventListener('click', () => {
        const isFlagged = !flaggedQuestions[currentQuestionIndex];
        flaggedQuestions[currentQuestionIndex] = isFlagged;
        if (!isFlagged) delete flaggedQuestions[currentQuestionIndex];
        localStorage.setItem('flaggedQuestions', JSON.stringify(flaggedQuestions));
        updateFlagPillStatus(currentQuestionIndex, isFlagged);
        renderQuestion(currentQuestionIndex);
    });
    finishBtn.addEventListener('click', () => {
        const answeredCount = Object.keys(userAnswers).length;
        const unansweredCount = bankSoal.length - answeredCount;
        let confirmation = false;
        if (unansweredCount > 0) {
            confirmation = confirm(`Anda belum menjawab ${unansweredCount} soal. Apakah Anda yakin ingin menyelesaikan tes?`);
        } else {
            confirmation = confirm("Apakah Anda yakin ingin menyelesaikan tes?");
        }
        if (confirmation) { finishTest(); }
    });
    lobbyBtnHasil.addEventListener('click', setupLobbyView);
    logoutBtnHasil.addEventListener('click', logout);
    downloadBtn.addEventListener('click', () => {
        const results = JSON.parse(localStorage.getItem('latestResult'));
        const timestamp = new Date().toLocaleString('id-ID', { dateStyle:'full', timeStyle:'short' });
        let content = `HASIL TES SKD\n=====================================\n`;
        content += `Username: ${currentUser}\nNama Lengkap: ${currentNamaLengkap}\nTanggal Tes: ${timestamp}\n\n`;
        content += `SKOR:\n- TWK: ${results.twk}\n- TIU: ${results.tiu}\n- TKP: ${results.tkp}\n\n`;
        content += `TOTAL SKOR: ${results.total}\n=====================================`;
        const blob = new Blob([content], { type:'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `hasil-tes-skd-${currentUser}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link)
    });

    function logout() {
        if (confirm("Apakah Anda yakin ingin logout? Progres tes yang sedang berjalan akan dihapus.")) {
            localStorage.clear();
            currentUser = null;
            currentNamaLengkap = null;
            showView('login-view');
        }
    }

    initializeApp();
});
