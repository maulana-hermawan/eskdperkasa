// js/hasil.js
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

    const results = JSON.parse(localStorage.getItem('latestResult'));
    if (!results) {
        alert("Tidak ada hasil tes yang ditemukan.");
        window.location.href = 'lobby.html';
        return;
    }

    // Tampilkan nama lengkap
    document.getElementById('user-name').textContent = `Peserta: ${currentNamaLengkap}`;
    document.getElementById('twk-score').textContent = results.twk;
    document.getElementById('tiu-score').textContent = results.tiu;
    document.getElementById('tkp-score').textContent = results.tkp;
    document.getElementById('total-score').textContent = results.total;

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    });

    document.getElementById('download-btn').addEventListener('click', () => {
        const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
        let content = `HASIL TES SKD\n=====================================\n`;
        content += `Username: ${currentUser}\n`;
        content += `Nama Lengkap: ${currentNamaLengkap}\n`; // Tambahkan nama lengkap ke file
        content += `Tanggal Tes: ${timestamp}\n\n`;
        content += `SKOR:\n- Tes Wawasan Kebangsaan (TWK): ${results.twk}\n- Tes Intelegensi Umum (TIU): ${results.tiu}\n- Tes Karakteristik Pribadi (TKP): ${results.tkp}\n\n`;
        content += `TOTAL SKOR: ${results.total}\n=====================================`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `hasil-tes-skd-${currentUser}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});