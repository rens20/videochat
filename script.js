const PRE = "DELTA";
const SUF = "MEET";
var room_id;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null;
var screenSharing = false;

function createRoom() {
    console.log("Creating Room");
    let room = document.getElementById("room-input").value;
    if (room == " " || room == "") {
        alert("Please enter room number");
        return;
    }
    room_id = PRE + room + SUF;
    peer = new Peer(room_id);
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
        call.answer(local_stream);
        call.on('stream', (stream) => {
            setRemoteStream(stream);
        });
        currentPeer = call;
    });
}

function setLocalStream(stream) {
    let video = document.getElementById("local-video");
    video.srcObject = stream;
    video.muted = true;
    video.play();
}

function setRemoteStream(stream) {
    let video = document.getElementById("remote-video");
    video.srcObject = stream;
    video.play();
}

function hideModal() {
    if (room_id) {
        // Users are in a room, no need to show the modal
        document.getElementById("entry-modal").hidden = true;
    } else {
        // Users are not in a room, show the modal
        document.getElementById("entry-modal").hidden = false;
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
    if (room == " " || room == "") {
        alert("Please enter room number");
        return;
    }
    room_id = PRE + room + SUF;
    hideModal();
    peer = new Peer();
    peer.on('open', (id) => {
        console.log("Connected with Id: " + id);
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            setLocalStream(local_stream);
            notify("Joining peer");
            let call = peer.call(room_id, stream);
            call.on('stream', (stream) => {
                setRemoteStream(stream);
            });
            currentPeer = call;
        }, (err) => {
            console.log(err);
        });
    });
}

function leaveRoom() {
    console.log("Leaving Room");

    // Close the current peer connection
    if (currentPeer) {
        currentPeer.close();
    }

    // Stop the local stream
    if (local_stream) {
        local_stream.getTracks().forEach(track => track.stop());
    }

    // Stop screen sharing if it's active
    stopScreenSharing();

    // Show the entry modal again
    document.getElementById("entry-modal").hidden = false;

    // Clear video elements
    document.getElementById("local-video").srcObject = null;
    document.getElementById("remote-video").srcObject = null;

    // Reset current peer and local stream variables
    currentPeer = null;
    local_stream = null;

    // Reset the room_id
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

// Add an event listener to the "Leave Room" button
document.getElementById("leave-btn").addEventListener("click", leaveRoom);
