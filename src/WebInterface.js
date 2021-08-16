import { CPUInterface } from './CPUInterface.js'
import { DISPLAY_WIDTH, DISPLAY_HEIGHT, COLOR } from './Constants.js'
import { keyMap } from './KeyMap.js'

export class WebInterface extends CPUInterface {
    constructor() {
        super()
        this.framebuffer = this._createFrameBuffer()
        this.screen = document.querySelector("canvas#display_canvas")
        this.multiplier = 15
        this.screen.width = DISPLAY_WIDTH * this.multiplier
        this.screen.height = DISPLAY_HEIGHT * this.multiplier
        this.context = this.screen.getContext('2d')
        this.context.fillStyle = 'black'
        this.context.fillRect(0, 0, this.screen.width, this.screen.height)

        this.keys = 0
        this.keyPressed = undefined

        this.soundEnabled = false

        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            this.audioContext = new (AudioContext || webkitAudioContext)()

            this.masterGain = new GainNode(this.audioContext)
            this.masterGain.gain.value = 0.3
            this.masterGain.connect(this.audioContext.destination)

            let soundEnabled = false
            let oscillator
            Object.defineProperties(this, {
                soundEnabled: {
                    get: function () { return soundEnabled },
                    set: function (value) {
                        value = Boolean(value)
                        if (value != soundEnabled) {
                            soundEnabled = value
                            if (soundEnabled) {
                                oscillator = new OscillatorNode(this.audioContext, {
                                    type: 'square'
                                })
                                oscillator.connect(this.masterGain)
                                oscillator.start()
                            }
                            else {
                                oscillator.stop()
                            }
                        }
                    }
                }
            })
        }
        const muteInstructions = document.createElement('div')
        muteInstructions.innerText = 'M = toggle sound '

        const muteIcon = document.createElement('span')
        muteIcon.classList.add("material-icons")
        muteIcon.innerText = 'music_note'

        muteInstructions.append(muteIcon)
        document
            .querySelector('.instructions')
            .appendChild(muteInstructions)

        let muted = false
        document.addEventListener('keydown', event => {
            if (event.key.toLowerCase() === 'm') {
                muted = !muted
                muteIcon.innerText = muted ? 'music_off' : 'music_note'
                this.masterGain.gain.value = muted ? 0 : 0.3
            }
        })

        document.addEventListener('keydown', event => {
            const keyIndex = keyMap.indexOf(event.key)

            if (keyIndex > -1) {
                this._setKeys(keyIndex)
            }
        })

        document.addEventListener('keyup', event => {
            this._resetKeys()
        })
    }


    _createFrameBuffer() {
        let framebuffer = []
        for (let i = 0; i < DISPLAY_HEIGHT; i++) {
            let row = []
            for (let j = 0; j < DISPLAY_WIDTH; j++) {
                row.push(0)
            }
            framebuffer.push(row)
        }
        return framebuffer
    }

    _setKeys(keyIndex) {
        let keyMask = 1 << keyIndex

        this.keys = this.keys | keyMask
        this.keyPressed = keyIndex
    }

    _resetKeys() {
        this.keys = 0
        this.keyPressed = undefined
    }

    clearDisplay() {
        this.framebuffer = this._createFrameBuffer()
        this.context.fillStyle = 'black'
        this.context.fillRect(0, 0, this.screen.width, this.screen.height)
    }

    waitKey() {
        const keyPressed = this.keyPressed
        this.keyPressed = undefined

        return keyPressed
    }

    getKeys() {
        return this.keys
    }

    drawPixel(x, y, value) {
        const collision = this.framebuffer[y][x] & value
        this.framebuffer[y][x] ^= value

        if (this.framebuffer[y][x]) {
            this.context.fillStyle = COLOR
        } else {
            this.context.fillStyle = 'black'
        }


        this.context.fillRect(
            x * this.multiplier,
            y * this.multiplier,
            this.multiplier,
            this.multiplier
        )
        return collision
    }

    enableSound() {
        this.soundEnabled = true
    }

    disableSound() {
        this.soundEnabled = false
    }
}