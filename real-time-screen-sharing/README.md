# Real-Time Screen Sharing API

This project demonstrates a secure, real-time screen sharing application using WebRTC, Node.js, and WebSockets.

## How to Run

### 1. Start the Backend Server

Navigate to the backend directory, install dependencies, and start the server.

```bash
cd backend
npm install
npm start
```

The server will be running on `http://localhost:8080`.

### 2. Use the Application

Open your web browser and navigate to `http://localhost:8080`.

#### As a Host:
1.  Click the "Create Session" button.
2.  A new Session ID and Host Token will be displayed.
3.  Click the "Start Sharing" button.
4.  Your browser will prompt you to select a screen, window, or tab to share. Choose one and click "Share".
5.  Your screen is now being shared. Share the Session ID with viewers.

#### As a Viewer:
1.  Obtain the Session ID from the host.
2.  Enter the Session ID into the viewer input field.
3.  Click the "Join Session" button.
4.  The host's screen share will appear in the video player.
