const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
require('dotenv').config();

// Função para validar e corrigir números de telefone
const validateAndFormatNumber = (number) => {
    if (!/^\d+$/.test(number)) {
        throw new Error('O número deve conter apenas dígitos.');
    }

    if (number.length < 11 || number.length > 13) {
        throw new Error('O número deve ter entre 11 e 13 dígitos, incluindo o DDI e DDD.');
    }

    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);

    if (numberDDI === "55") {
        if (parseInt(numberDDD) <= 30 && numberUser.length === 8) {
            return `55${numberDDD}9${numberUser}`;
        }
        return `55${numberDDD}${numberUser}`;
    }

    return number;
};

// Configuração de dispositivos
const devices = [
    { name: "Device1", port: 3000, authPath: 'session1' },
    { name: "Device2", port: 3001, authPath: 'session2' },
    { name: "Device3", port: 3002, authPath: 'session3' },
];

// Inicializando servidores para cada dispositivo
devices.forEach((device) => {
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    app.use(express.json());
    let currentQrCode = null;
    let isConnected = false;

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: device.authPath }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
            timeout: 60000,
        },
    });

    // Middleware de autenticação
    app.use((req, res, next) => {
        const { u, p } = req.query;

        if (req.path === '/' || req.path.startsWith('/public')) {
            return next();
        }

        const expectedUser = process.env[`DEVICE${device.name.slice(-1)}_API_USER`];
        const expectedPassword = process.env[`DEVICE${device.name.slice(-1)}_API_PASSWORD`];

        if (u !== expectedUser || p !== expectedPassword) {
            return res.status(403).json({
                status: 'error',
                message: `Acesso negado para ${device.name}. Usuário ou senha inválidos.`,
            });
        }

        next();
    });

    // Servir arquivos estáticos e index.html
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    client.on('qr', (qr) => {
        console.log(`[${device.name}] QR Code gerado:`, qr);
        currentQrCode = qr;
        isConnected = false;
        io.emit('qr', qr);
    });

    client.on('ready', () => {
        console.log(`[${device.name}] WhatsApp conectado e pronto para uso!`);
        io.emit('ready', 'WhatsApp conectado e pronto para uso!');
        currentQrCode = null;
        isConnected = true;
    });

    client.on('authenticated', () => {
        console.log(`[${device.name}] Autenticado com sucesso!`);
        io.emit('authenticated', 'Autenticado com sucesso!');
        currentQrCode = null;
        isConnected = true;
    });

    client.on('auth_failure', (msg) => {
        console.error(`[${device.name}] Falha na autenticação:`, msg);
        io.emit('auth_failure', 'Falha na autenticação.');
        currentQrCode = null;
        isConnected = false;
    });

    client.on('disconnected', (reason) => {
        console.log(`[${device.name}] Cliente desconectado. Motivo: ${reason}`);
        client.destroy().then(() => {
            console.log(`[${device.name}] Reiniciando cliente...`);
            client.initialize();
        });
    });

    client.on('error', (error) => {
        console.error(`[${device.name}] Erro do cliente:`, error);
        client.destroy().then(() => {
            console.log(`[${device.name}] Reiniciando cliente devido a erro...`);
            client.initialize();
        });
    });

    io.on('connection', (socket) => {
        console.log(`[${device.name}] Cliente conectado ao WebSocket.`);
        if (isConnected) {
            socket.emit('ready', 'WhatsApp conectado e pronto para uso!');
        } else if (currentQrCode) {
            socket.emit('qr', currentQrCode);
        } else {
            socket.emit('disconnected', 'Aguardando geração do QR Code.');
        }
        socket.on('disconnect', () => {
            console.log(`[${device.name}] Cliente desconectado do WebSocket.`);
        });
    });

    client.initialize();

// Endpoint para enviar mensagem via query string
app.get('/sendMessage', async (req, res) => {
    const { u, p, to, msg, app } = req.query;

    if (!u || !p || !to || !msg || !app) {
        return res.status(400).json({
            status: 'error',
            message: 'Parâmetros obrigatórios ausentes.',
        });
    }

    // Validar usuário e senha
    const expectedUser = process.env[`DEVICE${device.name.slice(-1)}_API_USER`];
    const expectedPassword = process.env[`DEVICE${device.name.slice(-1)}_API_PASSWORD`];

    if (u !== expectedUser || p !== expectedPassword) {
        return res.status(403).json({
            status: 'error',
            message: `Acesso negado para ${device.name}. Usuário ou senha inválidos.`,
        });
    }

    // Validar o parâmetro `app`
    if (app !== 'webservices') {
        return res.status(400).json({
            status: 'error',
            message: 'Parâmetro "app" inválido.',
        });
    }

    try {
        // Validar e formatar o número
        const formattedNumber = validateAndFormatNumber(to);
        const chatId = `${formattedNumber}@c.us`;

        // Enviar mensagem
        await client.sendMessage(chatId, msg);
        res.status(200).json({
            status: 'success',
            message: `Mensagem enviada para ${formattedNumber}.`,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Erro ao enviar mensagem: ${error.message}`,
        });
    }
});


    // Endpoint para listar grupos
    app.get('/list-groups', async (req, res) => {
        try {
            const chats = await client.getChats();
            const groups = chats.filter(chat => chat.isGroup);

            const groupList = groups.map(group => ({
                name: group.name,
                id: group.id._serialized
            }));

            res.status(200).json({
                status: 'success',
                groups: groupList
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Erro ao listar grupos',
                error: error.message
            });
        }
    });

    // Endpoint para enviar mensagem
    app.post('/send-message', async (req, res) => {
        const { number, message } = req.body;
        if (!number || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Parâmetros obrigatórios ausentes.'
            });
        }
        try {
            const formattedNumber = validateAndFormatNumber(number);
            const chatId = `${formattedNumber}@c.us`;
            await client.sendMessage(chatId, message);
            res.status(200).json({
                status: 'success',
                message: `Mensagem enviada para ${formattedNumber}`
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });

    // Endpoint para enviar mídia
    app.post('/send-media', async (req, res) => {
        const { number, caption, file } = req.body;
        if (!number || !file) {
            return res.status(400).json({
                status: 'error',
                message: 'Parâmetros obrigatórios ausentes.'
            });
        }
        try {
            const formattedNumber = validateAndFormatNumber(number);
            const chatId = `${formattedNumber}@c.us`;
            const media = await MessageMedia.fromUrl(file, { unsafeMime: true });
            await client.sendMessage(chatId, media, { caption });
            res.status(200).json({
                status: 'success',
                message: `Mídia enviada para ${formattedNumber}`
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });

    // Endpoint para enviar mensagem para grupo
    app.post('/send-group-message', async (req, res) => {
        const { id, message } = req.body;
        if (!id || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Parâmetros obrigatórios ausentes.'
            });
        }
        try {
            await client.sendMessage(id, message);
            res.status(200).json({
                status: 'success',
                message: `Mensagem enviada para o grupo ${id}`
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });

    // Endpoint para enviar mídia para grupo
    app.post('/send-group-media', async (req, res) => {
        const { id, caption, file } = req.body;
        if (!id || !file) {
            return res.status(400).json({
                status: 'error',
                message: 'Parâmetros obrigatórios ausentes.'
            });
        }
        try {
            const media = await MessageMedia.fromUrl(file, { unsafeMime: true });
            await client.sendMessage(id, media, { caption });
            res.status(200).json({
                status: 'success',
                message: `Mídia enviada para o grupo ${id}`
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });

    server.listen(device.port, () => {
        console.log(`[${device.name}] Servidor rodando em http://localhost:${device.port}`);
    });
});
