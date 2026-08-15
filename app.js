/* ==========================================================================
   NOSTALGIC TONE 90S GRAMOPHONE JUKEBOX - CORE APPLICATION LOGIC
   ========================================================================== */

(function () {
    // Configuration & State
    const MAX_QUEUE_SIZE = 100;
    let playlistQueue = [];
    let currentTrack = null;
    let isPlaying = false;
    let isPowerOn = false;
    let isCrackleOn = true;
    let currentInterfaceMode = localStorage.getItem('ghibli_mode') || 'vinyl';
    let tapeCounterVal = 0;
    let ytPlayer = null;
    let progressTimer = null;
    let vuMeterTimer = null;
    let floatingNotesTimer = null;
    let onlineUsersCount = 1;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    // DOM Elements
    const elements = {
        // Mode Switcher & Stages
        modeBtnVinyl: document.getElementById('modeBtnVinyl'),
        modeBtnIpod: document.getElementById('modeBtnIpod'),
        modeBtnTape: document.getElementById('modeBtnTape'),
        vinylStage: document.getElementById('vinylStage'),
        ipodStage: document.getElementById('ipodStage'),
        tapeStage: document.getElementById('tapeStage'),
        crackleLabelText: document.getElementById('crackleLabelText'),

        // Vinyl Player & Stage
        vinylRecord: document.getElementById('vinylRecord'),
        vinylLabelTitle: document.getElementById('vinylLabelTitle'),
        tonearmAssembly: document.getElementById('tonearmAssembly'),
        needleGlow: document.getElementById('needleGlow'),
        soundWavesEmitter: document.getElementById('soundWavesEmitter'),
        floatingNotes: document.getElementById('floatingNotes'),
        timeDisplay: document.getElementById('timeDisplay'),
        playerStatusText: document.getElementById('playerStatusText'),
        vuNeedleL: document.getElementById('vuNeedleL'),
        vuNeedleR: document.getElementById('vuNeedleR'),
        crackleToggleBtn: document.getElementById('crackleToggleBtn'),
        crackleStatus: document.getElementById('crackleStatus'),

        // Classic iPod Stage Elements
        ipodStatusIcon: document.getElementById('ipodStatusIcon'),
        ipodTrackTitle: document.getElementById('ipodTrackTitle'),
        ipodArtistName: document.getElementById('ipodArtistName'),
        ipodAlbumName: document.getElementById('ipodAlbumName'),
        ipodCurrentTime: document.getElementById('ipodCurrentTime'),
        ipodTotalTime: document.getElementById('ipodTotalTime'),
        ipodBarBg: document.getElementById('ipodBarBg'),
        ipodBarFill: document.getElementById('ipodBarFill'),
        ipodBtnMenu: document.getElementById('ipodBtnMenu'),
        ipodBtnPrev: document.getElementById('ipodBtnPrev'),
        ipodBtnNext: document.getElementById('ipodBtnNext'),
        ipodBtnPlay: document.getElementById('ipodBtnPlay'),
        ipodBtnCenter: document.getElementById('ipodBtnCenter'),

        // Tape Recorder Stage Elements
        counterDigit1: document.getElementById('counterDigit1'),
        counterDigit2: document.getElementById('counterDigit2'),
        counterDigit3: document.getElementById('counterDigit3'),
        tapeCounterReset: document.getElementById('tapeCounterReset'),
        tapeLabelTitle: document.getElementById('tapeLabelTitle'),
        tapeLabelSub: document.getElementById('tapeLabelSub'),
        tapeKeyRec: document.getElementById('tapeKeyRec'),
        tapeKeyRew: document.getElementById('tapeKeyRew'),
        tapeKeyFf: document.getElementById('tapeKeyFf'),
        tapeKeyPlay: document.getElementById('tapeKeyPlay'),
        tapeKeyPause: document.getElementById('tapeKeyPause'),
        tapeKeyStop: document.getElementById('tapeKeyStop'),

        // Now Playing Card
        nowPlayingTitle: document.getElementById('nowPlayingTitle'),
        nowPlayingSender: document.getElementById('nowPlayingSender'),
        revolvingMessageText: document.getElementById('revolvingMessageText'),
        currentTimeText: document.getElementById('currentTimeText'),
        totalTimeText: document.getElementById('totalTimeText'),
        progressBarBg: document.getElementById('progressBarBg'),
        progressBarFill: document.getElementById('progressBarFill'),
        ghibliParticles: document.getElementById('ghibliParticles'),

        // Controls
        powerBtn: document.getElementById('powerBtn'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        playPauseIcon: document.getElementById('playPauseIcon'),
        skipBtn: document.getElementById('skipBtn'),
        volumeSlider: document.getElementById('volumeSlider'),
        volumeVal: document.getElementById('volumeVal'),
        volumeIcon: document.getElementById('volumeIcon'),

        // Form & Queue
        requestForm: document.getElementById('requestForm'),
        ytUrlInput: document.getElementById('ytUrlInput'),
        senderInput: document.getElementById('senderInput'),
        messageInput: document.getElementById('messageInput'),
        pasteBtn: document.getElementById('pasteBtn'),
        submitQueueBtn: document.getElementById('submitQueueBtn'),
        queueLimitBadge: document.getElementById('queueLimitBadge'),
        queueCurrentCount: document.getElementById('queueCurrentCount'),
        capacityFill: document.getElementById('capacityFill'),
        queueListContainer: document.getElementById('queueListContainer'),
        toastBanner: document.getElementById('toastBanner'),
        toastMessage: document.getElementById('toastMessage'),

        // Header
        onlineUsersCount: document.getElementById('onlineUsersCount'),
        marqueeTicker: document.getElementById('marqueeTicker')
    };

    /* ==========================================================================
       INITIALIZATION & YOUTUBE API SETUP
       ========================================================================== */
    window.onYouTubeIframeAPIReady = function () {
        ytPlayer = new YT.Player('ytIframe', {
            height: '1',
            width: '1',
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError
            }
        });
    };

    function onPlayerReady() {
        console.log("YouTube Player API Ready.");
        elements.playerStatusText.textContent = "READY • PRESS POWER";
        ytPlayer.setVolume(parseInt(elements.volumeSlider.value));
        
        // Auto populate machine songs to queue if empty
        ensureMinimumQueue();
    }

    function onPlayerStateChange(event) {
        if (!ytPlayer) return;

        // YT.PlayerState: ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
        switch (event.data) {
            case YT.PlayerState.PLAYING:
                consecutiveErrors = 0;
                setPlaybackState(true);
                elements.playerStatusText.textContent = "PLAYING";
                startProgressTracker();
                startVUMeters();
                startFloatingNotes();
                if (isCrackleOn) startCrackle();
                break;

            case YT.PlayerState.PAUSED:
                setPlaybackState(false);
                elements.playerStatusText.textContent = "PAUSED";
                stopProgressTracker();
                stopVUMeters();
                stopFloatingNotes();
                stopCrackle();
                break;

case YT.PlayerState.ENDED:
                setPlaybackState(false);
                elements.playerStatusText.textContent = "TRACK FINISHED";
                stopProgressTracker();
                stopVUMeters();
                stopFloatingNotes();
                stopCrackle();

                // Play next track in queue after brief needle lift delay
                setTimeout(() => {
                    playNextTrack();
                }, 1200);
                break;

            case YT.PlayerState.BUFFERING:
                elements.playerStatusText.textContent = "BUFFERING...";
                break;

            case YT.PlayerState.CUED:
                elements.playerStatusText.textContent = "CUED • READY TO PLAY";
                break;
        }
    }

    function onPlayerError(err) {
        console.warn("YouTube Player Error:", err);
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            showToast("Multiple tracks failed to play. Check your connection or try different videos.", true);
            setPowerState(false);
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                ytPlayer.pauseVideo();
            }
            stopPlaybackVisuals();
            consecutiveErrors = 0;
            return;
        }
        showToast("Track unplayable or restricted by YouTube. Skipping to next...");
        setTimeout(() => {
            playNextTrack();
        }, 1500);
    }

    /* ==========================================================================
       QUEUE MANAGEMENT (MAX 100)
       ========================================================================== */
    function ensureMinimumQueue() {
        // If queue is empty, randomly pick machine preset songs until we have at least 3 tracks
        if (playlistQueue.length === 0) {
            const shuffled = [...PRESET_SONGS].sort(() => 0.5 - Math.random());
            const tracksToAdd = shuffled.slice(0, 3);
            
            tracksToAdd.forEach(song => {
                playlistQueue.push({
                    id: generateUniqueId(),
                    youtubeId: song.youtubeId,
                    title: song.title,
                    url: song.url,
                    sender: song.sender,
                    message: song.message,
                    durationStr: song.durationStr
                });
            });
            
            renderQueueUI();
        }
    }

    function addTrackToQueue(trackData) {
        if (playlistQueue.length >= MAX_QUEUE_SIZE) {
            showToast(`Queue is full (${MAX_QUEUE_SIZE}/${MAX_QUEUE_SIZE})! Wait for current songs to finish.`);
            return false;
        }

        playlistQueue.push(trackData);
        renderQueueUI();
        showToast(`Added "${trackData.title}" to vinyl queue!`, false);

        // If nothing is currently playing and power is ON, start playing automatically
        if (isPowerOn && !currentTrack && isPlaying === false) {
            playNextTrack();
        }

        return true;
    }

    function removeTrackFromQueue(trackId) {
        playlistQueue = playlistQueue.filter(t => t.id !== trackId);
        renderQueueUI();
        ensureMinimumQueue();
    }

    function playNextTrack() {
        if (playlistQueue.length === 0) {
            ensureMinimumQueue();
        }

        if (playlistQueue.length > 0) {
            const nextTrack = playlistQueue.shift();
            renderQueueUI();
            loadAndPlayTrack(nextTrack);
        } else {
            elements.playerStatusText.textContent = "QUEUE EMPTY";
            stopPlaybackVisuals();
        }
    }

    /* ==========================================================================
       INTERFACE MODE SWITCHER
       ========================================================================== */
    function setInterfaceMode(mode) {
        currentInterfaceMode = mode;
        localStorage.setItem('ghibli_mode', mode);

        // Update tab buttons active state
        if (elements.modeBtnVinyl) elements.modeBtnVinyl.classList.toggle('active', mode === 'vinyl');
        if (elements.modeBtnIpod) elements.modeBtnIpod.classList.toggle('active', mode === 'ipod');
        if (elements.modeBtnTape) elements.modeBtnTape.classList.toggle('active', mode === 'tape');

        // Update stage views active state
        if (elements.vinylStage) elements.vinylStage.classList.toggle('active', mode === 'vinyl');
        if (elements.ipodStage) elements.ipodStage.classList.toggle('active', mode === 'ipod');
        if (elements.tapeStage) elements.tapeStage.classList.toggle('active', mode === 'tape');

        // Update Crackle / Tape Hiss / Click Audio Label
        if (elements.crackleLabelText) {
            if (mode === 'vinyl') elements.crackleLabelText.textContent = "CRACKLE";
            else if (mode === 'tape') elements.crackleLabelText.textContent = "TAPE HISS";
            else elements.crackleLabelText.textContent = "CLICK SOUND";
        }
    }

    function loadAndPlayTrack(track) {
        currentTrack = track;
        
        // Update Now Playing UI details
        elements.nowPlayingTitle.textContent = track.title;
        elements.nowPlayingSender.innerHTML = `<i class="ri-user-3-line"></i> Requested by: <strong>${escapeHtml(track.sender)}</strong>`;
        
        // Continuously Revolving Track Dedication Message Ticker
        const msgStr = track.message ? `"${escapeHtml(track.message)}"` : `"Enjoying cozy 90s audio classics..."`;
        elements.revolvingMessageText.innerHTML = `💌 ${msgStr} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; 💌 ${msgStr} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;`;
        
        // Force restart revolving animation
        elements.revolvingMessageText.style.animation = 'none';
        void elements.revolvingMessageText.offsetWidth;
        elements.revolvingMessageText.style.animation = 'revolvingMarquee 16s linear infinite';

        // Update Vinyl stage label
        elements.vinylLabelTitle.textContent = track.title.substring(0, 18);
        elements.marqueeTicker.textContent = `★ NOW PLAYING: ${track.title.toUpperCase()} • REQUESTED BY: ${track.sender.toUpperCase()} • DEDICATION: ${track.message ? '"' + track.message.toUpperCase() + '"' : 'ENJOY THE VIBES'} ★`;

        // Update iPod stage screen details
        if (elements.ipodTrackTitle) elements.ipodTrackTitle.textContent = track.title;
        if (elements.ipodArtistName) elements.ipodArtistName.textContent = `Req: ${track.sender}`;
        if (elements.ipodAlbumName) elements.ipodAlbumName.textContent = track.message ? `"${track.message}"` : "GhibliTone Jukebox";

        // Update Tape stage label details
        if (elements.tapeLabelTitle) elements.tapeLabelTitle.textContent = track.title.substring(0, 24);
        if (elements.tapeLabelSub) elements.tapeLabelSub.textContent = `SIDE A • REQ: ${track.sender.substring(0, 15)}`;

        // Trigger Gramophone Animation Sequence
        triggerGramophoneAnimation();

        // Load YouTube audio
        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            ytPlayer.loadVideoById(track.youtubeId);
            if (isPowerOn) {
                ytPlayer.playVideo();
            }
        }
    }

    /* ==========================================================================
       ANIMATION SEQUENCER (VINYL DROP & TONEARM MOVE)
       ========================================================================== */
    function triggerGramophoneAnimation() {
        // Reset animations
        elements.vinylRecord.classList.remove('placing', 'spinning');
        elements.tonearmAssembly.classList.remove('on-record');
        document.body.classList.remove('playing');

        // Step 1: Place new vinyl onto turntable platter
        void elements.vinylRecord.offsetWidth; // Force reflow
        elements.vinylRecord.classList.add('placing');
        elements.playerStatusText.textContent = "PLACING VINYL RECORD...";

        // Step 2: Swing tonearm onto record needle drop after 600ms
        setTimeout(() => {
            elements.tonearmAssembly.classList.add('on-record');
            elements.playerStatusText.textContent = "DROPPING NEEDLE...";
        }, 600);

        // Step 3: Start spinning vinyl record & enable soundwaves after 1100ms
        setTimeout(() => {
            if (isPowerOn) {
                elements.vinylRecord.classList.add('spinning');
                document.body.classList.add('playing');
            }
        }, 1100);
    }

    function setPlaybackState(active) {
        isPlaying = active;
        if (active) {
            elements.playPauseIcon.className = "ri-pause-fill";
            if (elements.ipodStatusIcon) elements.ipodStatusIcon.innerHTML = `<i class="ri-pause-fill"></i>`;
            elements.vinylRecord.classList.add('spinning');
            elements.tonearmAssembly.classList.add('on-record');
            document.body.classList.add('playing');

            // Tape Recorder Piano Keys
            if (elements.tapeKeyPlay) elements.tapeKeyPlay.classList.add('pressed');
            if (elements.tapeKeyPause) elements.tapeKeyPause.classList.remove('pressed');
            if (elements.tapeKeyStop) elements.tapeKeyStop.classList.remove('pressed');
        } else {
            elements.playPauseIcon.className = "ri-play-fill";
            if (elements.ipodStatusIcon) elements.ipodStatusIcon.innerHTML = `<i class="ri-play-fill"></i>`;
            elements.vinylRecord.classList.remove('spinning');
            document.body.classList.remove('playing');

            // Tape Recorder Piano Keys
            if (elements.tapeKeyPlay) elements.tapeKeyPlay.classList.remove('pressed');
            if (elements.tapeKeyPause && isPowerOn && currentTrack) elements.tapeKeyPause.classList.add('pressed');
        }
    }

    function stopPlaybackVisuals() {
        setPlaybackState(false);
        elements.tonearmAssembly.classList.remove('on-record');
        document.body.classList.remove('playing');
    }

    /* ==========================================================================
       UI RENDERERS & HELPERS
       ========================================================================== */
    function renderQueueUI() {
        const count = playlistQueue.length;
        elements.queueCurrentCount.textContent = count;
        
        // Capacity Bar percentage
        const percentage = Math.min((count / MAX_QUEUE_SIZE) * 100, 100);
        elements.capacityFill.style.width = `${percentage}%`;

        // Submit Button state when full
        if (count >= MAX_QUEUE_SIZE) {
            elements.submitQueueBtn.disabled = true;
            elements.submitQueueBtn.innerHTML = `<i class="ri-error-warning-fill"></i> QUEUE FULL (${MAX_QUEUE_SIZE}/${MAX_QUEUE_SIZE})`;
        } else {
            elements.submitQueueBtn.disabled = false;
            elements.submitQueueBtn.innerHTML = `<i class="ri-disc-fill"></i> PLACE ON RECORD QUEUE`;
        }

        // Render List
        if (count === 0) {
            elements.queueListContainer.innerHTML = `
                <div class="empty-queue-placeholder">
                    <i class="ri-album-line"></i>
                    <p>Queue is empty! Adding nostalgic machine songs shortly...</p>
                </div>
            `;
            return;
        }

        let html = '';
        playlistQueue.forEach((track, index) => {
            html += `
                <div class="queue-item" data-id="${track.id}">
                    <div class="item-left">
                        <span class="item-num">#${index + 1}</span>
                        <div class="item-details">
                            <span class="item-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</span>
                            <span class="item-sub">
                                Req: <span>${escapeHtml(track.sender)}</span>
                                ${track.message ? `• "${escapeHtml(track.message)}"` : ''}
                            </span>
                        </div>
                    </div>
                    <div class="item-right">
                        <span class="item-duration">${track.durationStr || '03:45'}</span>
                        <button class="remove-btn" title="Remove track" onclick="window.removeQueueTrack('${track.id}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        elements.queueListContainer.innerHTML = html;
    }

    window.removeQueueTrack = function (id) {
        removeTrackFromQueue(id);
    };

    function showToast(msg, isError = true) {
        elements.toastMessage.textContent = msg;
        elements.toastBanner.className = isError ? 'toast-banner' : 'toast-banner success-toast';
        elements.toastBanner.classList.remove('hidden');

        if (window._toastTimer) clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => {
            elements.toastBanner.classList.add('hidden');
        }, 4000);
    }

    /* ==========================================================================
       PROGRESS TRACKER & VU METERS
       ========================================================================== */
    function startProgressTracker() {
        stopProgressTracker();
        progressTimer = setInterval(() => {
            if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;

            const currTime = ytPlayer.getCurrentTime() || 0;
            const duration = ytPlayer.getDuration() || 0;

            const formattedCurr = formatTime(currTime);
            const formattedTotal = formatTime(duration);

            elements.currentTimeText.textContent = formattedCurr;
            elements.timeDisplay.textContent = formattedCurr;
            elements.totalTimeText.textContent = formattedTotal;

            if (elements.ipodCurrentTime) elements.ipodCurrentTime.textContent = formattedCurr;
            if (elements.ipodTotalTime) elements.ipodTotalTime.textContent = formattedTotal;

            if (duration > 0) {
                const percent = (currTime / duration) * 100;
                elements.progressBarFill.style.width = `${percent}%`;
                if (elements.ipodBarFill) elements.ipodBarFill.style.width = `${percent}%`;
            }

            // Update Mechanical Tape Counter
            if (isPlaying) {
                tapeCounterVal = Math.floor(currTime);
                updateTapeCounterDisplay(tapeCounterVal);
            }
        }, 500);
    }

    function updateTapeCounterDisplay(val) {
        const str = String(Math.abs(val) % 1000).padStart(3, '0');
        if (elements.counterDigit1) elements.counterDigit1.textContent = str[0];
        if (elements.counterDigit2) elements.counterDigit2.textContent = str[1];
        if (elements.counterDigit3) elements.counterDigit3.textContent = str[2];
    }

    function stopProgressTracker() {
        if (progressTimer) clearInterval(progressTimer);
    }

    function startVUMeters() {
        stopVUMeters();
        vuMeterTimer = setInterval(() => {
            if (!isPlaying) {
                elements.vuNeedleL.style.transform = `rotate(-40deg)`;
                elements.vuNeedleR.style.transform = `rotate(-40deg)`;
                return;
            }
            // Generate dynamic analog VU needle flickers
            const angleL = -30 + Math.random() * 65;
            const angleR = -30 + Math.random() * 65;
            elements.vuNeedleL.style.transform = `rotate(${angleL}deg)`;
            elements.vuNeedleR.style.transform = `rotate(${angleR}deg)`;
        }, 120);
    }

    function stopVUMeters() {
        if (vuMeterTimer) clearInterval(vuMeterTimer);
        elements.vuNeedleL.style.transform = `rotate(-40deg)`;
        elements.vuNeedleR.style.transform = `rotate(-40deg)`;
    }

    function startFloatingNotes() {
        stopFloatingNotes();
        const noteSymbols = ['🎵', '🎶', '🎷', '🎸', '🎺', '🎼'];
        floatingNotesTimer = setInterval(() => {
            if (!isPlaying) return;
            const noteEl = document.createElement('div');
            noteEl.className = 'floating-note';
            noteEl.textContent = noteSymbols[Math.floor(Math.random() * noteSymbols.length)];
            noteEl.style.left = `${100 + Math.random() * 40}px`;
            elements.floatingNotes.appendChild(noteEl);

            setTimeout(() => {
                noteEl.remove();
            }, 3500);
        }, 1200);
    }

    function stopFloatingNotes() {
        if (floatingNotesTimer) clearInterval(floatingNotesTimer);
    }

    /* ==========================================================================
       YOUTUBE LINK PARSER & METADATA FETCH
       ========================================================================== */
    function extractYouTubeId(urlStr) {
        if (!urlStr) return null;
        urlStr = urlStr.trim();
        
        // Direct ID check (11 alphanumeric characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(urlStr)) return urlStr;

        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = urlStr.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async function fetchYouTubeTitle(ytId) {
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
            if (response.ok) {
                const data = await response.json();
                return data.title || `YouTube Track (${ytId})`;
            }
        } catch (e) {
            console.log("OEmbed fetch failed, using fallback title");
        }
        return `Nostalgic Track (${ytId})`;
    }

    /* ==========================================================================
       SIMULATED ONLINE USER COUNTER (ATMOSPHERIC)
       ========================================================================== */
    function initOnlineUserCounter() {
        let baseCount = Math.floor(Math.random() * 5) + 3; // 3 to 7 base listeners

        function updateCounterDisplay() {
            elements.onlineUsersCount.textContent = baseCount + onlineUsersCount - 1;
        }

        updateCounterDisplay();

        // Small pulse fluctuation every 10 seconds for atmosphere
        setInterval(() => {
            const delta = Math.random() > 0.5 ? 1 : -1;
            baseCount = Math.max(2, Math.min(15, baseCount + delta));
            updateCounterDisplay();
        }, 10000);
    }

/* ==========================================================================
        EVENT LISTENERS & FORM HANDLERS
        ========================================================================== */
    function setupEventListeners() {
        // Power Button
        elements.powerBtn.addEventListener('click', () => {
            setPowerState(!isPowerOn);

            if (isPowerOn) {
                elements.playerStatusText.textContent = "POWER ON";
                if (!currentTrack) {
                    playNextTrack();
                } else if (ytPlayer) {
                    ytPlayer.playVideo();
                }
            } else {
                elements.playerStatusText.textContent = "POWER OFF";
                if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                    ytPlayer.pauseVideo();
                }
                stopPlaybackVisuals();
            }
        });

        // Play/Pause Button
        elements.playPauseBtn.addEventListener('click', () => {
            if (!isPowerOn) {
                elements.powerBtn.click(); // Auto power-on
                return;
            }

            if (isPlaying) {
                if (ytPlayer) ytPlayer.pauseVideo();
            } else {
                if (!currentTrack) {
                    playNextTrack();
                } else if (ytPlayer) {
                    ytPlayer.playVideo();
                }
            }
        });

        // Skip Button
        elements.skipBtn.addEventListener('click', () => {
            if (!isPowerOn) setPowerState(true);
            playNextTrack();
        });

        // Volume Slider
        elements.volumeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            elements.volumeVal.textContent = `${val}%`;
            if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
                ytPlayer.setVolume(val);
            }
            if (val == 0) {
                elements.volumeIcon.className = "ri-volume-mute-fill volume-icon";
            } else if (val < 50) {
                elements.volumeIcon.className = "ri-volume-down-fill volume-icon";
            } else {
                elements.volumeIcon.className = "ri-volume-up-fill volume-icon";
            }
        });

        // Crackle Toggle Button
        elements.crackleToggleBtn.addEventListener('click', () => {
            isCrackleOn = !isCrackleOn;
            elements.crackleStatus.textContent = isCrackleOn ? 'ON' : 'OFF';
            if (isCrackleOn && isPlaying) {
                startCrackle();
            } else {
                stopCrackle();
            }
        });

        // Progress Bar Seek
        elements.progressBarBg.addEventListener('click', (e) => {
            if (!ytPlayer || !currentTrack) return;
            const rect = elements.progressBarBg.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const duration = ytPlayer.getDuration() || 0;
            if (duration > 0) {
                const seekToTime = clickPos * duration;
                ytPlayer.seekTo(seekToTime, true);
            }
        });

        // Paste Button
        elements.pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) elements.ytUrlInput.value = text;
            } catch (err) {
                showToast("Clipboard access denied. Please paste manually.", true);
            }
        });

        // Mode Switcher Tabs
        if (elements.modeBtnVinyl) {
            elements.modeBtnVinyl.addEventListener('click', () => setInterfaceMode('vinyl'));
        }
        if (elements.modeBtnIpod) {
            elements.modeBtnIpod.addEventListener('click', () => setInterfaceMode('ipod'));
        }
        if (elements.modeBtnTape) {
            elements.modeBtnTape.addEventListener('click', () => setInterfaceMode('tape'));
        }

        // Classic iPod Click Wheel Listeners
        if (elements.ipodBtnPlay) {
            elements.ipodBtnPlay.addEventListener('click', () => elements.playPauseBtn.click());
        }
        if (elements.ipodBtnCenter) {
            elements.ipodBtnCenter.addEventListener('click', () => elements.playPauseBtn.click());
        }
        if (elements.ipodBtnNext) {
            elements.ipodBtnNext.addEventListener('click', () => elements.skipBtn.click());
        }
        if (elements.ipodBtnPrev) {
            elements.ipodBtnPrev.addEventListener('click', () => {
                if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && ytPlayer.getCurrentTime() > 3) {
                    ytPlayer.seekTo(0, true);
                } else {
                    showToast("Restarted track from start", false);
                    if (ytPlayer) ytPlayer.seekTo(0, true);
                }
            });
        }
        if (elements.ipodBtnMenu) {
            elements.ipodBtnMenu.addEventListener('click', () => {
                elements.crackleToggleBtn.click();
                showToast(`Audio Effect: ${isCrackleOn ? 'ENABLED' : 'MUTED'}`, false);
            });
        }
        if (elements.ipodBarBg) {
            elements.ipodBarBg.addEventListener('click', (e) => {
                if (!ytPlayer || !currentTrack) return;
                const rect = elements.ipodBarBg.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const duration = ytPlayer.getDuration() || 0;
                if (duration > 0) {
                    ytPlayer.seekTo(clickPos * duration, true);
                }
            });
        }

        // Tape Recorder Mechanical Piano Key Listeners
        if (elements.tapeKeyPlay) {
            elements.tapeKeyPlay.addEventListener('click', () => {
                if (!isPowerOn) setPowerState(true);
                if (!isPlaying) elements.playPauseBtn.click();
            });
        }
        if (elements.tapeKeyPause) {
            elements.tapeKeyPause.addEventListener('click', () => {
                if (isPlaying) elements.playPauseBtn.click();
            });
        }
        if (elements.tapeKeyStop) {
            elements.tapeKeyStop.addEventListener('click', () => {
                if (isPlaying) elements.playPauseBtn.click();
                elements.playerStatusText.textContent = "TAPE STOPPED";
                stopPlaybackVisuals();
            });
        }
        if (elements.tapeKeyRew) {
            elements.tapeKeyRew.addEventListener('click', () => {
                if (!ytPlayer || !currentTrack) return;
                document.body.classList.add('tape-rewind');
                const curr = ytPlayer.getCurrentTime() || 0;
                const target = Math.max(0, curr - 15);
                ytPlayer.seekTo(target, true);
                showToast("Rewinding tape -15s...", false);
                setTimeout(() => document.body.classList.remove('tape-rewind'), 800);
            });
        }
        if (elements.tapeKeyFf) {
            elements.tapeKeyFf.addEventListener('click', () => {
                if (!ytPlayer || !currentTrack) return;
                document.body.classList.add('tape-ff');
                const curr = ytPlayer.getCurrentTime() || 0;
                const duration = ytPlayer.getDuration() || 0;
                const target = Math.min(duration - 1, curr + 15);
                ytPlayer.seekTo(target, true);
                showToast("Fast forwarding tape +15s...", false);
                setTimeout(() => document.body.classList.remove('tape-ff'), 800);
            });
        }
        if (elements.tapeKeyRec) {
            elements.tapeKeyRec.addEventListener('click', () => {
                elements.tapeKeyRec.classList.toggle('pressed');
                const isRec = elements.tapeKeyRec.classList.contains('pressed');
                showToast(isRec ? "Cassette REC Mode: Arming YouTube Stream Audio..." : "REC Mode Standby", false);
            });
        }
        if (elements.tapeCounterReset) {
            elements.tapeCounterReset.addEventListener('click', () => {
                tapeCounterVal = 0;
                updateTapeCounterDisplay(0);
                showToast("Tape counter reset to 000", false);
            });
        }

        // Form Submit
        elements.requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const urlInput = elements.ytUrlInput.value.trim();
            const senderVal = elements.senderInput.value.trim() || "Anonymous 90s Fan";
            const messageVal = elements.messageInput.value.trim() || "Enjoy the music!";

            const ytId = extractYouTubeId(urlInput);
            if (!ytId) {
                showToast("Invalid YouTube URL or Video ID. Please check the link!", true);
                return;
            }

            elements.submitQueueBtn.disabled = true;
            elements.submitQueueBtn.innerHTML = `<i class="ri-loader-4-line spin-icon"></i> FETCHING TRACK...`;

            const title = await fetchYouTubeTitle(ytId);
            
            const newTrack = {
                id: generateUniqueId(),
                youtubeId: ytId,
                title: title,
                url: urlInput,
                sender: senderVal,
                message: messageVal,
                durationStr: "??:??"
            };

            const success = addTrackToQueue(newTrack);

            if (success) {
                elements.ytUrlInput.value = '';
                elements.messageInput.value = '';
            }
        });
    }

    /* ==========================================================================
       POWER STATE HELPER
       ========================================================================== */
    function setPowerState(on) {
        isPowerOn = on;
        if (elements.powerBtn) {
            elements.powerBtn.classList.toggle('active', isPowerOn);
        }
    }

    /* ==========================================================================
       PROCEDURAL VINYL CRACKLE (Web Audio API)
       ========================================================================== */
    function generateCrackleBuffer() {
        if (!window.AudioContext && !window.webkitAudioContext) return null;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 4;
        const sampleRate = ctx.sampleRate;
        const length = duration * sampleRate;
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) * 0.99;
            data[i] = lastOut * 0.15;

            if (Math.random() < 0.0003) {
                const popLen = Math.min(200, length - i);
                for (let j = 0; j < popLen; j++) {
                    data[i + j] += (Math.random() * 2 - 1) * 0.3 * (1 - j / popLen);
                }
            }
        }
        return buffer;
    }

    function startCrackle() {
        if (window.crackleSource) return;
        if (!window.crackleAudioCtx) {
            window.crackleAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!window.crackleBuffer) {
            window.crackleBuffer = generateCrackleBuffer();
            if (!window.crackleBuffer) return;
        }
        if (window.crackleAudioCtx.state === 'suspended') {
            window.crackleAudioCtx.resume();
        }
        window.crackleGainNode = window.crackleAudioCtx.createGain();
        window.crackleGainNode.gain.value = 0.3;
        window.crackleGainNode.connect(window.crackleAudioCtx.destination);

        window.crackleSource = window.crackleAudioCtx.createBufferSource();
        window.crackleSource.buffer = window.crackleBuffer;
        window.crackleSource.loop = true;
        window.crackleSource.connect(window.crackleGainNode);
        window.crackleSource.start(0);
    }

    function stopCrackle() {
        if (window.crackleSource) {
            window.crackleSource.stop();
            window.crackleSource.disconnect();
            window.crackleSource = null;
        }
        if (window.crackleGainNode) {
            window.crackleGainNode.disconnect();
            window.crackleGainNode = null;
        }
    }

    /* ==========================================================================
       HELPER FUNCTIONS
       ========================================================================== */
    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return "0:00";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function generateUniqueId() {
        return 'track_' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function initGhibliParticles() {
        if (!elements.ghibliParticles) return;
        const particleCount = 18;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'ghibli-particle';
            particle.style.left = `${Math.random() * 100}vw`;
            particle.style.animationDuration = `${6 + Math.random() * 10}s`;
            particle.style.animationDelay = `${Math.random() * 8}s`;
            elements.ghibliParticles.appendChild(particle);
        }
    }

    // Initialize application on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        setInterfaceMode(currentInterfaceMode);
        initOnlineUserCounter();
        initGhibliParticles();
        renderQueueUI();
    });
})();
