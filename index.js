const express = require('express')
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const bodyParser = require('body-parser')
const fs = require('fs')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

let sock

function logToFile(message) {
    fs.appendFileSync('connection.log', `${new Date().toISOString()} - ${message}\n`)
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        console.log('Connection Update:', update) // Menampilkan semua detail koneksi
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            console.error('Connection closed:', lastDisconnect?.error) // Menampilkan detail error
            if(shouldReconnect) {
                console.log('Reconnecting...')
                connectToWhatsApp()
            } else {
                console.error('Connection closed and not reconnecting')
            }
        } else if(connection === 'open') {
            console.log('WhatsApp connection opened')
            logToFile('opened connection')
        }
    })
    
    sock.ev.on('error', (error) => {
        console.error('Socket Error:', error)
    })
}

function formatPhoneNumber(number) {
    // Tambahkeun kode nagara upami nomer dimimitian ku 0
    if (number.startsWith('0')) {
        return `62${number.slice(1)}`
    }
    // Tambahkeun kode nagara upami teu aya
    if (!number.startsWith('62')) {
        return `62${number}`
    }
    return number
}

async function sendMessageToGroup(groupId, message) {
    try {
        console.log(`Sending message to group ${groupId}`);
        const response = await sock.sendMessage(`${groupId}@g.us`, { text: message });
        console.log('Message sent to group:', response);
    } catch (error) {
        console.error('Error sending message:', error);
        if (error.stack) {
            console.error('Error stack trace:', error.stack);
        }
        // Coba kirim ulang jika terjadi error
        console.log('Retrying message send...');
        await sendMessageToGroup(groupId, message);
    }
}


app.post('/send-message', async (req, res) => {
    const { number, message } = req.body
    if (!sock) {
        return res.status(500).send('WhatsApp not connected')
    }
    try {
        const formattedNumber = formatPhoneNumber(number)
        await sock.sendMessage(`${formattedNumber}@s.whatsapp.net`, { text: message })
        res.send('Message sent')
    } catch (error) {
        res.status(500).send('Failed to send message')
    }
})

app.post('/send-group-message', async (req, res) => {
    const { groupName, message } = req.body
    if (!sock) {
        console.error('WhatsApp not connected')
        return res.status(500).send('WhatsApp not connected')
    }
    try {
        const groups = await sock.groupFetchAllParticipating()
        console.log('Groups fetched:', groups)
        const group = Object.values(groups).find(g => g.subject.toLowerCase() === groupName.toLowerCase())
        if (group) {
            console.log(`Sending message to group: ${group.id}`)
            await sendMessageToGroup(group.id, message)
            res.send('Message sent to group')
        } else {
            console.error('Group not found')
            res.status(404).send('Group not found')
        }
    } catch (error) {
        console.error('Error sending message to group:', error)
        res.status(500).send(`Failed to send message to group: ${error.message}`)
    }
})

connectToWhatsApp()

app.listen(3000, () => {
    console.log('Server is running on port 3000')
})

