class Recorder {

    constructor(readyCallback) {

        this.readyCallback = readyCallback
        this.recordingDeviceId = 'default'
        this.audioChunks = []

        // visualizer
        this.audioContext = new AudioContext()
        this.analyserNode = this.audioContext.createAnalyser()
        this.analyserFrequencyCount = 128
        this.analyserNode.fftSize = this.analyserFrequencyCount
        this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount)

        this.setupRecorder()


    }

    setupRecorder() {

        let deviceConstraints = {
            deviceId: this.recordingDeviceId,
            autoGainControl: false,
            channelCount: { ideal: 2, min: 1 },
            echoCancellation: false,
            noiseSuppression: true,
            sampleRate: 48000,
            sampleSize: 24,
            volume: 1
        }

        // request mic access
        navigator.mediaDevices.getUserMedia({ audio: deviceConstraints })
            .then(stream => {

                // for visualization purposes
                let micNode = this.audioContext.createMediaStreamSource(stream)
                micNode.connect(this.analyserNode)

                // init media recorder
                this.mediaRecorder = new MediaRecorder(stream)

                this.mediaRecorder.addEventListener("dataavailable", event => {
                    this.audioChunks.push(event.data);
                })

                this.mediaRecorder.addEventListener("stop", () => {
                    this.audioBlob = new Blob(this.audioChunks)

                    if (this.recordCompleteCallback) {
                        this.audioUrl = URL.createObjectURL(this.audioBlob)
                        this.recordCompleteCallback(this.audioUrl)
                    }

                })

                if (this.readyCallback) {
                    this.readyCallback()
                }
            })
    }

    start() {
        this.audioContext.resume()
        this.audioChunks = []
        this.mediaRecorder.start()
    }

    stop(recordCompleteCallBack) {
        this.recordCompleteCallback = recordCompleteCallBack
        this.mediaRecorder.stop()
    }

    getFrequencyData() {
        this.analyserNode.getByteFrequencyData(this.frequencyData)
        return this.frequencyData
    }

    getAudioInputDevices(devicesReceivedCallback) {

        navigator.mediaDevices.enumerateDevices()
            .then((deviceInfoArr) => {

                let audioInputDevices = []

                for (var i = 0; i < deviceInfoArr.length; ++i) {

                    var deviceInfo = deviceInfoArr[i]
                    console.log(deviceInfo)
                    if (deviceInfo.kind === 'audioinput') {
                        audioInputDevices.push(deviceInfo)
                    }
                }

                devicesReceivedCallback(audioInputDevices)

            })
            .catch(() => {
                console.error('An error occured while getting audio devices')
            })

    }

    setRecordingDevice(deviceId){
        this.recordingDeviceId = deviceId
    }

}