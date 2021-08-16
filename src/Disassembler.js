import { INSTRUCTION_SET } from "./InstructionSet.js"

export const Disassembler = {
    disassemble(opcode) {
        const instruction = INSTRUCTION_SET.find(
            (instruction) => (opcode & instruction.mask) === instruction.pattern
        )
        
        const args = instruction.arguments.map(
            (arg) => (opcode & arg.mask) >> arg.shift
        )

        return { instruction, args }
    },

    format(decodedInstruction) {
        const types = decodedInstruction.instruction.arguments.map(arg => arg.type)
        const rawArgs = decodedInstruction.args
        let formattedInstruction

        if (rawArgs.length > 0) {
            let args = []

            rawArgs.forEach((arg, i) => {
                switch (types[i]) {
                    case 'R':
                        args.push('V' + arg.toString(16))
                        break
                    case 'N':
                    case 'NN':
                        args.push('0x' + arg.toString(16).padStart(2, '0'))
                        break

                    case 'K':
                    case 'V0':
                    case 'I':
                    case '[I]':
                    case 'DT':
                    case 'B':
                    case 'ST':
                        args.push(types[i])
                        break
                    default:
                        // DW
                        args.push('0x' + arg.toString(16))
                }
            })
            formattedInstruction = decodedInstruction.instruction.name + ' ' + args.join(', ')
        } else {
            formattedInstruction = decodedInstruction.instruction.name
        }

        return formattedInstruction
    },

    dump(data) {
        const lines = data.map((code, i) => {
            const address = (i * 2).toString(16).padStart(6, '0')
            const opcode = code.toString(16).padStart(4, '0')
            const instruction = this.format(this.disassemble(code))

            return `${address}  ${opcode}  ${instruction}`
        })

        return lines.join('\n')
    },
}

