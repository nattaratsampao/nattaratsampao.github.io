// =====================================================
// CANADIAN FOREST FIRE WEATHER INDEX (FWI) SYSTEM
// ระบบประเมินความเสี่ยงไฟป่ามาตรฐานสากล
// =====================================================

// ===== การตั้งค่าระบบ FWI =====
const FWI_CONFIG = {
    // ค่าเริ่มต้นสำหรับระบบ FWI
    INITIAL_FFMC: 85,    // Fine Fuel Moisture Code เริ่มต้น
    INITIAL_DMC: 6,      // Duff Moisture Code เริ่มต้น  
    INITIAL_DC: 15,      // Drought Code เริ่มต้น

    // ค่าคงที่สำหรับการคำนวณ
    FFMC_CONSTANTS: {
        a: 147.2,
        b: 0.732,
        c: 0.5
    },

    // เกณฑ์การแบ่งระดับความเสี่ยง FWI
    FWI_CLASSES: {
        LOW: { min: 0, max: 8.5, color: '#00ff00', thai: 'ต่ำ' },
        MODERATE: { min: 8.5, max: 19, color: '#0080ff', thai: 'ปานกลาง' },
        HIGH: { min: 19, max: 30, color: '#ffff00', thai: 'สูง' },
        VERY_HIGH: { min: 30, max: 50, color: '#ff8000', thai: 'สูงมาก' },
        EXTREME: { min: 50, max: Infinity, color: '#ff0000', thai: 'อันตรายสุด' }
    }
};

// ===== ระบบ FWI หลัก =====
class FireWeatherIndex {
    constructor() {
        // เก็บค่า moisture codes ของวันก่อน
        this.yesterdayFFMC = FWI_CONFIG.INITIAL_FFMC;
        this.yesterdayDMC = FWI_CONFIG.INITIAL_DMC;
        this.yesterdayDC = FWI_CONFIG.INITIAL_DC;

        // เก็บประวัติข้อมูล
        this.fwiHistory = [];
    }

    // คำนวณ Fine Fuel Moisture Code (FFMC)
    // ความชื้นของเชื้อเพลิงขนาดเล็ก (หญ้า ใบไม้แห้ง)
    calculateFFMC(temperature, humidity, windSpeed, rainfall) {
        let ffmc = this.yesterdayFFMC;

        // ปรับค่าตามฝน
        if (rainfall > 0.5) {
            let rf = rainfall - 0.5;
            let mr = 0;

            if (rf <= 1.45) {
                mr = ffmc - 42.5 * rf * Math.exp(-100.0 / (251.0 - ffmc)) * (1.0 - Math.exp(-6.93 / rf));
            } else {
                mr = ffmc - 42.5 * rf * Math.exp(-100.0 / (251.0 - ffmc)) *
                    (1.0 - Math.exp(-6.93 / rf)) + 0.0365 * rf;
            }

            if (mr < 0) mr = 0;
            ffmc = mr;
        }

        // คำนวณความชื้นสมดุล
        let ed = 0.942 * Math.pow(humidity, 0.679) + 11.0 * Math.exp((humidity - 100.0) / 10.0) + 0.18 * (21.1 - temperature) * (1.0 - 1.0 / Math.exp(0.115 * humidity));

        if (ffmc > ed) {
            let ew = 0.618 * Math.pow(humidity, 0.753) + 10.0 * Math.exp((humidity - 100.0) / 10.0) + 0.18 * (21.1 - temperature) * (1.0 - 1.0 / Math.exp(0.115 * humidity));

            if (ffmc < ew) {
                ffmc = ew;
            }
        }

        // ปรับค่าตามลม
        let k = 0.424 * (1.0 - Math.pow((humidity / 100.0), 1.7)) + 0.0694 * Math.sqrt(windSpeed) * (1.0 - Math.pow((humidity / 100.0), 8.0));
        let kd = k * 0.581 * Math.exp(0.0365 * temperature);

        let m = ed + (ffmc - ed) * Math.pow(10.0, -kd);

        if (m < 0) m = 0;
        if (m > 101) m = 101;

        ffmc = 59.5 * (250.0 - m) / (147.2 + m);

        if (ffmc < 0) ffmc = 0;
        if (ffmc > 101) ffmc = 101;

        return Math.round(ffmc * 10) / 10;
    }

    // คำนวณ Duff Moisture Code (DMC)
    // ความชื้นของชั้นวัสดุอินทรีย์กึ่งย่อยสลาย
    calculateDMC(temperature, humidity, rainfall, month) {
        let dmc = this.yesterdayDMC;

        // ตารางค่าแก้ไขตามเดือน (สำหรับ latitude 45-65 องศาเหนือ)
        const dayLengthFactors = [6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 8.4, 6.8, 6.2, 6.5];
        let dayLength = dayLengthFactors[month - 1];

        // ปรับสำหรับประเทศไทย (latitude ประมาณ 14 องศาเหนือ)
        dayLength = 12.0; // ใกล้เส้นศูนย์สูตรมี daylight ประมาณ 12 ชั่วโมง

        // ปรับค่าตามฝน
        if (rainfall > 1.5) {
            let re = 0.92 * rainfall - 1.27;
            let mo = 20.0 + 280.0 / Math.exp(0.023 * dmc);

            if (dmc <= 33.0) {
                let b = 100.0 / (0.5 + 0.3 * dmc);
                if (dmc <= 65.0) {
                    mo = mo + 42.5 * re * Math.exp(-100.0 / (251.0 - dmc)) * (1.0 - Math.exp(-6.93 / re)) * b / 100.0;
                }
            } else {
                mo = mo + 42.5 * re * Math.exp(-100.0 / (251.0 - dmc)) * (1.0 - Math.exp(-6.93 / re));
            }

            if (mo < 0) mo = 0;
            dmc = 43.43 * (5.6348 - Math.log(mo - 20.0));
        }

        if (temperature > -1.1) {
            let k = 1.894 * (temperature + 1.1) * (100.0 - humidity) * dayLength * 0.0001;
            dmc = dmc + 100.0 * k;
        }

        if (dmc < 0) dmc = 0;

        return Math.round(dmc * 10) / 10;
    }

    // คำนวณ Drought Code (DC)
    // ความชื้นของชั้นดินลึกและวัสดุอินทรีย์ใต้ดิน
    calculateDC(temperature, rainfall, month) {
        let dc = this.yesterdayDC;

        // ตารางค่าแก้ไขตามเดือน
        const dayLengthFactors = [-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6];
        let dayLength = dayLengthFactors[month - 1];

        // ปรับสำหรับประเทศไทย
        dayLength = 2.0; // ค่าเฉลี่ยสำหรับเขตร้อน

        // ปรับค่าตามฝน
        if (rainfall > 2.8) {
            let rd = 0.83 * rainfall - 1.27;
            let qo = 800.0 * Math.exp(-dc / 400.0);
            let qr = qo + 3.937 * rd;
            let dr = 400.0 * Math.log(800.0 / qr);

            if (dr > 0.0) {
                dc = dr;
            } else {
                dc = 0.0;
            }
        }

        if (temperature > -2.8) {
            let v = 0.36 * (temperature + 2.8) + dayLength;
            if (v < 0) v = 0;
            dc = dc + 0.5 * v;
        }

        if (dc < 0) dc = 0;

        return Math.round(dc * 10) / 10;
    }

    // คำนวณ Initial Spread Index (ISI)
    // ดัชนีการแพร่กระจายเริ่มต้น
    calculateISI(ffmc, windSpeed) {
        let fW = Math.exp(0.05039 * windSpeed);
        let fF = 91.9 * Math.exp(-0.1386 * ffmc) * (1.0 + Math.pow(ffmc, 5.31) / 4.93e7);

        let isi = 0.208 * fW * fF;

        return Math.round(isi * 10) / 10;
    }

    // คำนวณ Buildup Index (BUI)
    // ดัชนีการสะสมเชื้อเพลิง
    calculateBUI(dmc, dc) {
        let bui;

        if (dmc <= 0.4 * dc) {
            bui = 0.8 * dmc * dc / (dmc + 0.4 * dc);
        } else {
            bui = dmc - (1.0 - 0.8 * dc / (dmc + 0.4 * dc)) * (0.92 + Math.pow(0.0114 * dmc, 1.7));
        }

        if (bui < 0) bui = 0;

        return Math.round(bui * 10) / 10;
    }

    // คำนวณ Fire Weather Index (FWI) หลัก
    calculateFWI(isi, bui) {
        let fD;

        if (bui <= 80) {
            fD = 0.626 * Math.pow(bui, 0.809) + 2.0;
        } else {
            fD = 1000.0 / (25.0 + 108.64 / Math.exp(0.023 * bui));
        }

        let b = 0.1 * isi * fD;

        let fwi;
        if (b > 1.0) {
            fwi = Math.exp(2.72 * Math.pow(0.434 * Math.log(b), 0.647));
        } else {
            fwi = b;
        }

        return Math.round(fwi * 10) / 10;
    }

    // ฟังก์ชันหลักคำนวณ FWI ทั้งระบบ
    calculateComplete(weather, rainfall = 0) {
        const temperature = weather.temperature_2m;
        const humidity = weather.relative_humidity_2m;
        const windSpeed = weather.wind_speed_10m;
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;

        // คำนวณ moisture codes
        const ffmc = this.calculateFFMC(temperature, humidity, windSpeed, rainfall);
        const dmc = this.calculateDMC(temperature, humidity, rainfall, month);
        const dc = this.calculateDC(temperature, rainfall, month);

        // คำนวณ indices
        const isi = this.calculateISI(ffmc, windSpeed);
        const bui = this.calculateBUI(dmc, dc);
        const fwi = this.calculateFWI(isi, bui);

        // กำหนดระดับความเสี่ยง
        let riskClass = 'LOW';
        let riskData = FWI_CONFIG.FWI_CLASSES.LOW;

        for (let [className, classData] of Object.entries(FWI_CONFIG.FWI_CLASSES)) {
            if (fwi >= classData.min && fwi < classData.max) {
                riskClass = className;
                riskData = classData;
                break;
            }
        }

        // อัปเดตค่าสำหรับวันถัดไป
        this.yesterdayFFMC = ffmc;
        this.yesterdayDMC = dmc;
        this.yesterdayDC = dc;

        // เก็บประวัติ
        const result = {
            timestamp: new Date(),
            components: { ffmc, dmc, dc, isi, bui },
            fwi: fwi,
            riskClass: riskClass,
            riskData: riskData,
            weather: { temperature, humidity, windSpeed, rainfall }
        };

        this.fwiHistory.push(result);
        if (this.fwiHistory.length > 30) {
            this.fwiHistory.shift();
        }

        return result;
    }

    // ดึงข้อมูลประวัติ
    getHistory() {
        return this.fwiHistory;
    }

    // รีเซ็ตระบบ
    reset() {
        this.yesterdayFFMC = FWI_CONFIG.INITIAL_FFMC;
        this.yesterdayDMC = FWI_CONFIG.INITIAL_DMC;
        this.yesterdayDC = FWI_CONFIG.INITIAL_DC;
        this.fwiHistory = [];
    }
}

// =====================================================
// ระบบทางเลือก: SIMPLIFIED FIRE DANGER RATING
// ระบบประเมินแบบง่ายแต่อิงหลักวิทยาศาสตร์
// =====================================================

class SimplifiedFireDanger {
    constructor() {
        this.history = [];
    }

    // คำนวณ Vapor Pressure Deficit (VPD)
    calculateVPD(temperature, humidity) {
        // คำนวณ saturation vapor pressure
        const svp = 0.6108 * Math.exp(17.27 * temperature / (temperature + 237.3));
        // คำนวณ actual vapor pressure
        const avp = svp * (humidity / 100);
        // VPD = SVP - AVP
        return svp - avp;
    }

    // คำนวณ Fine Fuel Moisture จากสมการง่าย
    calculateFineFuelMoisture(temperature, humidity, windSpeed) {
        // EMC (Equilibrium Moisture Content) แบบง่าย
        let emc = 0.03229 + 0.281073 * humidity - 0.000578 * humidity * temperature;

        // ปรับตามลม (ลมแรงทำให้แห้งเร็วขึ้น)
        let windFactor = 1 - (windSpeed * 0.01);
        if (windFactor < 0.5) windFactor = 0.5;

        return emc * windFactor * 100; // แปลงเป็นเปอร์เซ็นต์
    }

    // คำนวณ Fosberg Fire Weather Index (FFWI)
    calculateFosbergIndex(temperature, humidity, windSpeed) {
        // คำนวณ EMC
        const emc = this.calculateFineFuelMoisture(temperature, humidity, windSpeed);

        // Fosberg Fire Weather Index
        const ffwi = (Math.sqrt(1 + Math.pow(windSpeed, 2)) - 1) * (emc <= 10 ? 10 - emc : 0) / 0.3002;

        return Math.max(0, ffwi);
    }

    // ระบบประเมินแบบองค์รวม
    calculateComprehensive(weather, rainfall24h = 0, daysWithoutRain = 0) {
        const temp = weather.temperature_2m;
        const humidity = weather.relative_humidity_2m;
        const windSpeed = weather.wind_speed_10m;

        // 1. Fine Fuel Moisture
        const fineFuelMoisture = this.calculateFineFuelMoisture(temp, humidity, windSpeed);

        // 2. Vapor Pressure Deficit
        const vpd = this.calculateVPD(temp, humidity);

        // 3. Fosberg Index
        const fosbergIndex = this.calculateFosbergIndex(temp, humidity, windSpeed);

        // 4. Drought Factor (ยิ่งไม่มีฝนนานยิ่งแห้ง)
        const droughtFactor = Math.min(3.0, 1 + (daysWithoutRain * 0.1));

        // 5. Rain Effect (ฝนลดความเสี่ยง)
        let rainEffect = 1.0;
        if (rainfall24h > 0) {
            rainEffect = Math.max(0.1, 1 - (rainfall24h * 0.1));
        }

        // 6. คำนวณดัชนีรวม
        let fireRisk = (fosbergIndex * 0.4) + (vpd * 10 * 0.3) +
            ((100 - fineFuelMoisture) * 0.3);

        // ปรับตามภาวะแล้งและฝน
        fireRisk = fireRisk * droughtFactor * rainEffect;

        // จำกัดค่า 0-100
        fireRisk = Math.min(100, Math.max(0, fireRisk));

        // กำหนดระดับ
        let level, color, text;
        if (fireRisk < 15) {
            level = 'low'; color = '#00ff00'; text = 'ต่ำ';
        } else if (fireRisk < 30) {
            level = 'moderate'; color = '#ffff00'; text = 'ปานกลาง';
        } else if (fireRisk < 50) {
            level = 'high'; color = '#ff8000'; text = 'สูง';
        } else if (fireRisk < 75) {
            level = 'very_high'; color = '#ff4000'; text = 'สูงมาก';
        } else {
            level = 'extreme'; color = '#ff0000'; text = 'อันตรายสุด';
        }

        const result = {
            fireRisk: Math.round(fireRisk),
            level: level,
            color: color,
            text: text,
            components: {
                fineFuelMoisture: Math.round(fineFuelMoisture),
                vpd: Math.round(vpd * 10) / 10,
                fosbergIndex: Math.round(fosbergIndex * 10) / 10,
                droughtFactor: Math.round(droughtFactor * 10) / 10,
                rainEffect: Math.round(rainEffect * 10) / 10
            },
            details: `ความชื้นเชื้อเพลิง: ${Math.round(fineFuelMoisture)}%, VPD: ${Math.round(vpd * 10) / 10}kPa, แล้ง: ${daysWithoutRain}วัน`
        };

        this.history.push(result);
        if (this.history.length > 48) { // เก็บ 48 ชั่วโมง
            this.history.shift();
        }

        return result;
    }

    getHistory() {
        return this.history;
    }
}

// สร้าง instance ของระบบทั้งสอง
const fwiSystem = new FireWeatherIndex();
const simplifiedSystem = new SimplifiedFireDanger();

// ฟังก์ชันทดแทน calculateFireRisk เดิม
function calculateFireRiskAdvanced(weather, options = {}) {
    const {
        useSystem = 'both', // 'fwi', 'simplified', 'both'
        rainfall = 0,
        daysWithoutRain = 0
    } = options;

    let result = {};

    if (useSystem === 'fwi' || useSystem === 'both') {
        const fwiResult = fwiSystem.calculateComplete(weather, rainfall);
        result.fwi = {
            index: fwiResult.fwi,
            level: fwiResult.riskClass.toLowerCase(),
            color: fwiResult.riskData.color,
            text: `ความเสี่ยง${fwiResult.riskData.thai}`,
            components: fwiResult.components,
            details: `FWI: ${fwiResult.fwi} (FFMC:${fwiResult.components.ffmc}, DMC:${fwiResult.components.dmc}, DC:${fwiResult.components.dc})`,
            spreadRate: Math.round((weather.wind_speed_10m * 0.5) + (fwiResult.fwi * 0.1))
        };
    }

    if (useSystem === 'simplified' || useSystem === 'both') {
        const simpResult = simplifiedSystem.calculateComprehensive(weather, rainfall, daysWithoutRain);
        result.simplified = {
            index: simpResult.fireRisk,
            level: simpResult.level,
            color: simpResult.color,
            text: simpResult.text,
            components: simpResult.components,
            details: simpResult.details,
            spreadRate: Math.round((weather.wind_speed_10m * 0.3) + (simpResult.fireRisk * 0.05))
        };
    }

    // ถ้าใช้ทั้งสองระบบ ให้เอาค่าเฉลี่ย
    if (useSystem === 'both') {
        const avgIndex = Math.round((result.fwi.index + result.simplified.index) / 2);
        result.combined = {
            index: avgIndex,
            level: avgIndex < 15 ? 'low' : avgIndex < 30 ? 'moderate' : avgIndex < 50 ? 'high' : avgIndex < 75 ? 'very_high' : 'extreme',
            color: avgIndex < 15 ? '#00ff00' : avgIndex < 30 ? '#ffff00' : avgIndex < 50 ? '#ff8000' : avgIndex < 75 ? '#ff4000' : '#ff0000',
            text: avgIndex < 15 ? 'ความเสี่ยงต่ำ' : avgIndex < 30 ? 'ความเสี่ยงปานกลาง' : avgIndex < 50 ? 'ความเสี่ยงสูง' : avgIndex < 75 ? 'ความเสี่ยงสูงมาก' : 'ความเสี่ยงอันตรายสุด',
            details: `ค่าเฉลี่ย FWI: ${result.fwi.index}, Simplified: ${result.simplified.index}`,
            spreadRate: Math.round((result.fwi.spreadRate + result.simplified.spreadRate) / 2)
        };
    }

    return useSystem === 'both' ? result.combined : (result.fwi || result.simplified);
}

// ฟังก์ชัน calculateFireRisk ใหม่ที่ใช้ FWI System
function calculateFireRisk(weather) {
    return calculateFireRiskAdvanced(weather, { useSystem: 'fwi' });
}

// ===== Landing Page Effects =====

// Logo transition effect with epic timing
function initLogoTransition() {
    const greenLogo = document.querySelector('.green-mission-logo');
    const schoolLogo = document.querySelector('.school-logo');

    // Create screen flash effect during transition
    setTimeout(() => {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
            z-index: 999;
            animation: flashEffect 0.5s ease-out;
            pointer-events: none;
        `;
        document.body.appendChild(flash);

        setTimeout(() => flash.remove(), 500);

        // Hide green mission logo with epic exit
        greenLogo.style.animation = 'epicLogoEnter 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) reverse forwards';
    }, 3000);
}

// Add flash effect keyframe
function addFlashEffect() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes flashEffect {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Add ripple effect to button
function addRippleEffect() {
    const button = document.querySelector('.cta-button');

    button.addEventListener('click', function (e) {
        e.preventDefault();

        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
        `;

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Add ripple animation and screen shake
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    @keyframes screenShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }
`;
document.head.appendChild(style);

// Initialize everything when page loads
window.addEventListener('load', () => {
    createParticles();
    initLogoTransition();
    addRippleEffect();
    addFlashEffect();

    // Add dramatic sound effect simulation (visual feedback)
    setTimeout(() => {
        document.body.style.animation = 'screenShake 0.3s ease-in-out';
    }, 3000);
});

// Add scroll reveal effect for future content
window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.hero-section > *');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < window.innerHeight - elementVisible) {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
        }
    });
});

// ===== Configuration - ค่าคงที่สำหรับการตั้งค่าระบบ =====
const CONFIG = {
    LAT: 14.7937,  // เขาวงพระจันทร์ - พิกัดละติจูดของพื้นที่ติดตาม
    LON: 100.9088, // พิกัดลองจิจูดของพื้นที่ติดตาม
    API_URL: 'https://api.open-meteo.com/v1/forecast', // API สำหรับดึงข้อมูลสภาพอากาศ
    UPDATE_INTERVAL: 10 * 60 * 1000, // 10 minutes - ช่วงเวลาอัปเดตข้อมูลอัตโนมัติ (มิลลิวินาที)
    CHART_HISTORY: 24 // 24 hours - จำนวนชั่วโมงที่เก็บประวัติข้อมูลในกราฟ
};

// ===== ตัวแปรสำหรับเก็บข้อมูลระบบ =====
// Global variables - ตัวแปรส่วนกลางสำหรับจัดเก็บข้อมูล
let riskChart = null;           // ออบเจ็กต์กราฟแสดงความเสี่ยง
let riskHistory = [];           // อาร์เรย์เก็บประวัติความเสี่ยงไฟป่า
let currentWeather = null;      // ข้อมูลสภาพอากาศปัจจุบัน
let riskThreshold = 60;         // เกณฑ์แจ้งเตือนความเสี่ยง (เปอร์เซ็นต์)

// ===== การอ้างอิง DOM Elements =====
// DOM Elements - การเชื่อมโยงกับองค์ประกอบ HTML
const elements = {
    // ข้อมูลสภาพอากาศ
    windSpeed: document.getElementById('windSpeed'),         // ความเร็วลม
    windDirection: document.getElementById('windDirection'), // ทิศทางลม
    temperature: document.getElementById('temperature'),     // อุณหภูมิ
    humidity: document.getElementById('humidity'),           // ความชื้น
    pressure: document.getElementById('pressure'),           // ความกดอากาศ
    feelsLike: document.getElementById('feelsLike'),         // อุณหภูมิที่รู้สึก
    compassArrow: document.getElementById('compassArrow'),   // ลูกศรแสดงทิศลม

    // ข้อมูลความเสี่ยงไฟป่า
    fireRiskLevel: document.getElementById('fireRiskLevel'),     // ระดับความเสี่ยง
    fireRiskText: document.getElementById('fireRiskText'),       // ข้อความระดับเสี่ยง
    fireRiskDetails: document.getElementById('fireRiskDetails'), // รายละเอียดการคำนวณ
    fireRiskIndex: document.getElementById('fireRiskIndex'),     // ดัชนีความเสี่ยง

    // การแพร่กระจายไฟ
    fireSpreadRate: document.getElementById('fireSpreadRate'),   // อัตราการแพร่กระจาย
    fireSpreadArrow: document.getElementById('fireSpreadArrow'), // ลูกศรแสดงทิศการแพร่
    spreadDirection: document.getElementById('spreadDirection'), // ทิศทางการแพร่กระจาย
    spreadDistance: document.getElementById('spreadDistance'),   // ระยะการแพร่กระจาย

    // คำแนะนำและการแจ้งเตือน
    recommendations: document.getElementById('recommendations'), // พื้นที่แสดงคำแนะนำ
    lastUpdate: document.getElementById('lastUpdate'),           // เวลาอัปเดตล่าสุด
    loading: document.getElementById('loading'),                 // หน้าจอโหลด
    updateBtn: document.getElementById('updateBtn'),             // ปุ่มอัปเดตข้อมูล
    riskAlert: document.getElementById('riskAlert'),             // ตั้งค่าการแจ้งเตือน
    riskAlertValue: document.getElementById('riskAlertValue'),   // ค่าการแจ้งเตือน
    notifications: document.getElementById('notifications')      // พื้นที่แสดงการแจ้งเตือน
};

// ฟังก์ชันทดสอบระบบใหม่
function testAdvancedSystems() {
    console.log('=== ทดสอบระบบ FWI และ Simplified ===');

    // ข้อมูลทดสอบ
    const testCases = [
        { name: 'สภาพปกติ', weather: { temperature_2m: 28, relative_humidity_2m: 65, wind_speed_10m: 5 } },
        { name: 'สภาพแห้งร้อน', weather: { temperature_2m: 35, relative_humidity_2m: 25, wind_speed_10m: 15 } },
        { name: 'สภาพอันตราย', weather: { temperature_2m: 40, relative_humidity_2m: 15, wind_speed_10m: 25 } },
        { name: 'สภาพเย็นชื้น', weather: { temperature_2m: 22, relative_humidity_2m: 80, wind_speed_10m: 3 } }
    ];

    testCases.forEach(testCase => {
        console.log(`\n--- ${testCase.name} ---`);
        const result = calculateFireRiskAdvanced(testCase.weather, { useSystem: 'both' });
        console.log(`ผลลัพธ์รวม: ${result.index}% (${result.text})`);
        console.log(`รายละเอียด: ${result.details}`);
    });
}

// ===== การวิเคราะห์ทิศทางลม =====
// Wind direction analysis for fire management - วิเคราะห์ทิศทางลมสำหรับการจัดการไฟป่า
function analyzeWindDirection(windDirection, windSpeed) {
    // กำหนดทิศทางทั้ง 8 ทิศหลัก พร้อมชื่อภาษาไทยและมุม
    const directions = {
        0: { name: 'เหนือ', thai: 'N', angle: 0 },
        45: { name: 'ตะวันออกเฉียงเหนือ', thai: 'NE', angle: 45 },
        90: { name: 'ตะวันออก', thai: 'E', angle: 90 },
        135: { name: 'ตะวันออกเฉียงใต้', thai: 'SE', angle: 135 },
        180: { name: 'ใต้', thai: 'S', angle: 180 },
        225: { name: 'ตะวันตกเฉียงใต้', thai: 'SW', angle: 225 },
        270: { name: 'ตะวันตก', thai: 'W', angle: 270 },
        315: { name: 'ตะวันตกเฉียงเหนือ', thai: 'NW', angle: 315 }
    };

    // หาทิศทางที่ใกล้เคียงที่สุดกับทิศทางลมจริง
    let closestDir = 0;
    let minDiff = 360; // ความแตกต่างน้อยสุด

    for (let dir in directions) {
        let diff = Math.abs(windDirection - dir);
        // จัดการกรณีที่ข้ามจุด 0/360 องศา (เหนือจริง)
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
            minDiff = diff;
            closestDir = dir;
        }
    }

    return directions[closestDir]; // ส่งกลับข้อมูลทิศทางที่ใกล้เคียงที่สุด
}

// ===== การทำนายการแพร่กระจายไฟ =====
// Fire spread prediction based on wind - ทำนายการแพร่กระจายไฟตามลม
function predictFireSpread(windDirection, windSpeed, riskIndex) {
    // คำนวณระยะการแพร่กระจายต่อชั่วโมง (เมตร)
    let baseSpread = 50;                                    // การแพร่กระจายพื้นฐานในสภาพลมสงบ
    let windMultiplier = Math.min(5, windSpeed / 10);       // ผลกระทบจากลม (สูงสุด 5 เท่า)
    let riskMultiplier = riskIndex / 100;                   // ผลกระทบจากความเสี่ยง

    // คำนวณระยะการแพร่กระจายรวม
    let spreadDistance = Math.round(baseSpread * (1 + windMultiplier) * (1 + riskMultiplier));

    // ไฟจะแพร่กระจายในทิศทางตรงข้ามกับทิศทางลม
    let spreadDirection = (windDirection + 180) % 360; // หมุน 180 องศา

    return {
        distance: spreadDistance,    // ระยะการแพร่กระจาย
        direction: spreadDirection,  // ทิศทางการแพร่กระจาย
        directionName: analyzeWindDirection(spreadDirection, windSpeed).name // ชื่อทิศทาง
    };
}

// ===== การสร้างคำแนะนำการจัดการไฟป่า =====
// Generate fire management recommendations - สร้างคำแนะนำสำหรับการจัดการไฟป่า
function generateRecommendations(weather, riskData, windData) {
    const recommendations = [];      // อาร์เรย์เก็บคำแนะนำ
    const windSpeed = weather.wind_speed_10m;  // ความเร็วลม
    const riskIndex = riskData.index;          // ดัชนีความเสี่ยง
    const windDir = windData.name;             // ชื่อทิศทางลม

    // ===== คำแนะนำความสำคัญสูง =====
    // คำแนะนำสำหรับความเสี่ยงสูงมาก (>70%)
    if (riskIndex > 70) {
        recommendations.push({
            priority: 'high',
            icon: '🚨',
            title: 'เตรียมอพยพ',
            desc: `ความเสี่ยงสูงมาก เตรียมอพยพพื้นที่ทาง ${windDir} ที่ลมพัดไป`
        });

        recommendations.push({
            priority: 'high',
            icon: '🚁',
            title: 'หน่วยดับเพลิงเข้าประจำการ',
            desc: 'ติดต่อหน่วยดับเพลิงทางอากาศเพื่อเตรียมพร้อม'
        });
    }

    // คำแนะนำสำหรับลมแรง (>15 km/h)
    if (windSpeed > 15) {
        recommendations.push({
            priority: 'high',
            icon: '💨',
            title: 'ลมแรง',
            desc: `ลม ${windSpeed} km/h จะทำให้ไฟลุกลามเร็ว หลีกเลี่ยงการดับไฟแนวขวาง`
        });
    }

    // คำแนะนำสร้างแนวกันไฟ
    if (riskIndex > 50) {
        recommendations.push({
            priority: 'high',
            icon: '🛡️',
            title: 'สร้างแนวกันไฟ',
            desc: `สร้างแนวกันไฟทางด้าน${windDir} ให้ห่างจากแหล่งไฟ 100-200 เมตร`
        });
    }

    // ===== คำแนะนำความสำคัญปานกลาง =====
    // การจัดตำแหน่งทีมตามทิศลม
    recommendations.push({
        priority: 'medium',
        icon: '👥',
        title: 'การจัดตำแหน่งทีมดับเพลิง',
        desc: `วางทีมดับเพลิงทางด้านข้างของทิศทางลม หลีกเลี่ยงการยืนหน้าลม`
    });

    // คำแนะนำอุปกรณ์สำหรับลมแรง
    if (windSpeed > 20) {
        recommendations.push({
            priority: 'medium',
            icon: '🚛',
            title: 'ใช้รถดับเพลิงหนัก',
            desc: 'ลมแรงต้องใช้รถดับเพลิงขนาดใหญ่'
        });
    }

    // การเตรียมแหล่งน้ำ
    recommendations.push({
        priority: 'medium',
        icon: '💧',
        title: 'เตรียมแหล่งน้ำ',
        desc: 'ตรวจสอบแหล่งน้ำใกล้เคียง เตรียมถังน้ำสำรอง'
    });

    // ===== คำแนะนำความปลอดภัย =====
    // เส้นทางหนีฉุกเฉินสำหรับความเสี่ยงสูง
    if (riskIndex > 60) {
        recommendations.push({
            priority: 'high',
            icon: '⚠️',
            title: 'ตรวจสอบเส้นทางหนี',
            desc: 'เตรียมเส้นทางหนีฉุกเฉิน 2-3 ทาง หลีกเลี่ยงทิศทางลม'
        });
    }

    // การติดตามสภาพอากาศ
    recommendations.push({
        priority: 'low',
        icon: '🌡️',
        title: 'ติดตามสภาพอากาศ',
        desc: 'เฝ้าระวังการเปลี่ยนแปลงทิศทางลมและความเร็วลม'
    });

    return recommendations; // ส่งกลับรายการคำแนะนำทั้งหมด
}

// ===== การอัปเดตการแสดงผล =====
// Update fire spread visualization - อัปเดตการแสดงภาพการแพร่กระจายไฟ
function updateFireSpreadVisual(windDirection, spreadData) {
    const fireSpreadArrow = elements.fireSpreadArrow;  // ลูกศรแสดงการแพร่กระจาย
    const spreadDirection = spreadData.direction;      // ทิศทางการแพร่กระจาย

    // หมุนลูกศรไปยังทิศทางการแพร่กระจาย
    if (fireSpreadArrow) {
        fireSpreadArrow.style.transform = `translate(-50%, -100%) rotate(${spreadDirection}deg)`;
    }

    // อัปเดตข้อมูลการแพร่กระจายในหน้าจอ
    if (elements.spreadDirection) elements.spreadDirection.textContent = spreadData.directionName; // ชื่อทิศทาง
    if (elements.spreadDistance) elements.spreadDistance.textContent = spreadData.distance;       // ระยะทาง
}

// Update recommendations display - อัปเดตการแสดงคำแนะนำ
function updateRecommendations(recommendations) {
    const container = elements.recommendations; // พื้นที่แสดงคำแนะนำ
    if (!container) return;

    container.innerHTML = ''; // ล้างข้อมูลเก่า

    // สร้างและแสดงคำแนะนำแต่ละรายการ
    recommendations.forEach(rec => {
        const item = document.createElement('div');
        item.className = `recommendation-item priority-${rec.priority}`; // กำหนด CSS class ตามความสำคัญ
        item.innerHTML = `
            <div class="recommendation-icon">${rec.icon}</div>
            <div class="recommendation-text">
                <div class="recommendation-title">${rec.title}</div>
                <div class="recommendation-desc">${rec.desc}</div>
            </div>
        `;
        container.appendChild(item); // เพิ่มในหน้าจอ
    });
}

// ===== การดึงข้อมูลสภาพอากาศ =====
// Main weather data fetching function - ฟังก์ชันหลักสำหรับดึงข้อมูลสภาพอากาศ
async function fetchWeatherData() {
    try {
        // แสดงสถานะกำลังโหลด
        showLoading(true);
        if (elements.updateBtn) {
            elements.updateBtn.disabled = true;  // ปิดใช้งานปุ่มอัปเดต
            elements.updateBtn.textContent = '🔄 กำลังอัปเดต...';
        }

        // สร้าง URL สำหรับ API
        const url = `${CONFIG.API_URL}?latitude=${CONFIG.LAT}&longitude=${CONFIG.LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m&timezone=Asia/Bangkok`;

        // ดึงข้อมูลจาก API
        const response = await fetch(url);
        const data = await response.json();

        currentWeather = data.current; // เก็บข้อมูลสภาพอากาศปัจจุบัน

        // อัปเดตการแสดงผลข้อมูลสภาพอากาศ
        updateWeatherDisplay(currentWeather);

        // คำนวณและแสดงความเสี่ยงไฟป่าด้วยระบบ FWI
        const riskData = calculateFireRisk(currentWeather);
        updateFireRiskDisplay(riskData);

        // วิเคราะห์และแสดงทิศทางลม
        const windData = analyzeWindDirection(currentWeather.wind_direction_10m, currentWeather.wind_speed_10m);
        updateWindDisplay(windData);

        // ทำนายและแสดงการแพร่กระจายไฟ
        const spreadData = predictFireSpread(currentWeather.wind_direction_10m, currentWeather.wind_speed_10m, riskData.index);
        updateFireSpreadVisual(currentWeather.wind_direction_10m, spreadData);

        // สร้างและแสดงคำแนะนำ
        const recommendations = generateRecommendations(currentWeather, riskData, windData);
        updateRecommendations(recommendations);

        // อัปเดตกราฟความเสี่ยง
        updateRiskChart(riskData.index);

        // ตรวจสอบและแสดงการแจ้งเตือน
        checkRiskAlert(riskData.index);

        // อัปเดตเวลาล่าสุด
        if (elements.lastUpdate) elements.lastUpdate.textContent = `อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH')}`;

        // แสดงข้อความสำเร็จ
        showNotification('อัปเดตข้อมูลสำเร็จ', 'success');

    } catch (error) {
        // จัดการข้อผิดพลาด
        console.error('Error fetching weather data:', error);
        showNotification('ไม่สามารถอัปเดตข้อมูลได้', 'danger');
    } finally {
        // คืนสถานะปุ่มและซ่อนการโหลด
        showLoading(false);
        if (elements.updateBtn) {
            elements.updateBtn.disabled = false;
            elements.updateBtn.textContent = '🔄 อัปเดตข้อมูล';
        }
    }
}

// ===== ฟังก์ชันอัปเดตการแสดงผล =====
// Update weather display - อัปเดตการแสดงข้อมูลสภาพอากาศ
function updateWeatherDisplay(weather) {
    if (elements.temperature) elements.temperature.textContent = Math.round(weather.temperature_2m);        // อุณหภูมิ
    if (elements.humidity) elements.humidity.textContent = Math.round(weather.relative_humidity_2m);     // ความชื้น
    if (elements.pressure) elements.pressure.textContent = Math.round(weather.pressure_msl);            // ความกดอากาศ
    if (elements.feelsLike) elements.feelsLike.textContent = Math.round(weather.apparent_temperature);   // อุณหภูมิที่รู้สึก
    if (elements.windSpeed) elements.windSpeed.textContent = Math.round(weather.wind_speed_10m);         // ความเร็วลม
    if (elements.windDirection) elements.windDirection.textContent = Math.round(weather.wind_direction_10m); // ทิศทางลม (องศา)
}

// Update fire risk display - อัปเดตการแสดงข้อมูลความเสี่ยงไฟป่า
function updateFireRiskDisplay(riskData) {
    const riskElement = elements.fireRiskLevel;              // องค์ประกอบแสดงระดับเสี่ยง
    if (riskElement) riskElement.className = `fire-risk ${riskData.level}`;   // เปลี่ยน CSS class ตามระดับเสี่ยง
    if (elements.fireRiskText) elements.fireRiskText.textContent = riskData.text;       // ข้อความระดับเสี่ยง
    if (elements.fireRiskDetails) elements.fireRiskDetails.textContent = riskData.details; // รายละเอียดการคำนวณ
    if (elements.fireRiskIndex) elements.fireRiskIndex.textContent = riskData.index;     // ดัชนีความเสี่ยง (0-100)
    if (elements.fireSpreadRate) elements.fireSpreadRate.textContent = riskData.spreadRate; // อัตราการแพร่กระจาย (เมตร/นาที)
}

// Update wind display - อัปเดตการแสดงทิศทางลม
function updateWindDisplay(windData) {
    const arrow = elements.compassArrow; // ลูกศรเข็มทิศ
    if (arrow) {
        // หมุนลูกศรไปยังทิศทางลม
        arrow.style.transform = `translate(-50%, -100%) rotate(${windData.angle}deg)`;
    }
}

// ===== การจัดการกราฟและประวัติข้อมูล =====
// Update risk chart - อัปเดตกราฟแสดงความเสี่ยง
function updateRiskChart(riskIndex) {
    const now = new Date(); // เวลาปัจจุบัน

    // เพิ่มข้อมูลใหม่ในประวัติ
    riskHistory.push({
        time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), // เวลา (ชม:นาที)
        risk: riskIndex // ดัชนีความเสี่ยง
    });

    // เก็บข้อมูลเฉพาะ 24 ชั่วโมงล่าสุด
    if (riskHistory.length > CONFIG.CHART_HISTORY) {
        riskHistory.shift(); // ลบข้อมูลเก่าสุด
    }

    // อัปเดตกราฟถ้ามีอยู่แล้ว หรือสร้างใหม่
    if (riskChart) {
        riskChart.data.labels = riskHistory.map(h => h.time);    // อัปเดตเวลา
        riskChart.data.datasets[0].data = riskHistory.map(h => h.risk); // อัปเดตข้อมูลความเสี่ยง
        riskChart.update(); // รีเฟรชกราฟ
    } else {
        initializeChart(); // สร้างกราฟใหม่
    }
}

// Initialize chart - สร้างกราฟความเสี่ยงไฟป่า
function initializeChart() {
    const chartElement = document.getElementById('riskChart');
    if (!chartElement) return;

    const ctx = chartElement.getContext('2d'); // ดึง canvas context
    riskChart = new Chart(ctx, {
        type: 'line', // กราฟเส้น
        data: {
            labels: riskHistory.map(h => h.time),    // แกน X: เวลา
            datasets: [{
                label: 'ความเสี่ยงไฟป่า',           // ชื่อชุดข้อมูล
                data: riskHistory.map(h => h.risk),  // แกน Y: ความเสี่ยง
                borderColor: '#ff6b6b',              // สีเส้น (แดง)
                backgroundColor: 'rgba(255, 107, 107, 0.1)', // สีพื้นหลัง (แดงอ่อน)
                borderWidth: 3,                      // ความหนาเส้น
                fill: true,                          // เติมสีใต้เส้น
                tension: 0.4                         // ความโค้งของเส้น
            }]
        },
        options: {
            responsive: true,            // ปรับขนาดตามหน้าจอ
            maintainAspectRatio: false, // ไม่คงสัดส่วน
            plugins: {
                legend: {
                    labels: {
                        color: 'black'   // สีข้อความ legend
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,   // เริ่มจาก 0
                    max: 100,            // สูงสุด 100
                    ticks: {
                        color: 'black'   // สีตัวเลขแกน Y
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // สีเส้นกริดแกน Y
                    }
                },
                x: {
                    ticks: {
                        color: 'black'   // สีตัวเลขแกน X
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // สีเส้นกริดแกน X
                    }
                }
            }
        }
    });
}

// ===== การแจ้งเตือนและการแสดงผล =====
// Check risk alert - ตรวจสอบและแจ้งเตือนความเสี่ยงสูง
function checkRiskAlert(riskIndex) {
    // ถ้าความเสี่ยงเกินเกณฑ์ที่กำหนด
    if (riskIndex >= riskThreshold) {
        showNotification(`⚠️ ความเสี่ยงไฟป่าสูง: ${riskIndex}%`, 'warning');
    }
}

// Show notification - แสดงการแจ้งเตือน
function showNotification(message, type = 'info') {
    if (!elements.notifications) return;

    const notification = document.createElement('div');      // สร้างองค์ประกอบแจ้งเตือน
    notification.className = `notification ${type}`;        // กำหนด CSS class ตามประเภท
    notification.textContent = message;                     // ข้อความแจ้งเตือน

    elements.notifications.appendChild(notification);       // เพิ่มในพื้นที่แจ้งเตือน

    // แสดงการแจ้งเตือนด้วย animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // ซ่อนการแจ้งเตือนหลัง 5 วินาที
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (elements.notifications && elements.notifications.contains(notification)) {
                elements.notifications.removeChild(notification); // ลบออกจาก DOM
            }
        }, 300);
    }, 5000);
}

// Show/hide loading - แสดง/ซ่อนสถานะกำลังโหลด
function showLoading(show) {
    if (elements.loading) {
        elements.loading.classList.toggle('show', show); // เปิด/ปิด CSS class 'show'
    }
}

// ===== การนำทางระหว่างหน้า =====
// Navigation functions - ฟังก์ชันการนำทาง
function showApp() {
    // แสดงหน้าแอปพลิเคชัน
    const landingPage = document.getElementById('landingPage');
    const app = document.getElementById('app');

    if (landingPage) landingPage.style.display = 'none';  // ซ่อนหน้าแรก
    if (app) app.classList.add('active');         // แสดงแอป
    fetchWeatherData(); // ดึงข้อมูลสภาพอากาศ
}

function showLanding() {
    // แสดงหน้าแรก
    const landingPage = document.getElementById('landingPage');
    const app = document.getElementById('app');

    if (landingPage) landingPage.style.display = 'flex';  // แสดงหน้าแรก
    if (app) app.classList.remove('active');      // ซ่อนแอป
}

// ===== การจัดการเหตุการณ์ =====
// Event listeners - การรับฟังเหตุการณ์
function setupEventListeners() {
    // เมื่อผู้ใช้เปลี่ยนค่าเกณฑ์การแจ้งเตือน
    if (elements.riskAlert) {
        elements.riskAlert.addEventListener('input', function () {
            riskThreshold = this.value;                                    // อัปเดตเกณฑ์
            if (elements.riskAlertValue) elements.riskAlertValue.textContent = this.value;              // แสดงค่าใหม่
        });
    }

    // เมื่อคลิกปุ่มอัปเดตข้อมูล
    if (elements.updateBtn) {
        elements.updateBtn.addEventListener('click', fetchWeatherData);
    }
}

// ===== การเริ่มต้นแอปพลิเคชัน =====
// Initialize app - เริ่มต้นแอปพลิเคชัน
document.addEventListener('DOMContentLoaded', function () {
    // เมื่อ DOM โหลดเสร็จแล้ว

    // ตั้งค่า Event Listeners
    setupEventListeners();

    // เรียกใช้ฟังก์ชันทดสอบ
    testAdvancedSystems();

    // ตั้งเวลาอัปเดตข้อมูลอัตโนมัติทุก 10 นาที
    setInterval(fetchWeatherData, CONFIG.UPDATE_INTERVAL);
});

// ===== ฟังก์ชันสำหรับการใช้งานจากภายนอก =====
// Export functions for external use
if (typeof window !== 'undefined') {
    // สำหรับใช้งานในเบราว์เซอร์
    window.FireWeatherSystem = {
        FireWeatherIndex,
        SimplifiedFireDanger,
        calculateFireRisk,
        calculateFireRiskAdvanced,
        fetchWeatherData,
        showApp,
        showLanding,
        FWI_CONFIG
    };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FireWeatherIndex,
        SimplifiedFireDanger,
        calculateFireRisk,
        calculateFireRiskAdvanced,
        FWI_CONFIG
    };
}