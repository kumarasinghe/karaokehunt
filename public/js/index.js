var currentVideoID
var currentVideoTitle
var currentVideoImageURL

function deselectResults() {

    let resultElements = document.querySelectorAll('.result')

    for (let i = 0; i < resultElements.length; ++i) {

        let resultElem = resultElements[i]
        resultElem.style.opacity = 0.5

    }

}


// Load previous sessions ########################################################################################################


var sessionData = localStorage['sessionData']

if (sessionData != undefined && sessionData.length > 0) {

    sessionData = JSON.parse(sessionData)

    for (let i = 0; i < sessionData.length; ++i) {

        // add session to DOM
        let session = sessionData[i]

        let sessionElem = createSessionElemenet(
            session[0],     // session ID
            session[1],     // session title
            session[2]      // session image
        )

        document.getElementById('session-list').appendChild(sessionElem)

    }

    document.getElementById('session-container').style.display = 'block'

}
else {
    sessionData = []
}


// populate top tarcks and welcome messsage ######################################################################################

if (topTracks.length) {

    document.getElementById('welcomeMessage').style.opacity = 1

    // wait 2500ms
    setTimeout(() => {

        // fade out welcome message
        document.getElementById('welcomeMessage').style.opacity = 0

        // add top tracks
        setTimeout(() => {

            // clear result container
            document.getElementById('result-container').innerHTML = ''

            for (let i = 0; i < topTracks.length; ++i) {

                let track = topTracks[i]
                let trackID = track[0]
                let trackTitle = track[1]
                let trackImageURL = 'https://img.youtube.com/vi/' + trackID + '/mqdefault.jpg'

                document.getElementById('result-container').appendChild(
                    createResultElement(trackTitle, trackImageURL, trackID)
                )
            }

        }, 1000)


    }, 2500)

}



// Youtube player ################################################################################################################

let videoPlayer

// gets called when Youtube Player API is ready to use
window.onYouTubePlayerAPIReady = function () {
    console.log('Youtube Player Ready!')
    // create the global player from the specific iframe (#video)
    videoPlayer = new YT.Player('video')
}

function showPlayer() {
    document.getElementById('video').style.height = '360px'
    document.getElementById('result-container').style.height = '0'
}

function hidePlayer() {
    document.getElementById('video').style.height = '0'
    document.getElementById('result-container').style.height = '360px'
}


// search button ################################################################################################################

document.getElementById('btnSearch').onclick = function () {

    // clear existing results
    document.getElementById('result-container').innerHTML = ""

    // hide player if its shown
    if (videoPlayer.isPlaying) {
        videoPlayer.isPlaying = false
        videoPlayer.stopVideo()
        btnStartStop.value = "Record"
        // collapse video player
        hidePlayer()
        stopVoiceRecording()
    }

    // send a search request to server
    let requestURL = "/search?keywords=" + document.getElementById('txtSearch').value.replace(' ', '%20') + '%20karaoke'

    httpGETRequest(requestURL, (response) => {

        let results = JSON.parse(response)

        // add result to page
        for (let i = 0; i < results.length; ++i) {

            let rawResult = results[i]

            document.getElementById('result-container').appendChild(
                createResultElement(rawResult.title, rawResult.imageURL, rawResult.videoID)
            )

        }


    })


}

// record/stop button #############################################################################################################
var btnStartStop = document.getElementById("btnStartStop")
btnStartStop.onclick = () => {

    if (btnStartStop.disabled != true) {

        // stop recording
        if (videoPlayer.isPlaying) {
            videoPlayer.isPlaying = false
            videoPlayer.stopVideo()
            btnStartStop.value = "Record"
            // collapse video player
            hidePlayer()
            stopVoiceRecording()
        }
        // start recording
        else {
            videoPlayer.isPlaying = true
            videoPlayer.playVideo()
            btnStartStop.value = "Stop"
            // expand video player
            showPlayer()
            startVoiceRecording()
        }

    }

}


// voice recording ##############################################################################################################

let audioContext = new AudioContext()
let voiceAudioBuffer

let voiceRecorder = new Recorder(() => {
    console.log('Recorder ready!')
})


function startVoiceRecording() {

    // wait till youtube player starts playing
    let interval = setInterval(() => {

        if (videoPlayer.getCurrentTime() > 0) {

            // clear above waiting interval
            clearInterval(interval)

            // start recording
            voiceRecorder.start()

            startVisuaizer()

            console.log('Voice recording started!')
        }

    }, 100)

}


function stopVoiceRecording() {

    stopVisuaizer()

    voiceRecorder.stop((audioURL, audioBlob, audioChunks) => {

        console.log('Voice recording stopped!')

        // prepare for playback
        httpGETRequest(audioURL, (audioData) => {

            audioContext.decodeAudioData(audioData, (audioBuffer) => {
                voiceAudioBuffer = audioBuffer  // needed for replay
                // enable replay button
                document.getElementById('btnReplay').disabled = false
                document.getElementById('btnReplay').style.backgroundColor = "#4CBB17"

            }, (e) => {
                console.error("Error with decoding audio data" + e.err)
            })

        }, true)

        // upload voice track to server and generate a session for later playback
        var formData = new FormData()
        formData.append("videoID", currentVideoID)
        formData.append("voiceTrack", audioBlob)

        httpPOSTRequest('/upload', formData, (playbackID) => {

            // add karaoke session to local storage for later playback
            sessionData.push([playbackID, currentVideoTitle, currentVideoImageURL])
            localStorage['sessionData'] = JSON.stringify(sessionData)

            // show new session element to the user
            let sessionElem = createSessionElemenet(
                playbackID,             // session ID
                currentVideoTitle,      // session title
                currentVideoImageURL    // session image
            )

            document.getElementById('session-list').appendChild(sessionElem)
            document.getElementById('session-container').style.display = 'block'
        })

    })

}


// visualizer ####################################################################################################################

let visualizer = new Visualizer('visualizer')
let visualizerInterval
function startVisuaizer() {

    visualizerInterval = setInterval(() => {
        visualizer.paint(voiceRecorder.getFrequencyData().slice(5))
    }, 75)

}

function stopVisuaizer() {

    visualizer.paint([])
    clearInterval(visualizerInterval)

}

// replay button ##################################################################################################################

let sourceNode
let gainNode

function updateVoiceGain() {
    try {
        let value = document.getElementById('volumeSlider').value
        gainNode.gain.value = value
    }
    catch (e) { }
}

document.getElementById('btnReplay').onclick = () => {

    if (!document.getElementById("btnReplay").disabled) {

        // start replay
        if (videoPlayer.isPlaying != true) {
            videoPlayer.playVideo()
            videoPlayer.isPlaying = true
            document.getElementById('btnReplay').value = "Stop Replay"

            // expand player
            showPlayer()

            // disable record
            document.getElementById("btnStartStop").disabled = true
            document.getElementById('btnStartStop').style.backgroundColor = 'gainsboro'

            // wait till youtube player starts playing
            let intreval = setInterval(() => {

                if (videoPlayer.getCurrentTime() > 0) {

                    // clear above waiting interval
                    clearInterval(intreval)

                    // start playing voice
                    sourceNode = audioContext.createBufferSource()
                    sourceNode.buffer = voiceAudioBuffer
                    gainNode = audioContext.createGain()
                    gainNode.gain.value = GAIN_PLAYBACK
                    sourceNode.connect(gainNode)
                    gainNode.connect(audioContext.destination)
                    sourceNode.start()

                    console.log('Replaying...')

                }

            }, 100)

            // show volume slider
            document.getElementById('volumeSlider').style.display = "block"

        }
        //stop replay
        else {

            // collapse player
            hidePlayer()
            videoPlayer.stopVideo()
            videoPlayer.isPlaying = false
            sourceNode.stop()
            document.getElementById('btnReplay').value = "Replay"

            // enable record
            document.getElementById("btnStartStop").disabled = false
            document.getElementById('btnStartStop').style.backgroundColor = 'red'

            // hide volume slider
            document.getElementById('volumeSlider').style.display = "none"

        }

    }

}
