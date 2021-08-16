import { Disassembler } from './Disassembler.js'
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from './Constants.js'
import { FONT_SET } from './FontSet.js'

export class CPU {
    constructor(cpuInterface) {
        this.interface = cpuInterface
        this.reset()
    }
    
    reset() {
        this.memory = new Uint8Array(4096)
        this.registers = new Uint8Array(16)
        this.stack = new Uint16Array(16)
        this.ST = 0
        this.DT = 0
        this.I = 0
        this.SP = -1
        this.PC = 0x200
        this.halted = true
        this.soundEnabled = false
    }

    load(romBuffer) {
        this.reset()
        for (let i = 0; i < FONT_SET.length; i++) {
            this.memory[i] = FONT_SET[i]
        }
        const romData = romBuffer.data
        let memoryStart = 0x200
        
        for(let i = 0; i < romData.length; i++) {
            this.memory[memoryStart + i] = romData[i]
        }
        this.halted = false
    }

    tick() {
        if (this.DT > 0) {
            this.DT--
        }

        if (this.ST > 0) {
            this.ST--
        } else {
            if (this.soundEnabled) {
                this.interface.disableSound()
                this.soundEnabled = false
            }
        }
    }

    halt() {
        this.halted = true
    }

    step() {
        if (this.halted) {
            throw new Error(
                'ERROR: Chip-8 has been halted.'
            )
        }

        const opcode = this._fetch()
        const instruction = this._decode(opcode)
        this._execute(instruction)
        
    }

    _nextInstruction() {
        this.PC += 2
    }

    _skipInstruction() {
        this.PC += 4
    }

    _fetch() {
        if (this.PC > 4094) {
            this.halted = true;
            throw new Error("Memory out of bounds.");
        }
        return (this.memory[this.PC] << 8) | (this.memory[this.PC + 1] << 0);
    }

    _decode(opcode) {
        return Disassembler.disassemble(opcode);
    }

    _execute(instruction) {
        const id = instruction.instruction.id;
        const args = instruction.args;

        switch (id) {
            case 'CLS':
                this.interface.clearDisplay()
                this._nextInstruction()
                break
            case 'RET':
                if (this.SP === -1) {
                    this.halted = true
                    throw new Error('Stack Underflow.')
                }
                this.PC = this.stack[this.SP]
                this.SP--
                break
            case 'JP_ADDR':
                this.PC = args[0]
                break
            case 'CALL_ADDR':
                if (this.SP === 15) {
                    this.halted = true
                    throw new Error('Stack Overflow')
                }
                this.SP++
                this.stack[this.SP] = this.PC + 2
                this.PC = args[0]
                break
            case 'SE_VX_NN':
                if (this.registers[args[0]] === args[1]) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'SNE_VX_NN':
                if (this.registers[args[0]] !== args[1]) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'SE_VX_VY':
                if (this.registers[args[0]] === this.registers[args[1]]) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'LD_VX_NN':
                this.registers[args[0]] = args[1]
                this._nextInstruction()
                break
            case 'ADD_VX_NN':
                let v = this.registers[args[0]] + args[1]
                if (v > 255) {
                    v -= 256
                }
                this.registers[args[0]] = v
                this._nextInstruction()
                break
            case 'LD_VX_VY':
                this.registers[args[0]] = this.registers[args[1]]
                this._nextInstruction()
                break
            case 'OR_VX_VY':
                this.registers[args[0]] |= this.registers[args[1]]
                this._nextInstruction()
                break
            case 'AND_VX_VY':
                this.registers[args[0]] &= this.registers[args[1]]
                this._nextInstruction()
                break
            case 'XOR_VX_VY':
                this.registers[args[0]] ^= this.registers[args[1]]
                this._nextInstruction()
                break
            case 'ADD_VX_VY':
                this.registers[0xF] = this.registers[args[0]] + this.registers[args[1]] > 0xFF ? 1 : 0
                this.registers[args[0]] += this.registers[args[1]]
                this._nextInstruction()
                break
            case 'SUB_VX_VY':
                this.registers[0xF] = this.registers[args[0]] > this.registers[args[1]] ? 1 : 0
                this.registers[args[0]] -= this.registers[args[1]]
                this._nextInstruction()
                break
            case 'SHR_VX_VY':
                this.registers[0xF] = this.registers[args[0]] & 1
                this.registers[args[0]] >>= 1
                this._nextInstruction()
                break
            case 'SUBN_VX_VY':
                this.registers[0xF] = this.registers[args[1]] > this.registers[args[0]] ? 1 : 0
                this.registers[args[0]] = this.registers[args[1]] - this.registers[args[0]]
                this._nextInstruction()
                break
            case 'SHL_VX_VY':
                this.registers[0xF] = this.registers[args[0]] >> 7
                this.registers[args[0]] <<= 1
                this._nextInstruction()
                break
            case 'SNE_VX_VY':
                if (this.registers[args[0]] !== this.registers[args[1]]) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'LD_I_ADDR':
                this.I = args[1]
                this._nextInstruction()
                break
            case 'JP_V0_ADDR':
                this.PC = this.registers[0] + args[1]
                break
            case 'RND_VX_NN':
                let r = Math.floor(Math.random() * 0xff)
                this.registers[args[0]] = r & args[1]
                this._nextInstruction()
                break
            case 'DRW_VX_VY_N':
                if (this.I > 4095 - args[2]) {
                    this.halted = true
                    throw new Error('Memory out of bounds.')
                }

                this.registers[0xF] = 0
                
                for(let i = 0; i < args[2]; i++) {
                    let line = this.memory[this.I + i]
                    for(let position = 0; position < 8; position++) {
                        let value = line & (1 << (7 - position)) ? 1 : 0

                        let x = (this.registers[args[0]] + position) % DISPLAY_WIDTH
                        let y = (this.registers[args[1]] + i) % DISPLAY_HEIGHT
                        
                        if (this.interface.drawPixel(x, y, value)) {
                            this.registers[0xf] = 1
                        }
                    }
                }
                this._nextInstruction()
                break
            case 'SKP_VX':
                if (this.interface.getKeys() & (1 << this.registers[args[0]])) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'SKNP_VX':
                if (!(this.interface.getKeys() & (1 << this.registers[args[0]]))) {
                    this._skipInstruction()
                }
                else {
                    this._nextInstruction()
                }
                break
            case 'LD_VX_DT':
                this.registers[args[0]] = this.DT
                this._nextInstruction()
                break
            case 'LD_VX_N':
                const key = this.interface.waitKey()
                if (!key) {
                    return
                }
                this.registers[args[0]] = key
                this._nextInstruction()
                break
            case 'LD_DT_VX':
                this.DT = this.registers[args[1]]
                this._nextInstruction()
                break
            case 'LD_ST_VX':
                this.ST = this.registers[args[1]]
                if (this.ST > 0) {
                    this.soundEnabled = true
                    this.interface.enableSound()
                }
                this._nextInstruction()
                break
            case 'ADD_I_VX':
                this.I = this.I + this.registers[args[1]]
                this._nextInstruction()
                break
            case 'LD_F_VX':
                if (this.registers[args[1]] > 0xF) {
                    this.halted = true
                    throw new Error('Invalid Digit.')
                }
                this.I = this.registers[args[1]] * 5
                this._nextInstruction()
                break
            case 'LD_B_VX':
                if (this.I > 4093) {
                    this.halted = true
                    throw new Error('Memory out of bounds.')
                }
                let x = this.registers[args[1]]
                const a = Math.floor(x / 100)
                x -= a * 100
                const b = Math.floor(x / 10)
                x -= b * 10
                const c = Math.floor(x)

                this.memory[this.I + 0] = a
                this.memory[this.I + 1] = b
                this.memory[this.I + 2] = c

                this._nextInstruction()
                break
            case 'LD_I_VX':
                if (this.I > 4095 - args[1]) {
                  this.halted = true
                  throw new Error('Memory out of bounds.')
                }
                for (let i = 0; i <= args[1]; i++) {
                  this.memory[this.I + i] = this.registers[i]
                }
                this._nextInstruction()
                break
            case 'LD_VX_I':
                if (this.I > 4095 - args[0]) {
                    this.halted = true
                    throw new Error('Memory out of bounds.')
                }

                for(let i = 0; i <= args[0]; i++) {
                    this.registers[i] = this.memory[this.I + i]
                }

                this._nextInstruction()
                break
            default:
                this.halted = true
                throw new Error('Illegal instruction.' + instruction.id + ' ' + instruction.pattern)
        }
    }
}
