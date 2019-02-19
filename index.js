const request = require('request')
const express = require('express')
const path = require('path')
const mkdirp = require('mkdirp')
const crypto = require("crypto")
const fs = require('fs')
const formidable = require('formidable')

const port = 8080
const YouTubeAPIKey = 'AIzaSyBKnHwOIrzzRTthmdubv5TKPqMVU94vIvc'

const server = express()

const PUBLIC_DIR = path.join(__dirname, '/public')
server.use(express.static(PUBLIC_DIR, { 'extensions': ['html'] }))
server.listen(port)
console.log('Listening to port ' + port + '...' + '\n')


server.get('/search', (req, res) => {

    let requestURL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + req.query.keywords.replace(/ /g, '%20') + '&maxResults=15&type=video&videoEmbeddable=true&key=' + YouTubeAPIKey

    console.log('Video search request:' + requestURL + '\n')

    request(requestURL, (err, youtubeRawResponse, youtubeResponseContent) => {

        if (err) {
            console.error('video search failed:' + requestURL + '\n' + err)
            res.sendStatus(404)
            res.send(err)
            return
        }

        // format results from youtube data api
        let json = JSON.parse(youtubeResponseContent)

        let results = []

        for (let i = 0; i < json.items.length; ++i) {

            item = json.items[i]

            results.push({
                'title': item.snippet.title,
                'videoID': item.id.videoId,
                'imageURL': item.snippet.thumbnails.medium.url
            })

        }

        console.log(results.length + ' results found for ' + requestURL + ':\n' + JSON.stringify(results) + '\n')

        // send results to client
        res.json(results)

    })

})


server.post('/upload', function (req, res) {

    var form = new formidable.IncomingForm()

    // analyze and extract incoming multi part data
    form.parse(req, (err, fields, files) => {

        if (err) {
            console.error(err.message)
            return
        }

        let videoID = fields.videoID
        let tmpUploadPath = files.voiceTrack.path
        let uploadDir = './public/voices/' + videoID
        let uplaodID = crypto.randomBytes(10).toString('hex')
        let uploadPath = uploadDir + '/' + uplaodID

        // create directory to store the video
        console.log('Creating voice track upload dirtectory:' + uploadPath + '\n')

        mkdirp(uploadDir, (err) => {

            if (err) {
                console.eror('Failed to create upload directory:' + uploadPath + '\n' + err)
                return
            }
            else {
                // copy uploaded file from tmpDir to uplaodDir
                console.log('Upload dirtectory created:' + uploadDir + '\n')
                console.log('Moving voice track to:' + uploadPath + '\n')

                fs.rename(tmpUploadPath, uploadPath, function (err) {
                    if (err) {
                        console.error('Error uploading voice track:' + uploadPath + '\n' + err + '\n')
                    }
                    else {
                        console.log('Voice track successfully uploaded:' + uploadPath + '\n')
                        let playbackID = videoID + '|' + uplaodID
                        res.send(playbackID)
                        console.log('Served playback ID to client:' + playbackID)
                        res.end()
                    }
                })
            }
        })

    })


})