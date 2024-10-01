# WhatsApp API with Node.js

Esta API permite enviar mensagens e mídias através do WhatsApp usando a biblioteca `whatsapp-web.js`. Ela inclui funcionalidades para enviar mensagens individuais, mensagens em grupo e interagir com usuários e grupos no WhatsApp.

## Funcionalidades

- Enviar mensagens de texto para números individuais.
- Enviar mídias (imagens, vídeos) para números individuais e grupos.
- Enviar mensagens para grupos utilizando o ID ou nome do grupo.
- Verificar se um número está registrado no WhatsApp.
- Limpar mensagens de um chat.

## Pré-requisitos

Antes de começar, você precisará ter o seguinte instalado:

- [Node.js](https://nodejs.org/) (v12 ou superior)
- NPM (geralmente instalado com o Node.js)
- [WhatsApp Web](https://web.whatsapp.com/)

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/erickbritto/api-whatsapp-bot-ezv.git
   cd seurepositorio
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

   ```plaintext
   PORT=8000
   ```

4. Inicie a API:

   ```bash
   node app.js
   ```

## Endpoints

### 1. Enviar Mensagem

- **URL:** `/send-message`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "number": "559491234567",
    "message": "Sua mensagem aqui"
  }
  ```

### 2. Enviar Mídia

- **URL:** `/send-media`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "number": "559491234567",
    "caption": "Sua legenda aqui",
    "file": "URL do arquivo"
  }
  ```

### 3. Enviar Mensagem para Grupo

- **URL:** `/send-group-message`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "id": "id_do_grupo_ou_nome",
    "message": "Sua mensagem aqui"
  }
  ```

### 4. Enviar Mídia para Grupo

- **URL:** `/send-group-media`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "id": "id_do_grupo",
    "caption": "Sua legenda aqui",
    "file": "URL do arquivo"
  }
  ```

### 5. Limpar Mensagens

- **URL:** `/clear-message`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "number": "559491234567"
  }
  ```

## Tecnologias Usadas

- [Node.js](https://nodejs.org/)
- [whatsapp-web.js](https://github.com/pavlishewhatsapp/web.js)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Axios](https://axios-http.com/)
- [MIME Types](https://www.npmjs.com/package/mime-types)

## Contribuição

Sinta-se à vontade para contribuir com melhorias ou correções. Abra uma issue ou envie um pull request!

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
