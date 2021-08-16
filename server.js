import express from 'express'
import path from 'path'
let __dirname = path.resolve()

const PORT = 3000;
const app = express();

app.use('/src', express.static(__dirname + '/src'));
app.use('/roms', express.static(__dirname + '/roms'));
app.use('/static', express.static(__dirname + '/static'));

app.get(['/', 'index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})



app.listen(PORT || 8080, () => {
    console.log(`Server Running on http://localhost:${PORT || 8080}`)
})
