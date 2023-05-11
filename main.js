import './style.css';
import firebase from 'firebase/app';
import 'firebase/firestore';

let firestore;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

const webcamButton = document.querySelector('#webcamButton');
const webcamVideo = document.querySelector('#webcamVideo');
const callButton = document.querySelector('#callButton');
const callInput = document.querySelector('#callInput');
const answerButton = document.querySelector('#answerButton');
const remoteVideo = document.querySelector('#remoteVideo');
const hangupButton = document.querySelector('#hangupButton');

// 0 add config
configinput.addEventListener('click', async () => {
  var input = document.getElementById('configfile')
  let file = input.files[0];
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function () {
    const firebaseConfig = JSON.parse(reader.result)
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firestore = firebase.firestore();
    document.querySelector('.room').style.display = 'block'
    document.querySelector('.config').style.display = 'none'
  };
  reader.onerror = function () {
    console.log(reader.error);
  };
})

// 1 start devices
webcamButton.addEventListener('click', async () => {
  const constraints = {
    'audio': {
      'echoCancellation': true,
      'noiseSuppression': true
    },
    'video': true
  }
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  remoteStream = new MediaStream();
  for (let track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
  pc.addEventListener('track', (event) => {
    for (let track of event.streams[0].getTracks()) {
      remoteStream.addTrack(track);
    }
  })
  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
  callButton.disabled = false;
  answerButton.disabled = false;
})

// 2 Create an offer
callButton.addEventListener('click', async () => {
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');
  callInput.value = callDoc.id;
  pc.addEventListener('icecandidate', (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  })
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };
  await callDoc.set({ offer });
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });
  answerCandidates.onSnapshot((snapshot) => {
    for (let change of snapshot.docChanges()){
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    }
  });
  hangupButton.disabled = false;
})

// 3 Answer
answerButton.addEventListener('click', async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');
  pc.addEventListener('icecandidate', (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  })
  const callData = (await callDoc.get()).data();
  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);
  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };
  await callDoc.update({ answer });
  offerCandidates.onSnapshot((snapshot) => {
    for (let change of snapshot.docChanges()){
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    }
  });
})

// 4
hangupButton.addEventListener('click', async () => {
  for (let track of localStream.getTracks()) {
    track.stop();
  }
  for (let track of remoteStream.getTracks()) {
    track.stop();
  }
})