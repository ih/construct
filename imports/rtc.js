import Adapter from 'webrtc-adapter';

var RTCSetupMessages = new Mongo.Collection('rtcsetupmessages');

var Programs;
// keys are other user program ids the current user is connected to
var peerConnections = {};

var configuration = {
  'iceServers': [
    {
      'url': 'stun:stun.l.google.com:19302'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    }
  ]
};

function makePeerConnection(sender, receiver) {
  var peerConnection = new RTCPeerConnection(configuration);

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = (evt) => {
    // delete messages for a user when they go offline
    RTCSetupMessages.insert({
      sender: sender,
      receiver: receiver,
      candidate: JSON.stringify(evt.candidate)
    });
  };

  peerConnection.onaddstream = (event) => {
    var stream = event.stream;
    console.log('stream added');
    var audio = document.querySelector('audio');
    window.stream = stream; // make variable available to browser console
    audio.srcObject = stream;
  };

  peerConnection.oniceconnectionstatechange = (event) => {
    console.log(`ice connection state: ${event.target.iceConnectionState}`);
  };

  return peerConnection;
}

// from https://www.w3.org/TR/webrtc/#simple-peer-to-peer-example
// and https://github.com/borismus/copresence-vr/blob/9dbe210f1d8e5cdba5bafaeacf0628de86293e2b/src/peer-connection-rtc.js#L55
// and https://mdn.mozillademos.org/files/12363/WebRTC%20-%20Signaling%20Diagram.svg
function connect(sender, receiver) {
  var peerConnection = makePeerConnection(sender, receiver);
  peerConnections[receiver] = peerConnection;

  // get a local stream, show it in a self-view and add it to be sent
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).then((stream) => {
    // addTrack triggers negotiationneeded event
    // change to addTrack when browser supports it
    peerConnection.addStream(stream);
    peerConnection.createOffer().then((offer) => {
      return peerConnection.setLocalDescription(offer);
    }).then(() => {
      // send the offer to the other peer
      RTCSetupMessages.insert({
        sender: sender,
        receiver: receiver,
        description: JSON.stringify(peerConnection.localDescription)
      });
    }).catch(logError);
  }).catch(logError);
}

// listen to incoming requests to connect
function listen(receiver) {
  Meteor.subscribe('incoming-messages', receiver);
  // even though the subscription only gets incoming messages from the server
  // we need to filter with find b/c of local messages we add to the collection
  RTCSetupMessages.find({receiver: receiver}).observe({
    added: (message) => {
      console.log('message received');
      var peerConnection = peerConnections[message.sender];

      // the message is either an SDP or an ICE candidate
      if (message.description) {
        var description = JSON.parse(message.description);
        if (description.type === 'offer') {
          // if there is no peer connection with the sender create one
          // we are the answerer
          console.log('processing offer');
          if (!peerConnection) {
            peerConnection = makePeerConnection(message.receiver, message.sender);
            peerConnections[message.sender] = peerConnection;
          }
          peerConnection.setRemoteDescription(new RTCSessionDescription(description)).then(() => {

            // get a local stream, show it in a self-view and add it to be sent
            navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            }).then((stream) => {
              // addTrack triggers negotiationneeded event
              // change to addTrack when browser supports it
              peerConnection.addStream(stream);
              return peerConnection.createAnswer();
            }).then((answer) => {
              return peerConnection.setLocalDescription(answer);
            }).then(() => {
              console.log('sending answer');
              RTCSetupMessages.insert({
                sender: message.receiver,
                receiver: message.sender,
                description: JSON.stringify(peerConnection.localDescription)
              });
            }).catch(logError);
          }).catch(logError);
        } else if (description.type == "answer") {
          console.log('processing answer');
          peerConnection.setRemoteDescription(new RTCSessionDescription(description)).catch(logError);
        } else {
          console.log("Unsupported SDP type.");
        }
      } else {
        console.log('adding ice candidate');
        var candidate = new RTCIceCandidate(JSON.parse(message.candidate));
        peerConnection.addIceCandidate(candidate).catch(logError);
      }
    }
  });
}

export function setupPeerConnections(userProgramId, ProgramsCollection) {
  var self = this;
  Programs = ProgramsCollection;
  userProgramId = userProgramId;

  // listen for users who get online trying to connect
  listen(userProgramId);

  // call already online users
  Programs.find(
    {type: 'user', online: true, _id: {$ne: userProgramId}}
  ).forEach((otherUserProgram) => {
    connect(userProgramId, otherUserProgram._id);
  });
}

function logError(error) {
    console.log(error.name + ": " + error.message);
}
