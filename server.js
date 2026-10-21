const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// ইউজার ডাটা সেভ করার জন্য অবজেক্ট
const users = {}; 

// মূল পেজ (ফ্রন্টএন্ড)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>প্রোফাইল ও চ্যাট অ্যাপ</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f0f2f5; margin: 0; display: flex; flex-direction: column; height: 100vh; }
                .hidden { display: none !important; }
                
                #auth-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #075e54; }
                .auth-box { background: white; padding: 25px; border-radius: 8px; width: 300px; box-shadow: 0px 4px 10px rgba(0,0,0,0.2); text-align: center; }
                .auth-box input { width: 90%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
                .auth-box button { width: 95%; padding: 10px; background: #075e54; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
                .auth-box a { color: #075e54; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

                #chat-screen { display: flex; flex-direction: column; height: 100vh; }
                header { background-color: #075e54; color: white; padding: 15px; display: flex; align-items: center; justify-content: space-between; font-size: 1.1rem; }
                .user-info { display: flex; align-items: center; gap: 10px; }
                .user-info img, .message-row img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid white; background: #ddd; }
                
                #chat-container { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #e5ddd5; }
                .message-row { display: flex; gap: 10px; max-width: 75%; align-items: flex-end; }
                .message-row.sent { align-self: flex-end; flex-direction: row-reverse; }
                .message-bubble { background: white; padding: 10px; border-radius: 8px; word-wrap: break-word; box-shadow: 0 1px 1px rgba(0,0,0,0.1); }
                .sent .message-bubble { background: #dcf8c6; }
                
                #input-container { display: flex; padding: 10px; background: #f0f0f0; border-top: 1px solid #ccc; }
                #message-input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; outline: none; font-size: 1rem; }
                #send-btn { background: #075e54; color: white; border: none; padding: 10px 20px; margin-left: 10px; border-radius: 4px; cursor: pointer; font-size: 1rem; }
            </style>
        </head>
        <body>

            <!-- লগইন ও সাইনআপ সেকশন -->
            <div id="auth-container">
                <div id="login-box" class="auth-box">
                    <h2>লগইন করুন</h2>
                    <input type="text" id="login-phone" placeholder="মোবাইল নাম্বার">
                    <input type="password" id="login-password" placeholder="পাসওয়ার্ড">
                    <button onclick="login()">লগইন</button>
                    <p>অ্যাকাউন্ট নেই? <a onclick="showSignup()">রেজিস্ট্রেশন করুন</a></p>
                </div>

                <div id="signup-box" class="auth-box hidden">
                    <h2>নতুন অ্যাকাউন্ট</h2>
                    <input type="text" id="signup-name" placeholder="আপনার নাম">
                    <input type="text" id="signup-phone" placeholder="মোবাইল নাম্বার">
                    <input type="password" id="signup-password" placeholder="পাসওয়ার্ড">
                    <label style="font-size:0.85rem; text-align:left; display:block; margin-top:5px;">প্রোফাইল ছবির লিংক (ঐচ্ছিক):</label>
                    <input type="text" id="signup-pic" placeholder="ছবির URL দিন">
                    <button onclick="signup()">রেজিস্ট্রেশন</button>
                    <p>ইতিমধ্যে অ্যাকাউন্ট আছে? <a onclick="showLogin()">লগইন করুন</a></p>
                </div>
            </div>

            <!-- চ্যাট স্ক্রিন -->
            <div id="chat-screen" class="hidden">
                <header>
                    <div class="user-info">
                        <img id="my-profile-pic" src="" alt="Pic">
                        <span id="my-name-display">নাম</span>
                    </div>
                    <button onclick="logout()" style="background:#ff4d4d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">লগআউট</button>
                </header>

                <div id="chat-container"></div>

                <div id="input-container">
                    <input type="text" id="message-input" placeholder="মেসেজ লিখুন..." autocomplete="off">
                    <button id="send-btn" onclick="sendMessage()">পাঠান</button>
                </div>
            </div>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let currentUser = null;

                function showSignup() {
                    document.getElementById('login-box').classList.add('hidden');
                    document.getElementById('signup-box').classList.remove('hidden');
                }

                function showLogin() {
                    document.getElementById('signup-box').classList.add('hidden');
                    document.getElementById('login-box').classList.remove('hidden');
                }

                async function signup() {
                    const name = document.getElementById('signup-name').value.trim();
                    const phone = document.getElementById('signup-phone').value.trim();
                    const password = document.getElementById('signup-password').value.trim();
                    let profilePic = document.getElementById('signup-pic').value.trim();

                    if(!name || !phone || !password) {
                        alert('দয়া করে নাম, নাম্বার এবং পাসওয়ার্ড পূরণ করুন!');
                        return;
                    }

                    if(!profilePic) {
                        profilePic = 'https://i.imgur.com/6VBx3io.png'; // ডিফল্ট ছবি
                    }

                    try {
                        const res = await fetch('/api/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, phone, password, profilePic })
                        });
                        const data = await res.json();
                        alert(data.message);
                        if (data.success) {
                            showLogin();
                        }
                    } catch (err) {
                        alert('সার্ভার কানেকশন এরর!');
                    }
                }

                async function login() {
                    const phone = document.getElementById('login-phone').value.trim();
                    const password = document.getElementById('login-password').value.trim();

                    if(!phone || !password) {
                        alert('নাম্বার ও পাসওয়ার্ড দিন!');
                        return;
                    }

                    try {
                        const res = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone, password })
                        });
                        const data = await res.json();
                        
                        if (data.success) {
                            currentUser = data.user;
                            document.getElementById('auth-container').classList.add('hidden');
                            document.getElementById('chat-screen').classList.remove('hidden');
                            document.getElementById('my-name-display').textContent = currentUser.name;
                            document.getElementById('my-profile-pic').src = currentUser.profilePic;
                        } else {
                            alert(data.message);
                        }
                    } catch (err) {
                        alert('লগইন করতে সমস্যা হচ্ছে!');
                    }
                }

                function logout() {
                    location.reload();
                }

                function sendMessage() {
                    const text = document.getElementById('message-input').value.trim();
                    if (text === '' || !currentUser) return;

                    const messageData = {
                        name: currentUser.name,
                        phone: currentUser.phone,
                        profilePic: currentUser.profilePic,
                        text: text
                    };

                    socket.emit('chat message', messageData);
                    document.getElementById('message-input').value = '';
                }

                socket.on('chat message', function(data) {
                    const chatContainer = document.getElementById('chat-container');
                    
                    const row = document.createElement('div');
                    row.classList.add('message-row');
                    if (currentUser && data.phone === currentUser.phone) {
                        row.classList.add('sent');
                    }

                    row.innerHTML = \`
                        <img src="\${data.profilePic}" alt="Pic">
                        <div class="message-bubble">
                            <b style="font-size:0.8rem; color:#075e54; display:block;">\${data.name}</b>
                            <span>\${data.text}</span>
                        </div>
                    \`;
                    
                    chatContainer.appendChild(row);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                });

                document.getElementById('message-input').addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') sendMessage();
                });
            </script>
        </body>
        </html>
    `);
});

// ব্যাকএন্ড API রাউট
app.post('/api/signup', (req, res) => {
    const { phone, password, name, profilePic } = req.body;
    if (users[phone]) {
        return res.json({ success: false, message: 'এই নাম্বার দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে!' });
    }
    users[phone] = { password, name, profilePic };
    res.json({ success: true, message: 'রেজিস্ট্রেশন সফল হয়েছে! এবার লগইন করুন।' });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!users[phone] || users[phone].password !== password) {
        return res.json({ success: false, message: 'ভুল নাম্বার বা পাসওয়ার্ড!' });
    }
    res.json({ success: true, user: { phone, name: users[phone].name, profilePic: users[phone].profilePic } });
});

// রিয়েল-টাইম চ্যাট সকেট
io.on('connection', (socket) => {
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`সার্ভার চালু হয়েছে: http://localhost:${PORT}`);
});
