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
        document.getElementById('control-container').style.display = 'block'
    }


    return resultElement

}


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