const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null;
var screenSharing = false;
var cameraEnabled = true;
var microphoneEnabled = true;
var maxCapacity = 100;
var participants = 0;
var remotePeerConnections = {};

function createVideoElement(peerId, stream) {
    let newVideoElement = document.createElement('video');
    newVideoElement.id = `remote-video-${peerId}`;
    newVideoElement.autoplay = true;

    document.getElementById('remote-video-container').appendChild(newVideoElement);

    setRemoteStream(stream, `remote-video-${peerId}`);
}

function createRoom() {
    console.log("Creating Room");
    let room = document.getElementById("room-input").value;
    if (room == "" || room == " ") {
        alert("Please enter room number");
        return;
    }
    room_id = PRE + room + SUF;
    peer = new Peer(room_id, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        },
        maxParticipants: maxCapacity,
    });
    peer.on('open', (id) => {
        console.log("Peer Connected with ID: ", id);
        hideModal();
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            setLocalStream(local_stream);
        }, (err) => {
            console.log(err);
        });
        notify("Waiting for peer to join.");
    });

    peer.on('call', (call) => {
        if (participants < maxCapacity) {
            call.answer(local_stream);

            let newParticipantIdx = participants;
            participants++;

            createVideoElement(call.peer, call.peerConnection.getRemoteStreams()[0]);

            remotePeerConnections[call.peer] = call;

            notify(`Participant ${participants} joined.`);
        } else {
            console.log('Room is full. Cannot accept more participants.');
        }
    });

    peer.on('close', (peerId) => {
        document.getElementById(`remote-video-${peerId}`).remove();
        delete remotePeerConnections[peerId];
    });
}

function setLocalStream(stream) {
    let video = document.getElementById("local-video");
    video.srcObject = stream;
    video.muted = true;
    video.play().catch((error) => console.error('Autoplay error:', error));
}

function setRemoteStream(stream, elementId) {
    let video = document.getElementById(elementId);
    video.srcObject = stream;
    video.play().catch((error) => console.error('Autoplay error:', error));
}

function hideModal() {
    if (room_id) {
        document.getElementById("entry-modal").hidden = true;
        document.getElementById("controls-bar").hidden = false;
    } else {
        document.getElementById("entry-modal").hidden = false;
        document.getElementById("controls-bar").hidden = true;
    }
}

function notify(msg) {
    let notification = document.getElementById("notification");
    notification.innerHTML = msg;
    notification.hidden = false;
    setTimeout(() => {
        notification.hidden = true;
    }, 3000);
}

function joinRoom() {
    console.log("Joining Room");
    let room = document.getElementById("room-input").value;
    if (room == "" || room == " ") {
        alert("Please enter room number");
        return;
    }
    room_id = PRE + room + SUF;
    hideModal();
    peer = new Peer(room_id, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        },
        maxParticipants: maxCapacity,
    });
    peer.on('open', (id) => {
        console.log("Connected with Id: " + id);
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            setLocalStream(local_stream);
            notify("Joining peer");
            let call = peer.call(room_id, stream);
            call.on('stream', (stream) => {
                createVideoElement(call.peer, stream);
            });

            remotePeerConnections[call.peer] = call;

            currentPeer = call;
        }, (err) => {
            console.log(err);
        });
    });

    peer.on('close', (peerId) => {
        document.getElementById(`remote-video-${peerId}`).remove();
        delete remotePeerConnections[peerId];
    });
}

function leaveRoom() {
    console.log("Leaving Room");

    if (participants > 0) {
        participants--;
        notify(`Participant left. ${participants} participants remaining.`);
    }

    for (let peerId in remotePeerConnections) {
        remotePeerConnections[peerId].close();
    }

    if (currentPeer) {
        currentPeer.close();
    }

    if (local_stream) {
        local_stream.getTracks().forEach(track => track.stop());
    }

    stopScreenSharing();

    document.getElementById("entry-modal").hidden = false;

    document.getElementById("local-video").srcObject = null;

    for (let i = 0; i < participants; i++) {
        document.getElementById(`remote-video-${i}`).remove();
    }

    currentPeer = null;
    local_stream = null;

    room_id = null;
}

function startScreenShare() {
    if (screenSharing) {
        stopScreenSharing();
    }
    navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
        screenStream = stream;
        let videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = () => {
            stopScreenSharing();
        };
        if (peer) {
            let sender = currentPeer.peerConnection.getSenders().find(function (s) {
                return s.track.kind == videoTrack.kind;
            });
            sender.replaceTrack(videoTrack);
            screenSharing = true;
        }
        console.log(screenStream);
    });
}

function stopScreenSharing() {
    if (!screenSharing) return;
    let videoTrack = local_stream.getVideoTracks()[0];
    if (peer) {
        let sender = currentPeer.peerConnection.getSenders().find(function (s) {
            return s.track.kind == videoTrack.kind;
        });
        sender.replaceTrack(videoTrack);
    }
    screenStream.getTracks().forEach(function (track) {
        track.stop();
    });
    screenSharing = false;
}

function toggleCamera() {
    if (local_stream) {
        local_stream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        cameraEnabled = !cameraEnabled;
        notify(`Camera ${cameraEnabled ? 'enabled' : 'disabled'}`);
    }
}

function toggleMicrophone() {
    if (local_stream) {
        local_stream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        microphoneEnabled = !microphoneEnabled;
        notify(`Microphone ${microphoneEnabled ? 'enabled' : 'disabled'}`);
    }
}
        
        document.getElementById("toggle-camera-btn").addEventListener("click", toggleCamera);
        document.getElementById("toggle-microphone-btn").addEventListener("click", toggleMicrophone);
        document.getElementById("leave-btn").addEventListener("click", leaveRoom);
    
