let socket;
let autoCheckInterval;
let autoCheckRunning = false;
let isWebSocketOpen = true;
let addressesFound = 0; // Variabilă globală pentru a ține numărul de adrese găsite

// Funcție pentru validarea cheii Ethereum
function isValidEthereumKey(key) {
  // Cheile Ethereum valide sunt de 64 de caractere hexadecimale (fără prefixul 0x)
  return /^[0-9a-fA-F]{64}$/.test(key.trim());
}

function setupWebSocket() {
  socket = new WebSocket("wss://ethkey-o4ua.onrender.com"); // Adresa WebSocket-ului serverului

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

      // Verifică dacă balanța este mai mare de 0 pentru a aplica stilul corespunzător
      if (parseFloat(data.balance) > 0) {
        keyElement.innerHTML = `<p style="color: green; font-size: 18px">${data.key} - ${data.balance} ${data.currency}</p>`;
        addressesFound++; // Incrementăm numărul de adrese găsite
        updateFoundAddressesCount(); // Actualizăm numărul afișat
      } else {
        keyElement.innerHTML = `<p>${data.key} - ${data.balance} ${data.currency}</p>`;
      }

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
  const customRpcContainer = document.getElementById("customRpcContainer");
  const customRpcUrl = document.getElementById("customRpcUrl");

  if (!networkSelect || !providerUrlElement || !currencyElement) {
    console.error("One or more required elements are missing in the DOM");
    return;
  }

  const selectedOption = networkSelect.value;

  if (selectedOption === "custom") {
    customRpcContainer.style.display = "block"; // Afișează câmpul pentru URL-ul personalizat
    providerUrlElement.value = customRpcUrl.value; // Folosește URL-ul personalizat introdus
    currencyElement.innerText = "CUSTOM"; // Setează textul "CUSTOM" în loc de numele monedei
  } else {
    customRpcContainer.style.display = "none"; // Ascunde câmpul pentru URL-ul personalizat
    providerUrlElement.value = selectedOption; // Folosește URL-ul RPC-ului selectat
    const currencyName =
      networkSelect.options[networkSelect.selectedIndex].getAttribute(
        "data-name"
      );
    currencyElement.innerText = currencyName; // Setează numele monedei din opțiunea selectată
  }
}

// Actualizează URL-ul RPC în timp real pe măsură ce utilizatorul îl introduce
document.getElementById("customRpcUrl").addEventListener("input", (event) => {
  const providerUrlElement = document.getElementById("providerUrl");
  providerUrlElement.value = event.target.value;
});

// Inițializează WebSocket când pagina se încarcă
window.onload = () => {
  setupWebSocket();
  updateProviderUrl(); // Setează provider-ul și moneda inițială
};

function clearResults() {
  const scrambleResults = document.getElementById("scrambleResults");
  const balanceResults = document.getElementById("balanceResults");

  if (scrambleResults) {
    scrambleResults.innerHTML = ""; // Golește conținutul listei de scramble results
  }

  if (balanceResults) {
    balanceResults.innerHTML = ""; // Golește conținutul listei de balance results
  }

  // Resetează contorul de adrese găsite și actualizează afisarea
  addressesFound = 0;
  updateFoundAddressesCount();
}

function updateFoundAddressesCount() {
  const countElement = document.getElementById("foundAddressesCount");
  if (countElement) {
    countElement.textContent = `Addresses found with balance > 0: ${addressesFound}`;
  }
}
