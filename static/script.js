/**
 * SafeWay - Women Safety Web Application Script
 * Enriched with Journal, Recorder, Dark Mode, and Flash
 */

document.addEventListener('DOMContentLoaded', () => {
    // Core Elements
    const sosButton = document.getElementById('sosButton');
    const shareLocationBtn = document.getElementById('shareLocationBtn');
    const statusMessage = document.getElementById('statusMessage');
    const locationDisplay = document.getElementById('locationDisplay');

    // Advanced Elements
    const sirenBtn = document.getElementById('sirenBtn');
    const timerInput = document.getElementById('timerInput');

    const startTimerBtn = document.getElementById('startTimerBtn');
    const stopTimerBtn = document.getElementById('stopTimerBtn');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const fakeCallBtn = document.getElementById('fakeCallBtn');
    const fakeCallModal = document.getElementById('fakeCallModal');
    const recordBtn = document.getElementById('recordBtn');
    const recordStatus = document.getElementById('recordStatus');
    const flashBtn = document.getElementById('flashBtn');
    const flashOverlay = document.getElementById('safetyFlashOverlay');

    // UI Toggles
    const darkModeToggle = document.getElementById('darkModeToggle');
    const discreetModeToggle = document.getElementById('discreetModeToggle');

    // Journal & Contacts
    const journalForm = document.getElementById('journalForm');
    const journalList = document.getElementById('journalList');
    const contactForm = document.getElementById('contactForm');
    const contactsList = document.getElementById('contactsList');
    const connectionBadge = document.getElementById('connectionBadge');

    let safetyTimer = null;
    let sirenOn = false;
    let mediaRecorder = null;
    let audioChunks = [];

    // Protocol Check
    if (window.location.protocol === 'file:') {
        alert("⚠️ CRITICAL: You have opened the HTML file directly. The database and SOS features will ONLY work if you run the app via the Flask server (python app.py) and visit http://127.0.0.1:5000");
        if (connectionBadge) {
            connectionBadge.textContent = "FILE MODE";
            connectionBadge.className = "connection-badge warning";
        }
    }

    /**
     * Dark Mode Toggle
     */
    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        darkModeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.textContent = '☀️';
    }

    /**
     * Discreet Mode Toggle
     */
    let discreetOn = false;
    discreetModeToggle.addEventListener('click', () => {
        discreetOn = !discreetOn;
        const logo = document.querySelector('.logo');
        if (discreetOn) {
            logo.textContent = "UtilityApp";
            logo.style.color = "#555";
        } else {
            logo.textContent = "SafeWay";
            logo.style.color = "var(--sos-color)";
        }
    });

    /**
     * Audio Recorder (Stealth)
     */
    recordBtn.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const link = document.createElement('a');
                    link.href = audioUrl;
                    link.download = `Evidence_${new Date().getTime()}.wav`;
                    link.click();
                    recordStatus.textContent = "Evidence Saved";
                };

                mediaRecorder.start();
                recordBtn.textContent = "Stop Recording";
                recordBtn.classList.add('btn-secondary');
                recordStatus.textContent = "Recording...";
            } catch (err) {
                alert("Microphone permission denied.");
            }
        } else {
            mediaRecorder.stop();
            recordBtn.textContent = "Start Recording";
            recordBtn.classList.remove('btn-secondary');
        }
    });

    /**
     * Safety Flash
     */
    flashBtn.addEventListener('click', () => {
        flashOverlay.style.display = "block";
        setTimeout(() => {
            flashOverlay.style.display = "none";
        }, 30000); // 30s auto-off
    });

    flashOverlay.addEventListener('click', () => {
        flashOverlay.style.display = "none";
    });

    /**
     * Incident Journal (Backend API)
     */
    async function getJournal() {
        try {
            const response = await fetch('/api/journal');
            if (!response.ok) throw new Error("Server Error");
            const data = await response.json();
            if (connectionBadge) {
                connectionBadge.textContent = "Connected";
                connectionBadge.className = "connection-badge online";
            }
            return data;
        } catch (error) {
            console.error("Journal Fetch Error:", error);
            if (connectionBadge) {
                connectionBadge.textContent = "Offline";
                connectionBadge.className = "connection-badge offline";
            }
            return [];
        }
    }

    async function saveJournalEntry(title, desc) {
        try {
            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: desc })
            });
            if (!response.ok) throw new Error("Save Failed");
            renderJournal();
        } catch (error) {
            console.error("Journal Save Error:", error);
            alert("Connection Error: Could not save journal. Is the Flask server running?");
        }
    }

    async function renderJournal() {
        const entries = await getJournal();
        journalList.innerHTML = entries.map((e, i) => `
            <div class="journal-item">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4>${e.title}</h4>
                    <span style="color:red;cursor:pointer" onclick="window.removeJournal(${e.id})">X</span>
                </div>
                <span>${e.timestamp}</span>
                <p>${e.description}</p>
            </div>
        `).join('');
    }

    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('journalTitle').value;
        const desc = document.getElementById('journalDesc').value;
        await saveJournalEntry(title, desc);
        journalForm.reset();
    });

    window.removeJournal = async (id) => {
        try {
            await fetch(`/api/journal/${id}`, { method: 'DELETE' });
            renderJournal();
        } catch (error) {
            console.error("Journal Delete Error:", error);
        }
    };

    /**
     * Guide Accordion
     */
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });

    /**
     * -- Reusing Core Features from previous version --
     */
    function updateStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = `status-text ${type}`;
    }

    /**
     * SOS Trigger Functionality
     * Fetches current location, retrieves trusted contacts, and sends alert to backend.
     */
    sosButton.addEventListener('click', async () => {
        updateStatus("SOS TRIGGERED!", "loading");

        // 1. Get GPS Location
        if (!navigator.geolocation) {
            updateStatus("Geolocation not supported", "error");
            const contacts = await getContacts();
            triggerBackendAlert("Unknown Location", "None", contacts);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const mapLink = `https://www.google.com/maps?q=${lat},${lon}`;
                const locationStr = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

                locationDisplay.innerHTML = `<a href="${mapLink}" target="_blank">📍 View Current Location</a>`;

                // 2. Get Contacts from backend API
                const contacts = await getContacts();

                // 3. Trigger Backend Alert
                await triggerBackendAlert(locationStr, mapLink, contacts);
            },
            async (err) => {
                console.error("Location error:", err);
                updateStatus("Location Access Denied", "error");
                const contacts = await getContacts();
                await triggerBackendAlert("Location Access Denied", "None", contacts);
            }
        );
    });

    async function triggerBackendAlert(location, mapLink, contacts) {
        try {
            updateStatus("Alerting contacts...", "loading");

            // 1. Log to server
            const response = await fetch('/send-sos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location, mapLink, contacts })
            });

            const result = await response.json();

            // 2. Open WhatsApp Direct Link
            if (contacts && contacts.length > 0) {
                const firstContact = contacts[0];
                const cleanPhone = firstContact.phone.replace(/[^0-9]/g, ''); // Numbers only

                // Add 91 if it's 10 digits (India default)
                let finalPhone = cleanPhone;
                if (cleanPhone.length === 10) finalPhone = "91" + cleanPhone;

                const message = `🚨 EMERGENCY SOS from SafeWay!\nLocation: ${location}\nMap: ${mapLink}\nPlease check on me immediately!`;
                const encodedMessage = encodeURIComponent(message);

                const waLink = `https://wa.me/${finalPhone}?text=${encodedMessage}`;

                updateStatus("✅ WhatsApp Opening...", "success");

                // Open WhatsApp
                window.open(waLink, '_blank');

                alert(`SOS triggered! Opening WhatsApp for ${firstContact.name}. \nPlease click SEND in the WhatsApp app.`);
            } else {
                updateStatus("❌ No Contacts Found", "error");
                alert("You have no trusted contacts saved. Please add some first!");
            }

            if (connectionBadge && result.status === "success") {
                connectionBadge.textContent = "Connected";
                connectionBadge.className = "connection-badge online";
            }
        } catch (error) {
            console.error("Backend error:", error);
            updateStatus("❌ Server Offline", "error");
            alert("Could not connect to safety server. However, you should call emergency services manually if in danger.");
        }
    }

    /**
     * -- Siren Audio Synthesis (Web Audio API) --
     * Generates a realistic wavering siren sound without external files.
     */
    let audioCtx = null;
    let oscillator = null;
    let lfo = null; // Low Frequency Oscillator for the "waver"

    function startSiren() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        oscillator = audioCtx.createOscillator();
        lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        const mainGain = audioCtx.createGain();

        oscillator.type = 'square'; // Harsh sound like a real siren
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);

        lfo.type = 'triangle';
        lfo.frequency.setValueAtTime(1, audioCtx.currentTime); // 1Hz waver

        lfoGain.gain.setValueAtTime(200, audioCtx.currentTime); // Frequency shift range

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        mainGain.gain.setValueAtTime(0.3, audioCtx.currentTime); // Volume

        oscillator.connect(mainGain);
        mainGain.connect(audioCtx.destination);

        oscillator.start();
        lfo.start();
    }

    function stopSiren() {
        if (oscillator) {
            oscillator.stop();
            lfo.stop();
            oscillator.disconnect();
            lfo.disconnect();
        }
    }

    sirenBtn.addEventListener('click', () => {
        sirenOn = !sirenOn;
        if (sirenOn) {
            startSiren();
            sirenBtn.textContent = "Stop Siren";
            sirenBtn.classList.add('active');
            sirenBtn.style.backgroundColor = "var(--sos-color)";
        } else {
            stopSiren();
            sirenBtn.textContent = "Activate Siren";
            sirenBtn.classList.remove('active');
            sirenBtn.style.backgroundColor = "";
        }
    });


    startTimerBtn.addEventListener('click', () => {
        const mins = parseInt(timerInput.value);
        if (!mins) return;
        let seconds = mins * 60;
        startTimerBtn.classList.add('hidden');
        stopTimerBtn.classList.remove('hidden');
        safetyTimer = setInterval(() => {
            seconds--;
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            countdownDisplay.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
            if (seconds <= 0) { clearInterval(safetyTimer); sosButton.click(); resetTimer(); }
        }, 1000);
    });

    stopTimerBtn.addEventListener('click', resetTimer);
    function resetTimer() {
        clearInterval(safetyTimer);
        startTimerBtn.classList.remove('hidden');
        stopTimerBtn.classList.add('hidden');
        countdownDisplay.textContent = "--:--";
    }

    fakeCallBtn.addEventListener('click', () => {
        setTimeout(() => { fakeCallModal.style.display = "block"; }, 10000);
    });
    document.getElementById('declineCall').addEventListener('click', () => fakeCallModal.style.display = "none");
    document.getElementById('acceptCall').addEventListener('click', () => {
        fakeCallModal.style.display = "none";
        alert("Call simulaton active...");
    });

    // Contacts (Backend API)
    async function getContacts() {
        try {
            const response = await fetch('/api/contacts');
            if (!response.ok) throw new Error("Server Error");
            const contacts = await response.json();
            if (connectionBadge) {
                connectionBadge.textContent = "Connected";
                connectionBadge.className = "connection-badge online";
            }
            return contacts;
        } catch (error) {
            console.error("Contacts Fetch Error:", error);
            if (connectionBadge) {
                connectionBadge.textContent = "Offline";
                connectionBadge.className = "connection-badge offline";
            }
            return [];
        }
    }

    async function saveContact(name, phone) {
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });
            if (!response.ok) throw new Error("Save Failed");
            renderContacts();
        } catch (error) {
            console.error("Contact Save Error:", error);
            alert("Connection Error: Could not save contact. Is the Flask server running?");
        }
    }

    async function renderContacts() {
        const contacts = await getContacts();
        contactsList.innerHTML = contacts.map((c, i) => `
            <div class="contact-item">
                <span><strong>${c.name}</strong>: ${c.phone}</span>
                <span style="color:red;cursor:pointer" onclick="window.removeContact(${c.id})">X</span>
            </div>
        `).join('');
    }

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value;
        await saveContact(name, phone);
        contactForm.reset();
    });

    window.removeContact = async (id) => {
        try {
            await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
            renderContacts();
        } catch (error) {
            console.error("Contact Delete Error:", error);
        }
    };

    // Initial Renders
    renderJournal();
    renderContacts();
});
