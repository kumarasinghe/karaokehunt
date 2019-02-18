var currentVideoID

function createResultElement(title, thumbUrl, youtubeVideoId) {


    let resultElement = document.createElement('img')

    resultElement.src = thumbUrl
    resultElement.title = title

    resultElement.setAttribute('class', 'result')

    resultElement.onclick = () => {

        currentVideoID = youtubeVideoId
        currentVideoTitle = title
        currentVideoImageURL = thumbUrl

        deselectResults()
        resultElement.style.opacity = 1

        // set video player url
        document.getElementById('video').src = 'https://www.youtube.com/embed/' + youtubeVideoId + '?enablejsapi=1&html5=1&modestbranding=1&autohide=2'

        // enable record button
        document.getElementById('btnStartStop').disabled = false
        document.getElementById('btnStartStop').style.backgroundColor = 'red'

        // disable replay  button
        document.getElementById('btnReplay').disabled = true
        document.getElementById('btnReplay').style.backgroundColor = 'gainsboro'

        // show control box
        document.getElementById('control-container').style.visibility = 'visible'
    }


    return resultElement

}

function deselectResults() {

    let resultElements = document.querySelectorAll('.result')

    for (let i = 0; i < resultElements.length; ++i) {

        let resultElem = resultElements[i]
        resultElem.style.opacity = 0.5

    }

}


function httpGETRequest(url, callback, isBuffer) {

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


function httpPOSTRequest(url, formData, callback) {


    var xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)

    xhr.onreadystatechange = () => {

        if (xhr.readyState == XMLHttpRequest.DONE) {
            callback(xhr.response)
        }
    }

    xhr.send(formData)

}


// Load previous sessions ########################################################################################################

function createSessionElemenet(sessionID, sessionTitle, sessionImageURL) {

    let titleElem = document.createElement('span')
    titleElem.innerHTML = sessionTitle

    let imgElem = document.createElement('img')
    imgElem.src = sessionImageURL

    let sessionElem = document.createElement('li')
    sessionElem.appendChild(imgElem)
    sessionElem.appendChild(titleElem)

    sessionElem.onclick = () => {
        window.location.href = '/playback?id=' + sessionID
    }

    return sessionElem

}


var sessionData = localStorage['sessionData']

if (sessionData != undefined) {

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

    document.getElementById('session-container').style.visibility = 'visible'

}
else {
    sessionData = []
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


let audioContext = new AudioContext()
let voiceAudioBuffer

function stopVoiceRecording() {

    stopVisuaizer()
    voiceRecorder.stop((audioURL, audioBlob, audioChunks) => {

        console.log('Voice recording stopped!')


        // upload voice track to server and generate a session for playback
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
            document.getElementById('session-container').style.visibility = 'visible'
        })

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

// Replay button ##################################################################################################################

let sourceNode

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
                    let gainNode = audioContext.createGain()
                    gainNode.gain.value = GAIN_PLAYBACK
                    sourceNode.connect(gainNode)
                    gainNode.connect(audioContext.destination)
                    sourceNode.start()

                    console.log('Replaying...')

                }

            }, 100)

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

        }

    }

}
