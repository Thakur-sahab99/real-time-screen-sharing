document.addEventListener('DOMContentLoaded', () => {
    const createSessionBtn = document.getElementById('create-session-btn');
    const startShareBtn = document.getElementById('start-share-btn');
    const stopShareBtn = document.getElementById('stop-share-btn');
    const sessionInfoDiv = document.getElementById('session-info');
    const sessionIdSpan = document.getElementById('session-id');
    const hostTokenSpan = document.getElementById('host-token');
    const screenVideo = document.getElementById('screen-video');
    const statusP = document.getElementById('status');

    let localStream;
    let ws;
    let peerConnections = new Map();
    let sessionId;
    let hostToken;

    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

    createSessionBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/session/create', { method: 'POST' });
            const data = await response.json();
            sessionId = data.sessionId;
            hostToken = data.hostToken;

            sessionIdSpan.textContent = sessionId;
            hostTokenSpan.textContent = hostToken;
            sessionInfoDiv.classList.remove('hidden');
            createSessionBtn.classList.add('hidden');
            statusP.textContent = 'Session created. Click Start Sharing.';
        } catch (error) {
            console.error('Error creating session:', error);
            statusP.textContent = 'Error creating session.';
        }
    });

    startShareBtn.addEventListener('click', async () => {
        try {
            localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            screenVideo.srcObject = localStream;
            startShareBtn.classList.add('hidden');
            stopShareBtn.classList.remove('hidden');
            statusP.textContent = 'Screen sharing started.';

            connectWebSocket();
        } catch (error) {
            console.error('Error starting screen share:', error);
            statusP.textContent = 'Error starting screen share.';
        }
    });

    stopShareBtn.addEventListener('click', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        if (ws) {
            ws.close();
        }
        peerConnections.forEach(pc => pc.close());
        peerConnections.clear();
        stopShareBtn.classList.add('hidden');
        startShareBtn.classList.remove('hidden');
        statusP.textContent = 'Screen sharing stopped.';
    });

    function connectWebSocket() {
        ws = new WebSocket(`ws://${window.location.host}?sessionId=${sessionId}&token=${hostToken}`);

        ws.onopen = () => {
            console.log('Host WebSocket connected');
        };

        ws.onmessage = async (message) => {
            const data = JSON.parse(message.data);
            const viewerId = data.viewerId;

            if (!peerConnections.has(viewerId)) {
                const pc = new RTCPeerConnection({ iceServers });
                peerConnections.set(viewerId, pc);

                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, target: viewerId }));
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    console.log(`ICE state for viewer ${viewerId}: ${pc.iceConnectionState}`);
                };
            }

            const pc = peerConnections.get(viewerId);

            switch (data.type) {
                case 'viewer-answer':
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    break;
                case 'ice-candidate':
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    break;
                case 'request-offer':
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'host-offer', offer: pc.localDescription, target: viewerId }));
                    break;
            }
        };

        ws.onclose = () => {
            console.log('Host WebSocket disconnected');
        };
    }
});
