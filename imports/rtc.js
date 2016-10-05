import Adapter from 'webrtc-adapter';

var RTCSetupMessages = new Mongo.Collection('rtcsetupmessages');

var Programs;
var peerConnections = {};
var audio = null;
var audioSendTrack = null;
var started = false;

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

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = function (evt) {
    // delete messages for a user when they go offline
    RTCSetupMessages.insert({
      sender: sender,
      receiver: receiver,
      candidate: JSON.stringify(evt.candidate)
    });
  };

  // let the "negotiationneeded" event trigger offer generation
  peerConnection.onnegotiationneeded = function () {
    peerConnection.createOffer().then(function (offer) {
      return peerConnection.setLocalDescription(offer);
    }).then(function () {
      // send the offer to the other peer
      RTCSetupMessages.insert({
        sender: sender,
        receiver: receiver,
        description: JSON.stringify(peerConnection.localDescription)
      });
    }).catch(logError);
  };

  // get a local stream, show it in a self-view and add it to be sent
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).then(function (stream) {
    // addTrack triggers negotiationneeded event
    // change to addTrack when browser supports it
    peerConnection.addStream(stream);
  }).catch(logError);
}

// listen to incoming requests to connect
function listen(receiver) {
  Meteor.subscribe('incoming-messages', receiver);
  // since the subscription only gets messages w/ receiver as receiver
  // we do a general find here
  RTCSetupMessages.find().observe({
    added: (message) => {
      console.log('message received');
    }
  });
}

export function setupPeerConnections(userProgramId, ProgramsCollection) {
  var self = this;
  Programs = ProgramsCollection;
  self.userProgramId = userProgramId;

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
    log(error.name + ": " + error.message);
}
