import Adapter from 'webrtc-adapter';

var RTCSetupMessages = new Mongo.Collection('rtcsetupmessages');
var Programs;
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

export default class RTC {
  constructor(currentUserProgramId, ProgramsCollection) {
    // keys are other user program ids the current user is connected to
    this.peerConnections = {};
    // keys are other user program ids
    // values are a panner that represents the other user
    // a listener object for the user
    // and the audiocontext for the panner and listener
    this.usersAudioRepresentation = {};
    this.currentUserProgramId = currentUserProgramId;
    Programs = ProgramsCollection;

    // references
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics
    // https://github.com/borismus/copresence-vr/blob/gh-pages/src/audio-renderer.js
    // create the AudioContext and listener
    // panner audio nodes will be added when remote streams get added
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // listen for users who get online trying to connect
    this.listen(currentUserProgramId);

    // call already online users
    Programs.find(
      {type: 'user', online: true, _id: {$ne: currentUserProgramId}}
    ).forEach((otherUserProgram) => {
      this.connect(currentUserProgramId, otherUserProgram._id);
    });
  }

  // listen to incoming requests to connect
  listen(receiver) {
    Meteor.subscribe('incoming-messages', receiver);
    // even though the subscription only gets incoming messages from the server
    // we need to filter with find b/c of local messages we add to the collection
    RTCSetupMessages.find({receiver: receiver}).observe({
      added: (message) => {
        console.log('message received');
        var peerConnection = this.peerConnections[message.sender];

        // the message is either an SDP or an ICE candidate
        if (message.description) {
          var description = JSON.parse(message.description);
          if (description.type === 'offer') {
            // if there is no peer connection with the sender create one
            // we are the answerer
            console.log('processing offer');
            if (!peerConnection) {
              peerConnection = this.makePeerConnection(message.receiver, message.sender);
              this.peerConnections[message.sender] = peerConnection;
            }
            peerConnection.setRemoteDescription(new RTCSessionDescription(description)).then(() => {

              // get a local stream, show it in a self-view and add it to be sent
              navigator.mediaDevices.getUserMedia(
                {audio: true, video: false}).then((stream) => {
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
              }).catch(this.logError);
            }).catch(this.logError);
          } else if (description.type == "answer") {
            console.log('processing answer');
            peerConnection.setRemoteDescription(new RTCSessionDescription(description)).catch(this.logError);
          } else {
            console.log("Unsupported SDP type.");
          }
        } else {
          console.log('adding ice candidate');
          var candidateData = JSON.parse(message.candidate);
          if (candidateData) {
            var candidate = new RTCIceCandidate(candidateData);
            peerConnection.addIceCandidate(candidate).catch(this.logError);
          }
        }
      }
    });
  }

  // references
  // from https://www.w3.org/TR/webrtc/#simple-peer-to-peer-example
  // and https://github.com/borismus/copresence-vr/blob/9dbe210f1d8e5cdba5bafaeacf0628de86293e2b/src/peer-connection-rtc.js#L55
  // and https://mdn.mozillademos.org/files/12363/WebRTC%20-%20Signaling%20Diagram.svg
  connect(sender, receiver) {
    var peerConnection = this.makePeerConnection(sender, receiver);
    this.peerConnections[receiver] = peerConnection;

    // get a local stream, show it in a self-view and add it to be sent
    navigator.mediaDevices.getUserMedia(
      {audio: true, video: false}).then((stream) => {
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
      }).catch(this.logError);
    }).catch(this.logError);
  }

  makePeerConnection(sender, receiver) {
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
      this.addPeerAudio(stream, receiver);
    };

    peerConnection.oniceconnectionstatechange = (event) => {
      console.log(`ice connection state: ${event.target.iceConnectionState}`);
    };

    return peerConnection;
  }

  addPeerAudio(stream, peerId) {
    // var audio = document.querySelector('audio');
    // audio.srcObject = stream;
    var peerAudioStream = this.audioContext.createMediaStreamSource(stream);

    var voiceActivityDetector = VAD({
      source: peerAudioStream,
      voice_stop: () => {
        Programs.update({_id: this.currentUserProgramId}, {$set: {
          isSpeaking: false
        }});
      },
      voice_start: () => {
        Programs.update({_id: this.currentUserProgramId}, {$set: {
          isSpeaking: true
        }});
      }
    });

    var panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.refDistance = 3;
    peerAudioStream.connect(panner);
    panner.connect(this.audioContext.destination);

    // for chrome we need to connect the remote stream
    // to a non web-audio output see
    // comment 102 https://bugs.chromium.org/p/chromium/issues/detail?id=121673
    var audio = document.querySelector('audio');
    audio.srcObject = stream;
    this.usersAudioRepresentation[peerId] = panner;
  }

  // analyser by the update/render function
  // updates each panner/listener position
  updateAudioPositions() {
    var self = this;
    var currentUserProgram = Programs.findOne(self.currentUserProgramId);
    var [currentX, currentY, currentZ] = currentUserProgram.position;
    Programs.find(
      {type: 'user', online: true, _id: {$ne: self.currentUserProgramId}}
    ).forEach((otherUserProgram) => {
      if (!_.has(self.usersAudioRepresentation, otherUserProgram._id)) {
        return;
      }
      var panner = self.usersAudioRepresentation[otherUserProgram._id];
      var [otherX, otherY, otherZ] = otherUserProgram.position;
      panner.setPosition(otherX, otherY, otherZ);
      self.audioContext.listener.setPosition(currentX, currentY, currentZ);
    });
  }

  logError(error) {
    console.log(error.name + ": " + error.message);
  }
};





//
