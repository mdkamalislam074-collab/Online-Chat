const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// স্ট্যাটিক ফোল্ডার বা রুট সেটআপ
app.use(express.static(__dirname));

// অনলাইন ব্যবহারকারীদের তালিকা রাখার জন্য অবজেক্ট
let users = {};

io.on('connection', (socket) => {
    console.log('একটি নতুন ডিভাইস যুক্ত হয়েছে:', socket.id);

    // ইউজার যখন নাম এবং প্রোফাইল পিকচার দিয়ে চ্যাটে প্রবেশ করবে
    socket.on('join_chat', (data) => {
        users[socket.id] = {
            id: socket.id,
            username: data.username,
            profilePic: data.profilePic || 'https://via.placeholder.com/150'
        };

        // সবাইকে আপডেট ইউজার লিস্ট পাঠানো
        io.emit('update_user_list', Object.values(users));
    });

    // পাবলিক বা সাধারণ চ্যাট মেসেজ
    socket.on('chat_message', (data) => {
        io.emit('receive_message', {
            sender: users[socket.id] ? users[socket.id].username : 'অজ্ঞাত',
            profilePic: users[socket.id] ? users[socket.id].profilePic : '',
            message: data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // প্রাইভেট বা আলাদা মেসেজ (নির্দিষ্ট ইউজারের কাছে পাঠানোর জন্য)
    socket.on('private_message', (data) => {
        io.to(data.toUserId).emit('receive_private_message', {
            senderId: socket.id,
            senderName: users[socket.id] ? users[socket.id].username : 'অজ্ঞাত',
            message: data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // অডিও/ভিডিও কলের সিগন্যালিং (WebRTC কল অপশন)
    socket.on('call_user', (data) => {
        io.to(data.userToCall).emit('incoming_call', {
            signal: data.signalData,
            from: socket.id,
            name: users[socket.id] ? users[socket.id].username : 'কেউ একজন'
        });
    });

    socket.on('answer_call', (data) => {
        io.to(data.to).emit('call_accepted', data.signal);
    });

    // ডিসকানেক্ট বা কেটে গেলে লিস্ট আপডেট করা
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update_user_list', Object.values(users));
        console.log('ইউজার ডিসকানেক্ট হয়েছে:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`সার্ভার সফলভাবে চালু হয়েছে পোর্ট ${PORT} এ`);
});