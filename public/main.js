
    RTCMultiConnection = require('rtcmulticonnection');
    adapter = require('webrtc-adapter');

    document.getElementById('open-room').onclick = function() {
        disableInputButtons();
        
        var roomid = document.getElementById('room-id').value;
        beforeOpenOrJoin(roomid, function() {
          connection.open(roomid, function() {
              afterOpenOrJoin();
          });
        });
    };
    
    document.getElementById('join-room').onclick = function() {
        disableInputButtons();
        
        var roomid = document.getElementById('room-id').value;
        beforeOpenOrJoin(roomid, function() {
          connection.join(roomid, function() {
              // join callback
              afterOpenOrJoin();
          });
        });
    };
    
    // ......................................................
    // ..................RTCMultiConnection Code.............
    // ......................................................
    
    var connection = new RTCMultiConnection();
    var RMCMediaTrack = {
        cameraStream: null,
        cameraTrack: null,
        screen: null
    };
    // by default, socket.io server is assumed to be deployed on your own URL
    // connection.socketURL = 'http://localhost:9001/';
    
    // comment-out below line if you do not have your own socket.io server
    connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
    
    connection.socketMessageEvent = 'video-screen-demo';
    
    connection.session = {
        audio: true,
        video: true
    };
    
    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    };
    
    // https://www.rtcmulticonnection.org/docs/iceServers/
    // use your own TURN-server here!
    connection.iceServers = [{
        'urls': [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun.l.google.com:19302?transport=udp',
        ]
    }];
    
    connection.videosContainer = document.getElementById('videos-container');
    connection.onstream = function(event) {
        console.log('streaming')
        var existing = document.getElementById(event.streamid);
        if(existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
    
        if(event.type === 'local' && event.stream.isVideo) {
          RMCMediaTrack.cameraStream = event.stream;
          RMCMediaTrack.cameraTrack =getTracks(event.stream, 'video')[0];
        }
    
        event.mediaElement.removeAttribute('src');
        event.mediaElement.removeAttribute('srcObject');
        event.mediaElement.muted = true;
        event.mediaElement.volume = 0;
    
        var video = document.createElement('video');
    
        try {
            video.setAttributeNode(document.createAttribute('autoplay'));
            video.setAttributeNode(document.createAttribute('playsinline'));
        } catch (e) {
            video.setAttribute('autoplay', true);
            video.setAttribute('playsinline', true);
        }
    
        if(event.type === 'local') {
          video.volume = 0;
          try {
              video.setAttributeNode(document.createAttribute('muted'));
          } catch (e) {
              video.setAttribute('muted', true);
          }
        }
        video.srcObject = event.stream;
    
        var width = parseInt(connection.videosContainer.clientWidth / 3) - 20;
        var mediaElement = getHTMLMediaElement(video, {
            title: event.userid,
            buttons: ['full-screen'],
            width: width,
            showOnMouseEnter: false
        });
    
        document.getElementById('videos-container').appendChild(video);
    
        setTimeout(function() {
            mediaElement.media.play();
        }, 3000);
    
        mediaElement.id = event.streamid;
    
        if(event.type === 'local') {
          RMCMediaTrack.selfVideo = mediaElement.media;
        }
    
        // to keep room-id in cache
        localStorage.setItem(connection.socketMessageEvent, connection.sessionid);
    };
    
    connection.onstreamended = function(event) {
        var mediaElement = document.getElementById(event.streamid);
        if (mediaElement) {
            mediaElement.parentNode.removeChild(mediaElement);
        }
    };
    
    connection.onMediaError = function(e) {
        if (e.message === 'Concurrent mic process limit.') {
            if (DetectRTC.audioInputDevices.length <= 1) {
                alert('Please select external microphone. Check github issue number 483.');
                return;
            }
    
            var secondaryMic = DetectRTC.audioInputDevices[1].deviceId;
            connection.mediaConstraints.audio = {
                deviceId: secondaryMic
            };
    
            connection.join(connection.sessionid);
        }
    };
    
    // ..................................
    // ALL below scripts are redundant!!!
    // ..................................
    function getTracks(stream, kind) {
        if (!stream || !stream.getTracks) {
            return [];
        }

        return stream.getTracks().filter(function(t) {
            return t.kind === (kind || 'audio');
        });
    }
    function disableInputButtons() {
        document.getElementById('room-id').onkeyup();
    
        document.getElementById('open-room').disabled = true;
        document.getElementById('join-room').disabled = true;
        document.getElementById('room-id').disabled = true;
    }
    
    // ......................................................
    // ......................Handling Room-ID................
    // ......................................................
    
    var roomid = '';
    if (localStorage.getItem(connection.socketMessageEvent)) {
        roomid = localStorage.getItem(connection.socketMessageEvent);
    } else {
        roomid = connection.token();
    }
    var txtRoomId = document.getElementById('room-id');
    txtRoomId.value = roomid;
    txtRoomId.onkeyup = txtRoomId.oninput = txtRoomId.onpaste = function() {
        localStorage.setItem(connection.socketMessageEvent, document.getElementById('room-id').value);
    };
    
    // detect 2G
    if(navigator.connection &&
       navigator.connection.type === 'cellular' &&
       navigator.connection.downlinkMax <= 0.115) {
      alert('2G is not supported. Please use a better internet service.');
    }
    
    // screen sharing codes goes here

    
    function beforeOpenOrJoin(roomid, callback) {
        connection.socketCustomEvent = roomid;
        callback();
    }
    
    function afterOpenOrJoin() {
        connection.socket.on(connection.socketCustomEvent, function(message) {
            if (message.userid === connection.userid) return; // ignore self messages
    
            if (message.justSharedMyScreen === true) {
                var video = document.getElementById(message.userid);
                if (video) {
                    // video.querySelector('video').srcObject = null;
                }
            }
    
            if (message.justStoppedMyScreen === true) {
                var video = document.getElementById(message.userid);
                if (video) {
                    video.querySelector('video').srcObject = null;
                }
            }
        });
    }
    
    var btnShareScreen = document.getElementById('share-screen');
    connection.onUserStatusChanged = function() {
        btnShareScreen.disabled = connection.getAllParticipants().length <= 0;
    };
    
    btnShareScreen.onclick = function() {
        this.disabled = true;
    
        getScreenStream(function(screen) {
            var isLiveSession = connection.getAllParticipants().length > 0;
            if (isLiveSession) {
                replaceTrack(RMCMediaTrack.screen);
            }
    
            // now remove old video track from "attachStreams" array
            // so that newcomers can see screen as well
            connection.attachStreams.forEach(function(stream) {
                getTracks(stream, 'video').forEach(function(track) {
                    stream.removeTrack(track);
                });
    
                // now add screen track into that stream object
                stream.addTrack(RMCMediaTrack.screen);
            });
        });
    };
    var screen_constraints ={
        screen:true,
        oneway: true
    }
    function screenHelper(callback) {
      if(navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia(screen_constraints).then(stream => {
                callback(stream);
            }, error => {
                alert('Please make sure to use Edge 17 or higher.');
            });
        }
        else if(navigator.getDisplayMedia) {
            navigator.getDisplayMedia(screen_constraints).then(stream => {
                callback(stream);
            }, error => {
                alert('Please make sure to use Edge 17 or higher.');
            });
        }
        else {
            alert('getDisplayMedia API is not available in this browser.');
        }
    }
    
    function getScreenStream(callback) {
          screenHelper(function(screen) {
                RMCMediaTrack.screen = getTracks(screen, 'video')[0];
    
                RMCMediaTrack.selfVideo.srcObject = screen;
    
                // in case if onedned event does not fire
                (function looper() {
                    // readyState can be "live" or "ended"
                    if (RMCMediaTrack.screen.readyState === 'ended') {
                        RMCMediaTrack.screen.onended();
                        return;
                    }
                    setTimeout(looper, 1000);
                })();
    
                var firedOnce = false;
                RMCMediaTrack.screen.onended = RMCMediaTrack.screen.onmute = RMCMediaTrack.screen.oninactive = function() {
                    if (firedOnce) return;
                    firedOnce = true;
    
                    if (getTracks(RMCMediaTrack.cameraStream, 'video')[0].readyState) {
                        getTracks(RMCMediaTrack.cameraStream, 'video').forEach(function(track) {
                            RMCMediaTrack.cameraStream.removeTrack(track);
                        });
                        RMCMediaTrack.cameraStream.addTrack(RMCMediaTrack.cameraTrack);
                    }
    
                    RMCMediaTrack.selfVideo.srcObject = RMCMediaTrack.cameraStream;
    
                    connection.socket && connection.socket.emit(connection.socketCustomEvent, {
                        justStoppedMyScreen: true,
                        userid: connection.userid
                    });
    
                    // share camera again
                    replaceTrack(RMCMediaTrack.cameraTrack);
    
                    // now remove old screen from "attachStreams" array
                    connection.attachStreams = [RMCMediaTrack.cameraStream];
    
                    // so that user can share again
                    btnShareScreen.disabled = false;
                };
    
                connection.socket && connection.socket.emit(connection.socketCustomEvent, {
                    justSharedMyScreen: true,
                    userid: connection.userid
                });
    
                callback(screen);
            });
    }
    
    function replaceTrack(videoTrack) {
        if (!videoTrack) return;
        if (videoTrack.readyState === 'ended') {
            alert('Can not replace an "ended" track. track.readyState: ' + videoTrack.readyState);
            return;
        }
        connection.getAllParticipants().forEach(function(pid) {
            var peer = connection.peers[pid].peer;
            if (!peer.getSenders) return;
    
            var trackToReplace = videoTrack;
    
            peer.getSenders().forEach(function(sender) {
                if (!sender || !sender.track) return;
    
                if (sender.track.kind === 'video' && trackToReplace) {
                    sender.replaceTrack(trackToReplace);
                    trackToReplace = null;
                }
            });
        });
    }
    