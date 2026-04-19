
function playAudio(file) {
    if (!file) return;
    const audio = document.getElementById('audioPlayer');
    if (!audio) return;
    audio.src = file;
    audio.play().catch(err => console.warn('Playback failed:', err));
}
