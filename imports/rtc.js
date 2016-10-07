import Adapter from 'webrtc-adapter';

var RTCSetupMessages = new Mongo.Collection('rtcsetupmessages');

var Programs;
var peerConnections = {};
var audio = null;
var audioSendTrack = null;
var started = false;
var userProgramId;

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

// from the spec https://www.w3.org/TR/webrtc/#simple-peer-to-peer-example-with-warm-up
function connect(sender, receiver) {
  var peerConnection = new RTCPeerConnection(configuration);
  peerConnections[receiver] = peerConnection;

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = (evt) => {
    // delete messages for a user when they go offline
    RTCSetupMessages.insert({
      sender: sender,
      receiver: receiver,
      candidate: JSON.stringify(evt.candidate)
    });
  };

  // let the "negotiationneeded" event trigger offer generation
  peerConnection.onnegotiationneeded = () => {
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
  };

  peerConnection.onaddstream = (event) => {
    var stream = event.stream;
    console.log('stream added');
    var audio = document.querySelector('audio');
    window.stream = stream; // make variable available to browser console
    audio.srcObject = stream;
  };

  // get a local stream, show it in a self-view and add it to be sent
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).then((stream) => {
    // addTrack triggers negotiationneeded event
    // change to addTrack when browser supports it
    peerConnection.addStream(stream);
  }).catch(logError);

  return peerConnection;
}

// listen to incoming requests to connect
function listen(receiver) {
  Meteor.subscribe('incoming-messages', receiver);
  // since the subscription only gets messages w/
  // the current user (userProgramId) as receiver
  // we do a general find here
  RTCSetupMessages.find().observe({
    added: (message) => {
      console.log('message received');
      var peerConnection = peerConnections[message.sender];
      // if there is no peer connection with the sender create one
      // we are the answerer
      if (!peerConnection) {
        peerConnection = connect(message.receiver, message.sender);
      }
      // the message is either an SDP or an ICE candidate
      if (message.description) {
        var description = JSON.parse(message.description);
        if (description.type === 'offer') {
          console.log('processing offer');
          peerConnection.setRemoteDescription(description).then(() => {
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
        } else if (description.type == "answer") {
          console.log('processing answer');
          peerConnection.setRemoteDescription(description).catch(logError);
        } else {
          console.log("Unsupported SDP type.");
        }
      } else {
        console.log('adding ice candidate');
        var candidate = JSON.parse(message.candidate);
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
    {type: 'user', online: true, _id: {$ne: self.userProgramId}}
  ).forEach((otherUserProgram) => {
    connect(userProgramId, otherUserProgram._id);
  });
}

function logError(error) {
    console.log(error.name + ": " + error.message);
}
