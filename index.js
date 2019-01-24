const port = 80
const YouTubeAPIKey = 'AIzaSyCYjnfaygBncxrxYzD4F-hb4poKZHCxD8g'

const request = require('request')
const express = require('express')
const server = express()


server.use(express.static('public'))
server.listen(port)
console.log('Listening to port ' + port + '...')


server.get('/search', (req, res) => {

    let requestURL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + req.query.keywords.replace(/ /g, '%20') + '&type=video&videoEmbeddable=true&key=' + YouTubeAPIKey

    console.log(requestURL)

    request(requestURL, (err, youtubeRawResponse, youtubeResponseContent) => {

        if (err) {
            return console.log(err)
        }

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

        // send results to client
        res.json(results)

    });



})
