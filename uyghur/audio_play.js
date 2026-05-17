
function playAudio(file) {
    if (!file) return;
    const audio = document.getElementById('audioPlayer');
    if (!audio) return;
    audio.src = file;
    audio.play().catch(err => console.warn('Playback failed:', err));
}

document.addEventListener('DOMContentLoaded', function() {
    const homeBtn = document.querySelector('a.home-button');
    const buttonGroup = document.querySelector('h2.heading .button-group');
    if (homeBtn && buttonGroup) {
        buttonGroup.append(homeBtn);
    }
});
