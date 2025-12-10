// static/js/chat_style.js
// Responsabilidade: conteúdo visual / DOM / eventos de UI.
// Não contém lógica de rede / criptografia / envio — apenas helpers que o chat.js consumirá.

(function () {
  // Elements
  let messagesList = null;
  let msgInput = null;
  let btnSend = null;

  // Helpers internos
  function ensureElements() {
    if (!messagesList) messagesList = document.getElementById("messages");
    if (!msgInput) msgInput = document.getElementById("msgInput");
    if (!btnSend) btnSend = document.getElementById("btnSend");
  }

  // Render a single message object: { sender, message }
  function appendMessage(data, myId) {
    ensureElements();

    const li = document.createElement("li");
    li.classList.add("message-bubble");

    if (data.sender === myId) {
      li.classList.add("my-message");
    } else {
      li.classList.add("other-message");
    }

    // Monta o conteúdo visual
    const headerInfo = document.querySelector(".chat-header small");
    let displayName = "";
    if (headerInfo) {
      const rawText = headerInfo.innerText || "";
      displayName = rawText.replace("Conectado com", "").trim();
    }
    const senderName = data.sender === myId ? "Você" : displayName || "Interlocutor";

    // NOTE: 'data.message' is expected to be plaintext here.
    li.innerHTML = `
      <span class="message-sender">${senderName}</span>
      <span class="message-content">${data.message}</span>
    `;
    messagesList.appendChild(li);
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  // UI enable/disable helpers (used while handshake)
  function disableChatUI() {
    ensureElements();
    if (msgInput) msgInput.setAttribute("disabled", "disabled");
    if (btnSend) btnSend.setAttribute("disabled", "disabled");
  }

  function enableChatUI() {
    ensureElements();
    if (msgInput) msgInput.removeAttribute("disabled");
    if (btnSend) btnSend.removeAttribute("disabled");
    if (msgInput) msgInput.focus();
  }

  // Get value from input and clear it
  function getAndClearInput() {
    ensureElements();
    if (!msgInput) return "";
    const v = msgInput.value;
    msgInput.value = "";
    return v;
  }

  function getInputValue() {
    ensureElements();
    return msgInput ? msgInput.value : "";
  }

  function clearInput() {
    ensureElements();
    if (msgInput) msgInput.value = "";
  }

  // Attach UI listeners that call into window.sendMessage (if defined).
  // We attach them on DOMContentLoaded so elements exist.
  document.addEventListener("DOMContentLoaded", () => {
    ensureElements();

    // Start with UI disabled until handshake completes (chat.js can call enableChatUI)
    disableChatUI();

    if (btnSend) {
      btnSend.addEventListener("click", () => {
        if (typeof window.sendMessage === "function") {
          window.sendMessage();
        } else {
          // fallback: do nothing (sendMessage not yet bound)
          console.warn("sendMessage not available yet.");
        }
      });
    }

    if (msgInput) {
      msgInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          if (typeof window.sendMessage === "function") {
            window.sendMessage();
          } else {
            console.warn("sendMessage not available yet.");
          }
        }
      });
    }
  });

  // Expose a UI API that chat.js will use.
  window.ChatUI = {
    appendMessage,     // (data, myId) => void
    disableChatUI,     // () => void
    enableChatUI,      // () => void
    getAndClearInput,  // () => string
    getInputValue,     // () => string
    clearInput         // () => void
  };
})();
