// js/test.js
document.addEventListener('DOMContentLoaded', () => {
    // ======================================================================
    // 1. BLOK INISIALISASI DAN KEAMANAN
    // ======================================================================

    // Pengecekan Sesi Pengguna
    const sessionString = localStorage.getItem('session');
    let currentUser = null;
    let currentNamaLengkap = null;
    if (sessionString) {
        const session = JSON.parse(sessionString);
        if (new Date().getTime() > session.expires) {
            localStorage.clear();
            alert("Sesi Anda telah berakhir. Silakan login kembali.");
            window.location.href = 'index.html';
            return;
        }
        currentUser = session.username;
        currentNamaLengkap = session.namaLengkap;
    } else {
        window.location.href = 'index.html';
        return;
    }

    // Elemen DOM
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const testContainer = document.querySelector('.test-container');
    const questionTextEl = document.getElementById('question-text');
    const questionImageAreaEl = document.getElementById('question-image-area');
    const optionsAreaEl = document.getElementById('options-area');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const flagBtn = document.getElementById('flag-btn');
    const questionNavPillsEl = document.getElementById('question-nav-pills');
    const testTypeEl = document.getElementById('test-type');
    const timerEl = document.getElementById('timer');

    // State Aplikasi
    const TOTAL_TIME = 100 * 60;
    let bankSoal = [], currentQuestionIndex = 0, userAnswers = {}, timerInterval;
    let flaggedQuestions = {}; // State untuk soal yang di-flag

    // ======================================================================
    // 2. ALUR UTAMA APLIKASI TES
    // ======================================================================

    function runCountdown() {
        let count = 3;
        countdownText.textContent = count;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
            } else if (count === 0) {
                countdownText.textContent = "Mulai!";
                countdownText.style.animation = 'none';
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                testContainer.style.display = 'block';
                startTest();
            }
        }, 1000);
    }

    function startTest() {
        // Hapus hanya data tes sebelumnya, biarkan sesi login tetap ada
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('flaggedQuestions');
        userAnswers = {};
        flaggedQuestions = {};
        loadSoal();
    }

    function loadSoal() {
        // Muat jawaban & flag yang tersimpan dari sesi sebelumnya (jika ada)
        const savedAnswers = JSON.parse(localStorage.getItem('userAnswers'));
        if (savedAnswers) userAnswers = savedAnswers;
        const savedFlags = JSON.parse(localStorage.getItem('flaggedQuestions'));
        if (savedFlags) flaggedQuestions = savedFlags;

        Papa.parse('bank_soal.csv', {
            download: true, header: true, skipEmptyLines: true,
            complete: (results) => {
                bankSoal = results.data.filter(soal => soal.tipe && soal.soal);
                if (bankSoal.length === 0) {
                    questionTextEl.innerHTML = "Gagal memuat soal. Pastikan file `bank_soal.csv` tidak kosong dan formatnya benar.";
                    return;
                }
                renderQuestion(currentQuestionIndex);
                renderNavPills();
                startTimer();
            },
            error: (err) => {
                questionTextEl.innerHTML = `Gagal memuat bank soal. Error: ${err.message}.`;
            }
        });
    }

    // ======================================================================
    // 3. FUNGSI-FUNGSI UNTUK MERENDER TAMPILAN (UI)
    // ======================================================================

    function renderQuestion(index) {
        const question = bankSoal[index];
        testTypeEl.textContent = `Soal ${question.tipe}`;
        questionTextEl.innerHTML = `${index + 1}. ${question.soal}`;
        questionImageAreaEl.innerHTML = '';
        if (question.gambar) {
            const img = document.createElement('img');
            img.src = question.gambar;
            img.className = 'question-image';
            questionImageAreaEl.appendChild(img);
        }
        optionsAreaEl.innerHTML = '';
        ['a', 'b', 'c', 'd', 'e'].forEach(opt => {
            if (question[`opsi_${opt}`] != null) {
                const optionEl = document.createElement('div');
                optionEl.className = 'option';
                optionEl.innerHTML = `<input type="radio" id="opsi_${opt}" name="jawaban" value="${opt}"><label for="opsi_${opt}">${question[`opsi_${opt}`]}</label>`;
                optionsAreaEl.appendChild(optionEl);
            }
        });
        if (userAnswers[index]) {
            document.getElementById(`opsi_${userAnswers[index]}`).checked = true;
        }
        if (window.renderMathInElement) { renderMathInElement(testContainer); }

        // Update UI untuk tombol Flag
        if (flaggedQuestions[index]) {
            flagBtn.classList.add('active');
            flagBtn.textContent = 'Hapus Tanda';
        } else {
            flagBtn.classList.remove('active');
            flagBtn.textContent = 'Tandai Ragu-ragu';
        }

        updateNavButtons();
        updateActivePill(index);

        document.querySelectorAll('input[name="jawaban"]').forEach(radio => {
            radio.addEventListener('change', () => {
                userAnswers[index] = radio.value;
                localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
                updateNavPillStatus(index, true);

                // Fitur Auto-Advance
                setTimeout(() => {
                    if (currentQuestionIndex < bankSoal.length - 1) {
                        currentQuestionIndex++;
                        renderQuestion(currentQuestionIndex);
                    }
                }, 300); // Jeda 300ms sebelum pindah
            });
        });
    }
    
    function renderNavPills() {
        questionNavPillsEl.innerHTML = '';
        bankSoal.forEach((_, index) => {
            const pill = document.createElement('div');
            pill.className = 'nav-pill';
            pill.textContent = index + 1;
            pill.dataset.index = index;
            pill.addEventListener('click', () => { currentQuestionIndex = index; renderQuestion(currentQuestionIndex); });
            if (userAnswers[index]) { pill.classList.add('answered'); }
            if (flaggedQuestions[index]) { pill.classList.add('flagged'); }
            questionNavPillsEl.appendChild(pill);
        });
        updateActivePill(currentQuestionIndex);
    }

    function updateNavPillStatus(index, isAnswered) {
        const pill = document.querySelector(`.nav-pill[data-index='${index}']`);
        if (pill && isAnswered) pill.classList.add('answered');
    }

    function updateFlagPillStatus(index, isFlagged) {
        const pill = document.querySelector(`.nav-pill[data-index='${index}']`);
        if (pill) {
            isFlagged ? pill.classList.add('flagged') : pill.classList.remove('flagged');
        }
    }
    
    function updateActivePill(activeIndex) {
        document.querySelectorAll('.nav-pill').forEach(pill => {
            pill.classList.remove('current');
            if (parseInt(pill.dataset.index) === activeIndex) {
                pill.classList.add('current');
            }
        });
    }

    function updateNavButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === bankSoal.length - 1;
    }

    function startTimer() {
        let timeLeft = TOTAL_TIME;
        timerInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerEl.textContent = `${minutes}:${seconds}`;
            if (timeLeft-- <= 0) {
                clearInterval(timerInterval);
                alert("Waktu habis!");
                finishTest();
            }
        }, 1000);
    }
    
    // ======================================================================
    // 4. LOGIKA AKHIR TES
    // ======================================================================

    function finishTest() {
        clearInterval(timerInterval);
        const scores = calculateScores();
        if (scores) {
            sendResultsToAdmin(scores);
        }
        window.location.href = 'hasil.html';
    }

    function calculateScores() {
        try {
            let scores = { twk: 0, tiu: 0, tkp: 0, total: 0 };
            bankSoal.forEach((soal, index) => {
                if (!soal || !soal.tipe) return;
                const userAnswer = userAnswers[index];
                if (userAnswer) {
                    const tipe = soal.tipe.toUpperCase();
                    let poin = 0;
                    if (tipe === 'TWK' || tipe === 'TIU') {
                        poin = (userAnswer.toUpperCase() === soal.kunci_jawaban.toUpperCase()) ? 5 : 0;
                    } else if (tipe === 'TKP') {
                        poin = parseInt(soal[`poin_${userAnswer}`]) || 0;
                    }
                    if (tipe === 'TWK') scores.twk += poin;
                    else if (tipe === 'TIU') scores.tiu += poin;
                    else if (tipe === 'TKP') scores.tkp += poin;
                }
            });
            scores.total = scores.twk + scores.tiu + scores.tkp;
            localStorage.setItem('latestResult', JSON.stringify(scores));
            const scoreHistory = JSON.parse(localStorage.getItem('scoreHistory')) || {};
            if (!scoreHistory[currentUser]) scoreHistory[currentUser] = [];
            const now = new Date();
            const newRecord = { ...scores, date: now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), rawDate: now.toISOString() };
            scoreHistory[currentUser].push(newRecord);
            localStorage.setItem('scoreHistory', JSON.stringify(scoreHistory));
            return scores;
        } catch (error) {
            console.error("Error saat menghitung skor:", error);
            alert("Terjadi kesalahan saat memproses hasil Anda.");
            return null;
        }
    }

    function sendResultsToAdmin(scores) {
        const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxzxU2jCz007u_7Uzjm2j9zF3dsMI179oPgxbxRDkt64zwUyoRXoMvUJovn8zqP-q6f/exec_SINI';
        const dataToSend = {
            username: currentUser,
            namaLengkap: currentNamaLengkap,
            ...scores
        };
        fetch(WEB_APP_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        })
        .then(() => console.log("Hasil berhasil dikirim ke admin."))
        .catch(error => console.error('Gagal mengirim hasil ke admin:', error));
    }
    
    // ======================================================================
    // 5. EVENT LISTENERS UNTUK TOMBOL
    // ======================================================================

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion(currentQuestionIndex);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < bankSoal.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuestionIndex);
        }
    });

    flagBtn.addEventListener('click', () => {
        const isCurrentlyFlagged = flaggedQuestions[currentQuestionIndex];
        flaggedQuestions[currentQuestionIndex] = !isCurrentlyFlagged;
        localStorage.setItem('flaggedQuestions', JSON.stringify(flaggedQuestions));
        updateFlagPillStatus(currentQuestionIndex, !isCurrentlyFlagged);
        renderQuestion(currentQuestionIndex); // Re-render untuk update teks tombol
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
        if (confirmation) {
            finishTest();
        }
    });

    // Jalankan aplikasi dengan memulai countdown
    runCountdown();
});