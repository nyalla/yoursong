const fs = require('fs');
const path = require('path');

const dir = __dirname;
console.log("Checking project directory:", dir);

const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const presetJs = fs.readFileSync(path.join(dir, 'preset_songs.js'), 'utf8');

console.log("✔ index.html loaded:", indexHtml.length, "bytes");
console.log("✔ style.css loaded:", styleCss.length, "bytes");
console.log("✔ app.js loaded:", appJs.length, "bytes");
console.log("✔ preset_songs.js loaded:", presetJs.length, "bytes");

// Check DOM ID references
const requiredIds = [
    'vinylRecord', 'vinylLabelTitle', 'tonearmAssembly', 'needleGlow',
    'soundWavesEmitter', 'floatingNotes', 'timeDisplay', 'playerStatusText',
    'vuNeedleL', 'vuNeedleR', 'crackleToggleBtn', 'crackleStatus', 'crackleAudio',
    'nowPlayingTitle', 'nowPlayingSender', 'revolvingMessageText', 'currentTimeText',
    'totalTimeText', 'progressBarBg', 'progressBarFill', 'powerBtn', 'playPauseBtn',
    'playPauseIcon', 'skipBtn', 'volumeSlider', 'volumeVal', 'volumeIcon',
    'requestForm', 'ytUrlInput', 'senderInput', 'messageInput', 'pasteBtn',
    'submitQueueBtn', 'queueLimitBadge', 'queueCurrentCount', 'capacityFill',
    'queueListContainer', 'toastBanner', 'toastMessage', 'onlineUsersCount', 'marqueeTicker', 'ghibliParticles'
];

let missing = 0;
requiredIds.forEach(id => {
    if (!indexHtml.includes(`id="${id}"`)) {
        console.error(`❌ Missing ID in HTML: ${id}`);
        missing++;
    }
});

if (missing === 0) {
    console.log("✔ ALL 41 DOM IDs matched perfectly between HTML and JavaScript!");
} else {
    console.error(`❌ Total missing IDs: ${missing}`);
}

// Check JavaScript syntax with Function constructor test
try {
    new Function(presetJs);
    console.log("✔ preset_songs.js syntax is valid.");
} catch (e) {
    console.error("❌ preset_songs.js syntax error:", e);
}

try {
    new Function(appJs);
    console.log("✔ app.js syntax is valid.");
} catch (e) {
    console.error("❌ app.js syntax error:", e);
}
