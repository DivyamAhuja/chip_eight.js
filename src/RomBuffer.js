export class RomBuffer {
    constructor(fileContents) {
        this.data = Array.from(fileContents)
    }

    dump() {
        let lines = []

        for (let i = 0; i < this.data.length; i += 8) {
            const address = (i).toString(16).padStart(6, '0')
            const block = this.data.slice(i, i + 8)
            const hexString = block.map(value => value.toString(16).padStart(2, '0')).join(' ')

            lines.push(`${address} ${hexString}`)
        }

        return lines.join('\n')
    }
}
