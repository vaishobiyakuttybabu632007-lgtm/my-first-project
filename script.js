class NoctisEngine {
    constructor() {
        this.state = {
            currentPage: 1,
            audioMuted: false,
            intervals: {},
            animationFrames: {}
        };

        this.elements = {
            pages: {
                1: document.getElementById('page-1'),
                2: document.getElementById('page-2'),
                3: document.getElementById('page-3')
            },
            buttons: {
                enter: document.getElementById('btn-enter'),
                calm: document.getElementById('btn-calm'),
                restart: document.getElementById('btn-restart'),
                audio: document.getElementById('audio-toggle')
            },
            audio: {
                hum: document.getElementById('audio-s1-hum'),
                heartbeat: document.getElementById('audio-s2-heartbeat'),
                whispers: document.getElementById('audio-s2-whispers'),
                piano: document.getElementById('audio-s3-piano')
            },
            containers: {
                negative: document.getElementById('negative-thoughts-container'),
                positive: document.getElementById('positive-thoughts-container'),
                maze: document.getElementById('maze-container')
            },
            canvas: {
                fog: document.getElementById('fog-canvas')
            },
            transitionOverlay: document.getElementById('transition-overlay')
        };

        // Simulated Audio Assets if actual files missing (using Web Audio API oscillators)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = this.audioContext.createGain();
        this.masterVolume.connect(this.audioContext.destination);

        this.bindEvents();
        this.initFogCanvas();
        this.initMazeSVG();
        this.setupAudio();
    }

    bindEvents() {
        this.elements.buttons.enter.addEventListener('click', () => this.transitionToPhase2());
        this.elements.buttons.calm.addEventListener('click', () => this.transitionToPhase3());
        this.elements.buttons.restart.addEventListener('click', () => this.resetToPhase1());
        this.elements.buttons.audio.addEventListener('click', () => this.toggleAudio());

        // Handle resize for canvas
        window.addEventListener('resize', () => {
            this.initFogCanvas();
        });
    }

    /* --- AUDIO MANAGEMENT --- */
    setupAudio() {
        // Since we are running locally without real asset files yet, 
        // we will synthesize the audio nodes directly using the Web Audio API for the premium feel.
        this.synth = {
            hum: this.audioContext.createOscillator(),
            heartbeat: this.audioContext.createOscillator(),
            pianoNode: null // Played dynamically
        };

        const humGain = this.audioContext.createGain();
        humGain.gain.value = 0;
        this.synth.hum.type = 'sawtooth';
        this.synth.hum.frequency.value = 40; // Infrasound hum
        this.synth.hum.connect(humGain);
        humGain.connect(this.masterVolume);
        this.synth.hum.start();
        this.gains = { hum: humGain, heartbeat: null, whispers: null, piano: null };
    }

    fadeAudio(targetLayer, targetVol, duration) {
        if (!this.gains[targetLayer] || this.state.audioMuted) return;
        this.gains[targetLayer].gain.linearRampToValueAtTime(
            targetVol,
            this.audioContext.currentTime + duration
        );
    }

    toggleAudio() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.state.audioMuted = !this.state.audioMuted;
        this.masterVolume.gain.setValueAtTime(this.state.audioMuted ? 0 : 1, this.audioContext.currentTime);

        // Update Icon
        this.elements.buttons.audio.innerHTML = this.state.audioMuted ?
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/><line x1="2" y1="2" x2="22" y2="22"/></svg>` :
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/></svg>`;

        if (!this.state.audioMuted && this.state.currentPage === 1) {
            this.fadeAudio('hum', 0.2, 1);
        }
    }

    playChime() {
        if (this.state.audioMuted) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);

        osc.connect(gain);
        gain.connect(this.masterVolume);
        osc.start();
        osc.stop(this.audioContext.currentTime + 3);
    }

    /* --- SECTION 1: VISUALS --- */
    initFogCanvas() {
        const canvas = this.elements.canvas.fog;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        let particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 100 + 50,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.05 + 0.01
            });
        }

        const animateFog = () => {
            if (this.state.currentPage !== 1) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;

                if (p.x < -p.radius) p.x = canvas.width + p.radius;
                if (p.x > canvas.width + p.radius) p.x = -p.radius;

                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
                gradient.addColorStop(0, `rgba(20, 20, 25, ${p.opacity})`);
                gradient.addColorStop(1, 'rgba(20, 20, 25, 0)');

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            });
            this.state.animationFrames.fog = requestAnimationFrame(animateFog);
        };

        if (this.state.currentPage === 1) animateFog();
    }

    /* --- SECTION 2: VISUALS --- */
    initMazeSVG() {
        const container = this.elements.containers.maze;
        container.innerHTML = `
            <svg width="200%" height="200%" style="position:absolute; top:-50%; left:-50%;">
                <defs>
                    <pattern id="mazePattern" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 0,30 L 60,30 M 30,0 L 30,60" stroke="#222" stroke-width="2"/>
                        <path d="M 15,15 L 45,15 L 45,45 L 15,45 Z" fill="none" stroke="rgba(255,42,42,0.1)" stroke-width="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#mazePattern)" />
            </svg>
        `;

        let rotation = 0;
        const animateMaze = () => {
            if (this.state.currentPage === 2 && !this.state.mazeStopped) {
                rotation += 0.05;
                const svg = container.querySelector('svg');
                svg.style.transform = `rotate(${rotation}deg) scale(1.2)`;
                this.state.animationFrames.maze = requestAnimationFrame(animateMaze);
            }
        };
        this.animateMazeFn = animateMaze;
    }

    triggerGlitchFlash() {
        const flash = document.createElement('div');
        flash.className = 'glitch-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);
    }

    spawnNegativeThought() {
        const thoughts = [
            "Did I lock the door?", "Why can't I sleep?", "Is something wrong with me?",
            "That thing I said in 2015...", "What if tomorrow is a disaster?", "My heart is beating too fast."
        ];

        const el = document.createElement('div');
        el.className = 'glitch-bubble';
        el.textContent = thoughts[Math.floor(Math.random() * thoughts.length)];

        const startX = Math.random() > 0.5 ? -100 : window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        const targetX = startX < 0 ? window.innerWidth + 100 : -100;

        el.style.transform = `translate(${startX}px, ${startY}px)`;

        this.elements.containers.negative.appendChild(el);
        this.triggerGlitchFlash();

        // Complex bezier animation loop via Web Animations API 
        const duration = Math.random() * 4000 + 4000;
        const animation = el.animate([
            { transform: `translate(${startX}px, ${startY}px) rotate(0deg)`, opacity: 0 },
            { opacity: 1, offset: 0.1 },
            { transform: `translate(${window.innerWidth / 2 + (Math.random() * 200 - 100)}px, ${startY + (Math.random() * 100 - 50)}px) rotate(${Math.random() * 20 - 10}deg)`, offset: 0.5, opacity: 0.8 },
            { opacity: 1, offset: 0.9 },
            { transform: `translate(${targetX}px, ${startY + (Math.random() * 200 - 100)}px) rotate(${Math.random() * 40 - 20}deg)`, opacity: 0 }
        ], { duration, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });

        animation.onfinish = () => el.remove();
    }

    /* --- SECTION 3: VISUALS --- */
    spawnPositiveThought() {
        const thoughts = [
            "You are safe.", "This feeling will pass.", "Just breathe.",
            "The world is full of new chances.", "Rest now."
        ];
        const emojis = ['🌿', '☀️', '🌈', '🕊️', '💫', '🌸', '✨'];

        const text = Math.random() > 0.3 ?
            thoughts[Math.floor(Math.random() * thoughts.length)] :
            emojis[Math.floor(Math.random() * emojis.length)];

        const el = document.createElement('div');
        el.className = 'serene-bubble';
        el.textContent = text;

        const x = Math.random() * (window.innerWidth - 200) + 100;
        el.style.left = `${x}px`;
        el.style.bottom = `-50px`;

        this.elements.containers.positive.appendChild(el);
        this.playChime();

        const duration = Math.random() * 10000 + 10000;
        const animation = el.animate([
            { transform: `translateY(0) scale(0.8)`, opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { opacity: 1, offset: 0.8 },
            { transform: `translateY(-${window.innerHeight + 100}px) scale(1.2)`, opacity: 0 }
        ], { duration, easing: 'ease-in-out', fill: 'forwards' });

        animation.onfinish = () => el.remove();
    }

    /* --- TRANSITIONS --- */
    switchPage(from, to, callback) {
        from.classList.remove('active');
        setTimeout(() => {
            from.classList.add('hidden');
            to.classList.remove('hidden');
            setTimeout(() => {
                to.classList.add('active');
                if (callback) callback();
            }, 50);
        }, 1500);
    }

    transitionToPhase2() {
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        this.state.currentPage = 2;
        this.fadeAudio('hum', 0.5, 2);

        this.switchPage(this.elements.pages[1], this.elements.pages[2], () => {
            cancelAnimationFrame(this.state.animationFrames.fog);
            this.state.mazeStopped = false;
            this.animateMazeFn();

            // Start glitch thoughts
            this.spawnNegativeThought();
            this.state.intervals.neg = setInterval(() => this.spawnNegativeThought(), 2000);
        });
    }

    transitionToPhase3() {
        this.state.currentPage = 3;

        // "The Dawning" Cinematic Transition
        this.state.mazeStopped = true; // Stop maze rotation
        clearInterval(this.state.intervals.neg);
        this.elements.containers.negative.innerHTML = ''; // clear thoughts instantly

        // Light eruption
        this.elements.transitionOverlay.classList.add('erupt-light');

        // Audio cut out
        this.fadeAudio('hum', 0, 0.5);

        setTimeout(() => {
            this.switchPage(this.elements.pages[2], this.elements.pages[3], () => {
                this.elements.transitionOverlay.classList.remove('erupt-light');

                // Start soft piano track (simulated)
                setTimeout(() => {
                    this.state.intervals.pos = setInterval(() => this.spawnPositiveThought(), 3000);
                    this.spawnPositiveThought();
                }, 2000);
            });
        }, 1500); // Wait for bright part of flash
    }

    resetToPhase1() {
        this.state.currentPage = 1;
        clearInterval(this.state.intervals.pos);
        this.elements.containers.positive.innerHTML = '';

        this.switchPage(this.elements.pages[3], this.elements.pages[1], () => {
            this.initFogCanvas();
            this.fadeAudio('hum', 0.2, 2);
        });
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.noctis = new NoctisEngine();
});
