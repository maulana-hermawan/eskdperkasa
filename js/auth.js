// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const sessionString = localStorage.getItem('session');
    if (sessionString) {
        const session = JSON.parse(sessionString);
        if (new Date().getTime() < session.expires) {
            window.location.href = 'lobby.html';
        } else {
            localStorage.clear();
        }
    }

    document.getElementById('login-btn').addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const user = USER_DATABASE.find(u => u.username === username && u.password === password);

        if (user) {
            const now = new Date();
            const expires = now.getTime() + (24 * 60 * 60 * 1000);

            // Simpan username DAN namaLengkap ke sesi
            const session = {
                username: user.username,
                namaLengkap: user.namaLengkap, // << Perubahan di sini
                expires: expires
            };

            localStorage.setItem('session', JSON.stringify(session));
            alert(`Login berhasil! Selamat datang, ${user.namaLengkap}.`);
            window.location.href = 'lobby.html';
        } else {
            alert('Username atau Password salah!');
        }
    });
});