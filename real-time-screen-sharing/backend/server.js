const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/session/create', (req, res) => {
    const sessionId = uuidv4();
    const hostToken = uuidv4();
    sessions.set(sessionId, { host: null, viewers: new Map(), hostToken });
    res.json({ sessionId, hostToken });
});

app.get('/session/join/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (sessions.has(sessionId)) {
        res.status(200).send('Session exists.');
    } else {
        res.status(404).send('Session not found.');
    }
});

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const token = url.searchParams.get('token');

    if (!sessionId || !sessions.has(sessionId)) {
        ws.close(1008, 'Invalid session ID');
        return;
    }

    const session = sessions.get(sessionId);
    const clientId = uuidv4();

    let isHost = false;
    if (token && token === session.hostToken) {
        if (session.host) {
            ws.close(1008, 'Host already connected');
            return;
        }
        isHost = true;
        session.host = { ws, clientId };
        console.log(`Host connected to session ${sessionId}`);
    } else {
        session.viewers.set(clientId, { ws });
        console.log(`Viewer connected to session ${sessionId}`);
    }

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (isHost) {
            // Broadcast host's messages to all viewers
            session.viewers.forEach(viewer => {
                viewer.ws.send(JSON.stringify(parsedMessage));
            });
        } else {
            // Send viewer's messages only to the host
            if (session.host) {
                session.host.ws.send(JSON.stringify({ ...parsedMessage, viewerId: clientId }));
            }
        }
    });

    ws.on('close', () => {
        if (isHost) {
            console.log(`Host disconnected from session ${sessionId}`);
            // Notify all viewers that the host has left
            session.viewers.forEach(viewer => {
                viewer.ws.send(JSON.stringify({ type: 'host-disconnected' }));
                viewer.ws.close();
            });
            sessions.delete(sessionId);
        } else {
            console.log(`Viewer disconnected from session ${sessionId}`);
            session.viewers.delete(clientId);
            if (session.host) {
                session.host.ws.send(JSON.stringify({ type: 'viewer-disconnected', viewerId: clientId }));
            }
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
