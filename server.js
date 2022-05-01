var express = require("express");
var app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server)
const mongoose = require('mongoose');
var fs = require('fs');


let port = process.env.PORT || 4000
server.listen(port, () => {
    console.log("listening on " + port );
});

//mongodb+srv://rblpr:3EcKVStCUdtsxNV6@cluster0.a3qmv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
main().then(() => console.log("connected to db")).catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb+srv://rblpr:3EcKVStCUdtsxNV6@cluster0.a3qmv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority');
}

const playerSchema = new mongoose.Schema({
    name: String,
    turn: Number
});
const Player = mongoose.model('Player', playerSchema);

const inputSchema = new mongoose.Schema({
    player: String,
    text: String,
    image: Number,
});
const Input = mongoose.model("Input", inputSchema);

let turn = 0;


app.get("/", function(req, res) {
	res.sendFile(__dirname + "/public/index.html");
});

app.get("/game", function(req, res) {
	res.sendFile(__dirname + "/public/game.html");
});

app.get("/getState", async (req, res) => {
    const plays = await Player.find({});    
    const ins = await Input.find({});
    const current = await Player.findOne({turn});
    res.send({players: plays.map((doc)=>doc.name), inputs: ins.map((doc) => {return {player: doc.player, text: doc.text}}), turn: (current ? current.name : null)});
})

app.get("/getTurn", async (req, res) => {
    const current = await Player.findOne({turn});
    res.send(current);
})

app.get("/getImage", (req, res) => {
    let file = __dirname + "/public/images/ruggio.jpeg";
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.set('Content-Type', 'image/jpeg');
        s.pipe(res);
    });
    s.on('error', function () {
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
})



io.on('connection', (socket) => {
    // console.log('a user connected');
    socket.on('disconnect', () => {
        // console.log('user disconnected');
    });
    socket.on("new user", async (name) => {
        console.log("new user: ", name);
        const docs = await Player.find({});
        const player = new Player({name, turn: docs.length});
        await player.save();
        const players = await Player.find({});
        io.emit("new user", players.map((doc)=>doc.name));
    });
    socket.on("new input", async (desc) => {
        console.log("new input: ", desc);
        const input = new Input({player: desc.player, text: desc.text, image: 0});
        await input.save();
        const docs = await Input.find({});
        io.emit("new input", docs.map((doc) => {return {player: doc.player, text: doc.text}}));
    });

    socket.on("next turn", async () => {
        await Input.deleteMany({});

        const count = await Player.count({});
        turn = (turn + 1) % count;
        console.log("next turn!", turn);

        const doc = await Player.findOne({turn});
        io.emit("next turn", doc.name)
    })

    socket.on("new game", async () => {
        await Player.deleteMany({});
        await Input.deleteMany({});

        io.emit("new game");
    });

    socket.on("round over", async (winner, desc) => {
        io.emit("round over", winner, desc);

        // await Input.deleteMany({});

        // const count = await Player.count({});
        // turn = (turn + 1) % count;
        // console.log("next turn!", turn);

        // const doc = await Player.findOne({turn});
        // io.emit("next turn", doc.name)
    })
});


const images = ["ruggio.jpeg"];