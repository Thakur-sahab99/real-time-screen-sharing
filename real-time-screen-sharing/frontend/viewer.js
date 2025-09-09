document.addEventListener('DOMContentLoaded', () => {
    const joinSessionBtn = document.getElementById('join-session-btn');
    const joinSessionIdInput = document.getElementById('join-session-id');
    const screenVideo = document.getElementById('screen-video');
    const statusP = document.getElementById('status');

    let ws;
    let pc;

    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

    joinSessionBtn.addEventListener('click', async () => {
        const sessionId = joinSessionIdInput.value;
        if (!sessionId) {
            alert('Please enter a session ID.');
            return;
        }

        try {
            const response = await fetch(`/session/join/${sessionId}`);
            if (response.ok) {
                connectWebSocket(sessionId);
                statusP.textContent = 'Joining session...';
            } else {
                statusP.textContent = 'Session not found.';
            }
        } catch (error) {
            console.error('Error joining session:', error);
            statusP.textContent = 'Error joining session.';
        }
    });

    function connectWebSocket(sessionId) {
        ws = new WebSocket(`ws://${window.location.host}?sessionId=${sessionId}`);

        ws.onopen = () => {
            console.log('Viewer WebSocket connected');
            // Request an offer from the host
            ws.send(JSON.stringify({ type: 'request-offer' }));
        };

        ws.onmessage = async (message) => {
            const data = JSON.parse(message.data);

            if (!pc) {
                pc = new RTCPeerConnection({ iceServers });

                pc.ontrack = (event) => {
                    screenVideo.srcObject = event.streams[0];
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
                    }
                };
            }

            switch (data.type) {
                case 'host-offer':
                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws.send(JSON.stringify({ type: 'viewer-answer', answer: pc.localDescription }));
                    statusP.textContent = 'Connected to host.';
                    break;
                case 'ice-candidate':
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    break;
                case 'host-disconnected':
                    statusP.textContent = 'Host has disconnected.';
                    pc.close();
                    screenVideo.srcObject = null;
                    break;
            }
        };

        ws.onclose = () => {
            console.log('Viewer WebSocket disconnected');
            if (pc) {
                pc.close();
            }
            statusP.textContent = 'Disconnected from session.';
        };
    }
});
