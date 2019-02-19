function queryURLParam(variable) {
    var query = window.location.search.substring(1)
    var vars = query.split("&")
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=")
        if (pair[0] == variable) { return pair[1] }
    }
    return
}

function httpRequest(url, callback, isBuffer) {

    var req = new XMLHttpRequest()

    req.onreadystatechange = function () {

        //  response ready
        if (this.readyState == 4 && this.status == 200) {
            callback(req.response)
        }
    }

    // send a search request to server
    req.open("GET", url, true)

    if (isBuffer) {
        req.responseType = 'arraybuffer'
    }

    req.send()

}

// load youtube video and voice tarck ##############################

// split youtube video id and upload id from browser url
let idList = queryURLParam('id').split('|')
// idList = [youtube video id, upload id]

// validate playback url
if (idList.length != 2) {
    alert('Invalid karaoke session. This session does not exist!')
    throw new Error('Invalid karaoke session. This session does not exist!')
}

let youtubeURL = 'https://www.youtube.com/embed/' + idList[0] + '?enablejsapi=1&html5=1&modestbranding=1&autohide=2'
let voiceTrackURL = '/voices/' + idList[0] + '/' + idList[1]

// Youtube player ################################################################################################################

// load youtube video to video player
document.getElementById('video').src = youtubeURL

let videoPlayer

// gets called when Youtube Player API is ready to use
window.onYouTubePlayerAPIReady = function () {
    console.log('Youtube Player Ready!')
    // create the global player from the specific iframe (#video)
    videoPlayer = new YT.Player('video')
}


// load voice track
let audioContext = new AudioContext()
let sourceNode
let gainNode

function updateVoiceGain() {
    try {
        let value = document.getElementById('volumeSlider').value
        gainNode.gain.value = value
    }
    catch (e) { }
}

httpRequest(voiceTrackURL, (audioData) => {

    audioContext.decodeAudioData(audioData, (audioBuffer) => {

        sourceNode = audioContext.createBufferSource()
        sourceNode.buffer = audioBuffer
        gainNode = audioContext.createGain()
        gainNode.gain.value = GAIN_PLAYBACK
        sourceNode.connect(gainNode)
        gainNode.connect(audioContext.destination)

    }, (e) => {
        console.error("Error with decoding audio data" + e.err)
    })

}, true)


function playStop() {

    // start replay
    if (videoPlayer.isPlaying != true) {

        videoPlayer.playVideo()
        videoPlayer.isPlaying = true
        document.getElementById('btnPlayStop').value = 'Stop'
        document.getElementById('btnPlayStop').style.background = 'red'

        // wait till youtube player starts playing
        let interval = setInterval(() => {

            if (videoPlayer.getCurrentTime() > 0) {

                // clear above waiting interval
                clearInterval(interval)

                // play voice track
                sourceNode.start()

                // startVisuaizer()
                console.log('Playback started!')
            }

        }, 100)
    }
    else {
        videoPlayer.isPlaying = false
        videoPlayer.stopVideo()
        sourceNode.stop()

        document.getElementById('btnPlayStop').value = 'Play'
        document.getElementById('btnPlayStop').style.background = '#4CBB17'

        console.log('Playback stopped!')
    }

}