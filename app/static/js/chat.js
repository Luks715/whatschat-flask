window.socket = io();

document.addEventListener("DOMContentLoaded", async () => {

    // 2. Lê o ID do outro usuário pela query string
    const urlParams = new URLSearchParams(window.location.search);
    const otherUserId = urlParams.get("user");

    if (!otherUserId) {
        alert("Erro: ID do outro usuário não encontrado.");
        return;
    }

    // 3. Buscar o ID do usuário logado (via fetch /users/me)
    const response = await fetch("/users/me");
    const me = await response.json();
    const myId = me.id;

    // 4. Entrar na sala usando seu evento "join"
    socket.emit("join", {
        user1_id: myId,
        user2_id: Number(otherUserId)
    });

    // 5. Lidar com mensagens recebidas, input e botão de envio
    const messagesList = document.getElementById("messages");
    const msgInput = document.getElementById("msgInput");
    const btnSend = document.getElementById("btnSend");

    function appendMessage(data) {
        const li = document.createElement("li");
        li.classList.add("message-bubble");
        if (data.sender === myId) {
            li.classList.add("my-message");
        } else {
            li.classList.add("other-message");
        }
        // Monta o conteúdo visual
        const headerInfo = document.querySelector(".chat-header small");
        const rawText = headerInfo.innerText;
        displayName = rawText.replace("Conectado com", "").trim();
        const senderName = data.sender === myId ? "Você" : displayName;
        li.innerHTML = `
            <span class="message-sender">${senderName}</span>
            <span class="message-content">${data.message}</span>
        `;
        messagesList.appendChild(li);
        // Rola para o final automaticamente
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    socket.on("receive_message", (data) => {
        appendMessage(data);
    });

    // 6. Enviar mensagem
    function sendMessage() {
        const msg = msgInput.value;
        if (!msg.trim()) return;
        msgInput.value = "";
        // Envia para o servidor
        socket.emit("send_message", {
            sender: myId,
            receiver: Number(otherUserId),
            message: msg
        });
    }

    btnSend.addEventListener("click", sendMessage);
    // Enviar com Enter
    msgInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // 7. Quando o usuário fechar a aba ou sair da página → leave
    window.addEventListener("beforeunload", () => {
        socket.emit("leave", {
            username: me.username,     // seu handler usa username
            room: ""                   // opcional — não é necessário porque build_room_name pode reconstruir
        });
    });
});
