// ===== การตั้งค่าระบบ =====

        // Create floating particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particlesContainer.appendChild(particle);
            }
        }

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
            
            button.addEventListener('click', function(e) {
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

        // Configuration - ค่าคงที่สำหรับการตั้งค่าระบบ
        const CONFIG = {
            LAT: 14.7937,  // เขาวงพระจันทร์ - พิกัดละติจูดของพื้นที่ติดตาม
            LON: 100.9088, // พิกัดลองจิจูดของพื้นที่ติดตาม
            API_URL: 'https://api.open-meteo.com/v1/forecast', // API สำหรับดึงข้อมูลสภาพอากาศ
            UPDATE_INTERVAL: 10 * 60 * 1000, // 10 minutes - ช่วงเวลาอัปเดตข้อมูลอัตโนมัติ (มิลลิวินาที)
            CHART_HISTORY: 24 // 24 hours - จำนวนชั่วโมงที่เก็บประวัติข้อมูลในกราф
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

        // ===== ฟังก์ชันการคำนวณความเสี่ยงไฟป่า =====
        // Fire Risk Assessment Functions - ฟังก์ชันประเมินความเสี่ยงไฟป่า
        function calculateFireRisk(weather) {
            // ดึงค่าสภาพอากาศที่จำเป็น
            const temp = weather.temperature_2m;        // อุณหภูมิ (°C)
            const humidity = weather.relative_humidity_2m; // ความชื้นสัมพัทธ์ (%)
            const windSpeed = weather.wind_speed_10m;    // ความเร็วลม (km/h)
            
            // ===== การคำนวณคะแนนความเสี่ยงแต่ละปัจจัย =====
            
            // Temperature Risk (0-30 คะแนน) - คะแนนจากอุณหภูมิ
            let tempScore = 0;
            if (temp > 30) {
                // อุณหภูมิสูงกว่า 30°C จะเพิ่มความเสี่ยง แต่ละองศาเพิ่ม 2 คะแนน
                tempScore = Math.min(30, (temp - 30) * 2);
            }
            
            // Humidity Risk (0-40 คะแนน) - คะแนนจากความชื้น
            let humidityScore = 0;
            if (humidity < 60) {
                // ความชื้นต่ำกว่า 60% จะเพิ่มความเสี่ยง แต่ละเปอร์เซ็นต์ลดลงเพิ่ม 0.8 คะแนน
                humidityScore = Math.min(40, (60 - humidity) * 0.8);
            }
            
            // Wind Risk (0-25 คะแนน) - คะแนนจากความเร็วลม
            // ลมแรงจะทำให้ไฟแพร่กระจายเร็วขึ้น แต่ละ km/h เพิ่ม 1.5 คะแนน
            let windScore = Math.min(25, windSpeed * 1.5);
            
            // Combined Risk Factor (0-5 คะแนน) - ปัจจัยรวมสำหรับสภาพอากาศรุนแรง
            let combinedRisk = 0;
            if (temp > 35 && humidity < 30) {
                combinedRisk = 5; // สภาพอากาศแห้งร้อนมาก - เสี่ยงสูงสุด
            } else if (temp > 32 && humidity < 40) {
                combinedRisk = 3; // สภาพอากาศแห้งร้อน - เสี่ยงปานกลาง
            }
            
            // คำนวณความเสี่ยงรวม (0-100) - รวมคะแนนทุกปัจจัย
            let riskIndex = tempScore + humidityScore + windScore + combinedRisk;
            
            // จำกัดค่าสูงสุดที่ 100 เปอร์เซ็นต์
            riskIndex = Math.min(100, riskIndex);
            
            // ===== กำหนดระดับความเสี่ยงตามคะแนน =====
            let riskLevel, riskColor, riskText;
            if (riskIndex < 20) {
                riskLevel = 'low';           // ความเสี่ยงต่ำ
                riskColor = '#2ecc71';       // สีเขียว
                riskText = 'ความเสี่ยงต่ำ';
            } else if (riskIndex < 40) {
                riskLevel = 'medium';        // ความเสี่ยงปานกลาง
                riskColor = '#f1c40f';       // สีเหลือง
                riskText = 'ความเสี่ยงปานกลาง';
            } else if (riskIndex < 70) {
                riskLevel = 'high';          // ความเสี่ยงสูง
                riskColor = '#e74c3c';       // สีแดง
                riskText = 'ความเสี่ยงสูง';
            } else {
                riskLevel = 'extreme';       // ความเสี่ยงอันตรายมาก
                riskColor = '#c0392b';       // สีแดงเข้ม
                riskText = 'ความเสี่ยงอันตรายมาก';
            }
            
            // คำนวณอัตราการแพร่กระจายไฟ (เมตร/นาที)
            // อัตราขึ้นอยู่กับความเร็วลมและดัชนีความเสี่ยง
            let spreadRate = Math.round((windSpeed * 0.3) + (riskIndex * 0.05));
            
            // ส่งกลับผลลัพธ์การประเมิน
            return {
                index: Math.round(riskIndex),    // ดัชนีความเสี่ยง
                level: riskLevel,                // ระดับความเสี่ยง
                color: riskColor,                // สีแสดงความเสี่ยง
                text: riskText,                  // ข้อความอธิบาย
                spreadRate: spreadRate,          // อัตราการแพร่กระจาย
                details: `อุณหภูมิ: ${temp}°C (${tempScore}pt), ความชื้น: ${humidity}% (${humidityScore}pt), ลม: ${windSpeed}km/h (${windScore}pt)`,
                breakdown: {                     // การแยกคะแนนแต่ละปัจจัย
                    temperature: tempScore,
                    humidity: humidityScore,
                    wind: windScore,
                    combined: combinedRisk
                }
            };
        }

        // ===== ฟังก์ชันทดสอบระบบ =====
        // ฟังก์ชันทดสอบกับข้อมูลตัวอย่าง - ใช้สำหรับ debug และตรวจสอบการทำงาน
        function testFireRisk() {
            console.log('=== ทดสอบการคำนวณความเสี่ยงไฟป่า ===');
            
            // ทดสอบสภาพอากาศปกติ
            const normal = { temperature_2m: 28, relative_humidity_2m: 65, wind_speed_10m: 5 };
            console.log('สภาพปกติ:', calculateFireRisk(normal));
            
            // ทดสอบสภาพอากาศแห้งร้อน
            const dry = { temperature_2m: 35, relative_humidity_2m: 25, wind_speed_10m: 15 };
            console.log('สภาพแห้งร้อน:', calculateFireRisk(dry));
            
            // ทดสอบสภาพอากาศอันตราย
            const extreme = { temperature_2m: 40, relative_humidity_2m: 15, wind_speed_10m: 25 };
            console.log('สภาพอันตราย:', calculateFireRisk(extreme));
            
            // ทดสอบสภาพอากาศเย็นชื้น
            const cool = { temperature_2m: 22, relative_humidity_2m: 80, wind_speed_10m: 3 };
            console.log('สภาพเย็นชื้น:', calculateFireRisk(cool));
        }

        // เรียกใช้ฟังก์ชันทดสอบเมื่อโหลดโค้ด
        testFireRisk();

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
                    title: 'เตรียมพร้อมอพยพ',
                    desc: `ความเสี่ยงสูงมาก เตรียมอพยพพื้นที่ทาง${windDir} ที่ลมพัดไป`
                });
                
                recommendations.push({
                    priority: 'high',
                    icon: '🚁',
                    title: 'เรียกเฮลิคอปเตอร์',
                    desc: 'ติดต่อหน่วยดับเพลิงทางอากาศเพื่อเตรียมพร้อม'
                });
            }
            
            // คำแนะนำสำหรับลมแรง (>15 km/h)
            if (windSpeed > 15) {
                recommendations.push({
                    priority: 'high',
                    icon: '💨',
                    title: 'ระวังลมแรง',
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
                title: 'จัดตำแหน่งทีม',
                desc: `วางทีมดับเพลิงทางด้านข้างของทิศทางลม หลีกเลี่ยงการยืนหน้าลม`
            });
            
            // คำแนะนำอุปกรณ์สำหรับลมแรง
            if (windSpeed > 20) {
                recommendations.push({
                    priority: 'medium',
                    icon: '🚛',
                    title: 'ใช้รถดับเพลิงหนัก',
                    desc: 'ลมแรงต้องใช้รถดับเพลิงขนาดใหญ่ หลีกเลี่ยงการพ่นน้ำแรงงาน'
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
            fireSpreadArrow.style.transform = `translate(-50%, -100%) rotate(${spreadDirection}deg)`;
            
            // อัปเดตข้อมูลการแพร่กระจายในหน้าจอ
            elements.spreadDirection.textContent = spreadData.directionName; // ชื่อทิศทาง
            elements.spreadDistance.textContent = spreadData.distance;       // ระยะทาง
        }

        // Update recommendations display - อัปเดตการแสดงคำแนะนำ
        function updateRecommendations(recommendations) {
            const container = elements.recommendations; // พื้นที่แสดงคำแนะนำ
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
                elements.updateBtn.disabled = true;  // ปิดใช้งานปุ่มอัปเดต
                elements.updateBtn.textContent = '🔄 กำลังอัปเดต...';
                
                // สร้าง URL สำหรับ API
                const url = `${CONFIG.API_URL}?latitude=${CONFIG.LAT}&longitude=${CONFIG.LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m&timezone=Asia/Bangkok`;
                
                // ดึงข้อมูลจาก API
                const response = await fetch(url);
                const data = await response.json();
                
                currentWeather = data.current; // เก็บข้อมูลสภาพอากาศปัจจุบัน
                
                // อัปเดตการแสดงผลข้อมูลสภาพอากาศ
                updateWeatherDisplay(currentWeather);
                
                // คำนวณและแสดงความเสี่ยงไฟป่า
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
                elements.lastUpdate.textContent = `อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH')}`;
                
                // แสดงข้อความสำเร็จ
                showNotification('อัปเดตข้อมูลสำเร็จ', 'success');
                
            } catch (error) {
                // จัดการข้อผิดพลาด
                console.error('Error fetching weather data:', error);
                showNotification('ไม่สามารถอัปเดตข้อมูลได้', 'danger');
            } finally {
                // คืนสถานะปุ่มและซ่อนการโหลด
                showLoading(false);
                elements.updateBtn.disabled = false;
                elements.updateBtn.textContent = '🔄 อัปเดตข้อมูล';
            }
        }

        // ===== ฟังก์ชันอัปเดตการแสดงผล =====
        // Update weather display - อัปเดตการแสดงข้อมูลสภาพอากาศ
        function updateWeatherDisplay(weather) {
            elements.temperature.textContent = Math.round(weather.temperature_2m);        // อุณหภูมิ
            elements.humidity.textContent = Math.round(weather.relative_humidity_2m);     // ความชื้น
            elements.pressure.textContent = Math.round(weather.pressure_msl);            // ความกดอากาศ
            elements.feelsLike.textContent = Math.round(weather.apparent_temperature);   // อุณหภูมิที่รู้สึก
            elements.windSpeed.textContent = Math.round(weather.wind_speed_10m);         // ความเร็วลม
            elements.windDirection.textContent = Math.round(weather.wind_direction_10m); // ทิศทางลม (องศา)
        }

        // Update fire risk display - อัปเดตการแสดงข้อมูลความเสี่ยงไฟป่า
        function updateFireRiskDisplay(riskData) {
            const riskElement = elements.fireRiskLevel;              // องค์ประกอบแสดงระดับเสี่ยง
            riskElement.className = `fire-risk ${riskData.level}`;   // เปลี่ยน CSS class ตามระดับเสี่ยง
            elements.fireRiskText.textContent = riskData.text;       // ข้อความระดับเสี่ยง
            elements.fireRiskDetails.textContent = riskData.details; // รายละเอียดการคำนวณ
            elements.fireRiskIndex.textContent = riskData.index;     // ดัชนีความเสี่ยง (0-100)
            elements.fireSpreadRate.textContent = riskData.spreadRate; // อัตราการแพร่กระจาย (เมตร/นาที)
        }

        // Update wind display - อัปเดตการแสดงทิศทางลม
        function updateWindDisplay(windData) {
            const arrow = elements.compassArrow; // ลูกศรเข็มทิศ
            // หมุนลูกศรไปยังทิศทางลม
            arrow.style.transform = `translate(-50%, -100%) rotate(${windData.angle}deg)`;
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
            const ctx = document.getElementById('riskChart').getContext('2d'); // ดึง canvas context
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
                                color: 'white'   // สีข้อความ legend
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,   // เริ่มจาก 0
                            max: 100,            // สูงสุด 100
                            ticks: {
                                color: 'white'   // สีตัวเลขแกน Y
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // สีเส้นกริดแกน Y
                            }
                        },
                        x: {
                            ticks: {
                                color: 'white'   // สีตัวเลขแกน X
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
                    elements.notifications.removeChild(notification); // ลบออกจาก DOM
                }, 300);
            }, 5000);
        }

        // Show/hide loading - แสดง/ซ่อนสถานะกำลังโหลด
        function showLoading(show) {
            elements.loading.classList.toggle('show', show); // เปิด/ปิด CSS class 'show'
        }

        // ===== การนำทางระหว่างหน้า =====
        // Navigation functions - ฟังก์ชันการนำทาง
        function showApp() {
            // แสดงหน้าแอปพลิเคชัน
            document.getElementById('landingPage').style.display = 'none';  // ซ่อนหน้าแรก
            document.getElementById('app').classList.add('active');         // แสดงแอป
            fetchWeatherData(); // ดึงข้อมูลสภาพอากาศ
        }

        function showLanding() {
            // แสดงหน้าแรก
            document.getElementById('landingPage').style.display = 'flex';  // แสดงหน้าแรก
            document.getElementById('app').classList.remove('active');      // ซ่อนแอป
        }

        // ===== การจัดการเหตุการณ์ =====
        // Event listeners - การรับฟังเหตุการณ์
        elements.riskAlert.addEventListener('input', function() {
            // เมื่อผู้ใช้เปลี่ยนค่าเกณฑ์การแจ้งเตือน
            riskThreshold = this.value;                                    // อัปเดตเกณฑ์
            elements.riskAlertValue.textContent = this.value;              // แสดงค่าใหม่
        });

        // ===== การเริ่มต้นแอปพลิเคชัน =====
        // Initialize app - เริ่มต้นแอปพลิเคชัน
        document.addEventListener('DOMContentLoaded', function() {
            // เมื่อ DOM โหลดเสร็จแล้ว
            
            // ตั้งเวลาอัปเดตข้อมูลอัตโนมัติทุก 10 นาที
            setInterval(fetchWeatherData, CONFIG.UPDATE_INTERVAL);
        });