function createResultElement(title, thumbUrl, youtubeVideoId) {

    let resultElem = document.createElement('div')
    let titleElement = document.createElement('span')
    let thumbElement = document.createElement('img')

    titleElement.innerHTML = title
    thumbElement.src = thumbUrl
    resultElem.setAttribute('class', 'result')

    resultElem.onclick = () => {

        // set video player url
        document.getElementById('video').src = 'https://www.youtube.com/embed/' + youtubeVideoId + '?enablejsapi=1&html5=1&modestbranding=1&autohide=2'

        // enable record button
        document.getElementById('btnStartStop').disabled = false
        document.getElementById('btnStartStop').style.backgroundColor = 'red'

        // disable replay  button
        document.getElementById('btnReplay').disabled = true
        document.getElementById('btnReplay').style.backgroundColor = 'gainsboro'

    }

    resultElem.appendChild(titleElement)
    resultElem.appendChild(document.createElement('br'))
    resultElem.appendChild(thumbElement)
    return resultElem

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


// Youtube player ################################################################################################################

let videoPlayer

// gets called when Youtube Player API is ready to use
window.onYouTubePlayerAPIReady = function() {
    console.log('Youtube Player Ready!')
    // create the global player from the specific iframe (#video)
    videoPlayer = new YT.Player('video')
}

function showPlayer() {
    document.getElementById('video').style.height = '65%'
    document.getElementById('result-container').style.height = '0'
    document.getElementById('video').style.borderTop = '4px solid cadetblue'
    document.getElementById('video').style.borderBottom = '4px solid cadetblue'

}

function hidePlayer() {
    document.getElementById('video').style.height = '0'
    document.getElementById('result-container').style.height = '65%'
    document.getElementById('video').style.borderTop = 'none'
    document.getElementById('video').style.borderBottom = 'none'
}


// search button ################################################################################################################

document.getElementById('btnSearch').onclick = function () {

    // clear existing results
    document.getElementById('result-container').innerHTML = ""

    // send a search request to server
    let requestURL = "/search?keywords=" + document.getElementById('txtSearch').value.replace(' ', '%20') + '%20karaoke'

    httpRequest(requestURL, (response) => {

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


let audioContext = new AudioContext();
let voiceAudioBuffer

function stopVoiceRecording() {

    stopVisuaizer()
    voiceRecorder.stop((audioURL) => {

        console.log('Voice recording stopped!')


        httpRequest(audioURL, (audioData) => {

            audioContext.decodeAudioData(audioData, (audioBuffer) => {
                voiceAudioBuffer = audioBuffer  // needed for replay
                // enable replay button
                document.getElementById('btnReplay').disabled = false
                document.getElementById('btnReplay').style.backgroundColor = "#4CBB17"

            }, (e) => {
                console.log("Error with decoding audio data" + e.err)
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
        if (videoPlayer.isPlaying == false) {
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
                    gainNode.gain.value = 8
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
