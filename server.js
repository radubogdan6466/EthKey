const express = require("express");
const bodyParser = require("body-parser");
const { Web3 } = require("web3");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static("public"));

wss.on("connection", (ws) => {
  console.log("Client connected");

  let web3;

  ws.on("message", async (message) => {
    const { input, providerUrl, currency, numberOfScrambles } =
      JSON.parse(message);

    if (providerUrl) {
      web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
    } else if (!web3) {
      ws.send(JSON.stringify({ error: "Provider URL not provided" }));
      return;
    }

    const scrambledKeys = [];
    const scrambleCount = numberOfScrambles || 20; // Default to 20 if not provided

    function scrambleString(str) {
      let array = str.split("");
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array.join("");
    }

    for (let i = 1; i <= scrambleCount; i++) {
      const scrambled = scrambleString(input);
      scrambledKeys.push(scrambled);

      try {
        const wallet = web3.eth.accounts.privateKeyToAccount("0x" + scrambled);
        const address = wallet.address;
        const balance = await web3.eth.getBalance(address);
        const balanceInEther = web3.utils.fromWei(balance, "ether");

        ws.send(
          JSON.stringify({
            key: scrambled,
            balance: balanceInEther,
            currency: currency,
          })
        );
      } catch (error) {
        ws.send(
          JSON.stringify({
            key: scrambled,
            error: "Invalid key or provider error",
          })
        );
      }
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
