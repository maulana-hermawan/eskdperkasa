// js/lobby.js
document.addEventListener('DOMContentLoaded', () => {
    const sessionString = localStorage.getItem('session');
    let currentUser = null;
    let currentNamaLengkap = null; // Variabel baru

    if (sessionString) {
        const session = JSON.parse(sessionString);
        if (new Date().getTime() > session.expires) {
            localStorage.clear();
            alert("Sesi Anda telah berakhir. Silakan login kembali.");
            window.location.href = 'index.html';
            return;
        }
        currentUser = session.username;
        currentNamaLengkap = session.namaLengkap; // Ambil nama lengkap dari sesi
    } else {
        window.location.href = 'index.html';
        return;
    }

    // Gunakan nama lengkap untuk pesan selamat datang
    document.getElementById('welcome-message').textContent = `Selamat Datang, ${currentNamaLengkap}!`;

    const historyTableBody = document.querySelector('#history-table tbody');
    const noHistoryMessage = document.getElementById('no-history');
    const scoreHistory = JSON.parse(localStorage.getItem('scoreHistory')) || {};
    const userHistory = scoreHistory[currentUser];

    if (userHistory && userHistory.length > 0) {
        historyTableBody.innerHTML = '';
        userHistory.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        userHistory.forEach(score => {
            const row = `<tr>
                <td>${score.date}</td>
                <td>${score.twk}</td>
                <td>${score.tiu}</td>
                <td>${score.tkp}</td>
                <td><strong>${score.total}</strong></td>
            </tr>`;
            historyTableBody.innerHTML += row;
        });
    } else {
        document.getElementById('history-table').style.display = 'none';
        noHistoryMessage.style.display = 'block';
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    });
});