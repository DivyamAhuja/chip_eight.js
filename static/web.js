import { CPU } from '../src/CPU.js'
import { RomBuffer } from '../src/RomBuffer.js'
import { WebInterface } from '../src/WebInterface.js'
import { keyMap } from '../src/KeyMap.js'
import { romList } from './RomList.js'

const cpuInterface = new WebInterface()
const cpu = new CPU(cpuInterface)

globalThis.cpu = cpu
globalThis.RomBuffer = RomBuffer

let timer = 0
let paused = false

function cycle() {
    timer++
    if (timer % 5 == 0) {
        cpu.tick()
        timer = 0
    }

    if (!cpu.halted && !paused) {
        cpu.step()
    }
    setTimeout(cycle, 3)
}

async function loadRom(romName) {
    const rom = romName
    const response = await fetch(`./roms/${rom}`)
    const arrayBuffer = await response.arrayBuffer()
    const uint8View = new Uint8Array(arrayBuffer)
    const romBuffer = new RomBuffer(uint8View)
    
    cpu.interface.clearDisplay()
    cpu.interface.disableSound()
    cpu.load(romBuffer)
}

const keyLayout = document.getElementById("key_layout")
let temp = document.createElement('select')
romList.forEach((value, index)=>{
    let gameOption = document.createElement('option')
    gameOption.value = value
    gameOption.text = value
    temp.add(gameOption)
})

keyLayout.appendChild(temp)
keyLayout.appendChild(document.createElement('br'))
keyMap.forEach((key, index) => {
    temp = document.createElement('button')
    temp.classList.add('key_button')
    temp.innerText = key.toUpperCase()
    keyLayout.appendChild(temp)
    let i = index
    temp.onmousedown = (ev) => {
        cpu.interface._setKeys(i)
    }
    temp.ontouchstart = (ev) => {
        cpu.interface._setKeys(i)
    }
    temp.onmouseup = (ev) => {
        cpu.interface._resetKeys()
    }

    temp.ontouchend = (ev) => {
        cpu.interface._resetKeys()
    }

    if( index % 4 == 3) {
        keyLayout.appendChild(document.createElement('br'))
    }
})

const playPause = document.createElement('div')
playPause.innerText = 'P = play/pause '

const playPauseIcon = document.createElement('span')
playPauseIcon.classList.add("material-icons")
playPauseIcon.innerText = 'play_arrow'
playPause.append(playPauseIcon)

document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'p') {
        paused = !paused
        playPauseIcon.innerText = paused ?  'pause' : 'play_arrow'
    }
})



document.querySelector('.instructions').appendChild(playPause)
document.querySelector('select').addEventListener('change', (ev) => loadRom(ev.target.value))
loadRom('PONG')

cycle()


