let socket;
let autoCheckInterval;
let autoCheckRunning = false;
let isWebSocketOpen = true;

// Funcție pentru validarea cheii Ethereum
function isValidEthereumKey(key) {
  // Cheile Ethereum valide sunt de 64 de caractere hexadecimale (fără prefixul 0x)
  return /^[0-9a-fA-F]{64}$/.test(key.trim());
}

function setupWebSocket() {
  socket = new WebSocket("wss://ethkey-o4ua.onrender.com");
  // Adresa WebSocket-ului serverului

  socket.onopen = () => {
    console.log("WebSocket connection established");
    isWebSocketOpen = true;
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Actualizează interfața utilizatorului cu fiecare rezultat primit
    const scrambleResults = document.getElementById("scrambleResults");
    if (scrambleResults) {
      const keyElement = document.createElement("div");
      keyElement.innerHTML = `<p>${data.key} - ${data.balance} ${data.currency}</p>`;
      scrambleResults.appendChild(keyElement);
    }

    // Verifică dacă balanța este mai mare de 0 și oprește verificarea automată dacă este cazul
    if (parseFloat(data.balance) > 0) {
      clearInterval(autoCheckInterval);
      autoCheckRunning = false;
      const stopButton = document.getElementById("stopAutoCheckButton");
      if (stopButton) stopButton.disabled = true; // Dezactivează butonul de stop
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    isWebSocketOpen = false;
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

async function generateAndCheck() {
  const inputStringElement = document.getElementById("inputString");
  const numberOfScramblesElement = document.getElementById("numberOfScrambles");
  const providerUrlElement = document.getElementById("providerUrl");
  const currencyElement = document.getElementById("currency");

  if (
    !inputStringElement ||
    !numberOfScramblesElement ||
    !providerUrlElement ||
    !currencyElement
  ) {
    console.error("One or more required elements are missing in the DOM");
    return;
  }

  const inputString = inputStringElement.value.trim();
  const numberOfScrambles = parseInt(numberOfScramblesElement.value, 10);
  const providerUrl = providerUrlElement.value;
  const currency = currencyElement.innerText;

  // Verifică dacă inputul este o cheie Ethereum validă
  if (!isValidEthereumKey(inputString)) {
    alert("Invalid private key.");
    return;
  }

  // Verifică dacă numărul de scramble-uri este valid
  if (isNaN(numberOfScrambles) || numberOfScrambles <= 0) {
    alert("Invalid number of scrambles.");
    return;
  }

  // Așteaptă până când WebSocket-ul este complet conectat
  if (!isWebSocketOpen) {
    console.log("WebSocket not open yet, retrying...");
    setTimeout(generateAndCheck, 1000); // Reîncepe încercarea după 1 secundă
    return;
  }

  // Trimite cheia privată, provider-ul, moneda și numărul de scramble-uri la server prin WebSocket
  socket.send(
    JSON.stringify({
      input: inputString,
      providerUrl: providerUrl,
      currency: currency,
      numberOfScrambles: numberOfScrambles,
    })
  );
}

function startAutoCheck() {
  if (autoCheckRunning) return;

  autoCheckRunning = true;
  const stopButton = document.getElementById("stopAutoCheckButton");
  if (stopButton) stopButton.disabled = false;

  autoCheckInterval = setInterval(async () => {
    await generateAndCheck();
  }, 20000); // Verifică la fiecare 20 secunde
}

function stopAutoCheck() {
  if (autoCheckRunning) {
    clearInterval(autoCheckInterval);
    autoCheckRunning = false;
    const stopButton = document.getElementById("stopAutoCheckButton");
    if (stopButton) stopButton.disabled = true;
  }
}

function updateProviderUrl() {
  const networkSelect = document.getElementById("network");
  const providerUrlElement = document.getElementById("providerUrl");
  const currencyElement = document.getElementById("currency");

  if (!networkSelect || !providerUrlElement || !currencyElement) {
    console.error("One or more required elements are missing in the DOM");
    return;
  }

  const providerUrl = networkSelect.value;
  const currencyName =
    networkSelect.options[networkSelect.selectedIndex].getAttribute(
      "data-name"
    );

  providerUrlElement.value = providerUrl;
  currencyElement.innerText = currencyName;
}

// Inițializează WebSocket când pagina se încarcă
window.onload = () => {
  setupWebSocket();
  updateProviderUrl(); // Setează provider-ul și moneda inițială
};
