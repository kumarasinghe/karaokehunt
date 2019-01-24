class Visualizer {

    constructor(canvasID) {
        this.canvas = document.getElementById(canvasID)
        this.ctx = this.canvas.getContext('2d')
    }

    paint(freequencyData) {

        // clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let barWidth = this.canvas.width / freequencyData.length

        // draw bands
        for (let i = 0; i < freequencyData.length; ++i) {

            let barHeight = freequencyData[i] * 5

            let r = 180
            let g = 255 - freequencyData[i] * 2
            let b = barHeight *15
            this.ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')'

            this.ctx.fillRect(i * barWidth, 0, barWidth, barHeight);
        }

    }

}