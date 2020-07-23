(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var selectRoom=document.getElementById('selectRoom')
var consultingRoom = document.getElementById('consultingRoom')
var inputRoomNo=document.getElementById('roomNo')
var localVideo = document.getElementById('localVideo')
var btnGoRoom = document.getElementById('btnGoRoom')

var roomNo
var localStream
var remoteStream
var rtcPeerConnection

var iceServers ={
   iceServers : [
            {
                url: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        
        ]
}


var streamConstrains= {video:true, audio:true}
var isCaller
var isJoined
var socket = io()

btnGoRoom.onclick=function(){
    if(inputRoomNo.value ===''){
        alert('please type room No')
    }else{
        roomNo=inputRoomNo.value
        socket.emit('create or join', roomNo)
        selectRoom.style="display:none"
        consultingRoom.style="display:block"
    }
}

//when server emited created
socket.on('created', room =>{
    console.log('room created')
    navigator.mediaDevices.getUserMedia(streamConstrains).then(
        stream => {
            localStream=stream
            localVideo.srcObject=stream
            isCaller=true
        }
    ).catch(error => console.log(error))
})

//when server emit joined
socket.on('joined', room => {
    console.log('room joined')
    navigator.mediaDevices.getUserMedia(streamConstrains).then(
        stream => {
            localStream=stream
            localVideo.srcObject=stream
            socket.emit('ready', room)//send massage to server

        }
    ).catch(error => console.log(error))
})

//when server emit ready
socket.on('ready', () => {
    // if(isCaller) {
        console.log('i am ready')
        rtcPeerConnection= new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.onaddstream=onAddStream
        rtcPeerConnection.addStream(localStream)
        rtcPeerConnection.createOffer(setLocalandOffer, () => {})
    // }
})

//where server emit offer
socket.on('offer', event => {
    // if(!isCaller && !isJoined){
        console.log('offer Received')
        rtcPeerConnection= new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.onaddstream=onAddStream
        rtcPeerConnection.addStream(localStream)

        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))

        rtcPeerConnection.createAnswer(setLocalandAnswer, () => {})

    // }
})

//when server emit answer 
socket.on('answer', event =>{
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

//when server emit candidate
socket.on('candidate', event => {
    //creates a candidate object
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    })
    //store candidate
    rtcPeerConnection.addIceCandidate(candidate)

})

//when user receives the other video and audio stream
function onAddStream(event){
   var remoteVideo = document.createElement('video')
   remoteVideo.srcObject=event.stream
   remoteVideo.autoplay=true
   consultingRoom.appendChild(remoteVideo)
    remoteStream=event.stream

//    remoteStream=event.stream
}

//these are the functions referanced before as listners as peer connection
//send a candidate massage to server
function onIceCandidate(event){
    if(event.candidate){
        socket.emit('candidate',{
            type : 'candidate',
            label : event.candidate.sdpMLineIndex,
            id : event.candidate.sdpMid,
            candidate : event.candidate.candidate,
            room : roomNo
        })
    }
}

//store offer and send message to server
function setLocalandOffer(sessionDescription){
    console.log('offer by caller :', isCaller)
        rtcPeerConnection.setLocalDescription(sessionDescription)
        socket.emit('offer', {
            type : 'offer',
            sdp : sessionDescription,
            room : roomNo
        })
  
}

//store answer and send message to server
function setLocalandAnswer(sessionDescription){
    // if(!isCaller){
        // isJoined=true
        rtcPeerConnection.setLocalDescription(sessionDescription)
        socket.emit('answer', {
            type : 'answer',
            sdp : sessionDescription,
            room : roomNo
        })        
    // }


}

},{}]},{},[1]);
