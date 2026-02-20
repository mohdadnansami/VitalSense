// ================= UUIDS =================
const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";

const HR_UUID     = "00001111-0000-1000-8000-00805f9b34fb";
const SPO2_UUID   = "00002222-0000-1000-8000-00805f9b34fb";
const TEMP_UUID   = "00003333-0000-1000-8000-00805f9b34fb";
const GSR_UUID    = "00004444-0000-1000-8000-00805f9b34fb";
const MOVE_UUID   = "00005555-0000-1000-8000-00805f9b34fb";
const STRESS_UUID = "00006666-0000-1000-8000-00805f9b34fb";

let hrChart, spo2Chart, tempChart;
let demoTimer = null;


// ================= INIT AFTER PAGE LOAD =================
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("demoBtn")?.addEventListener("click", startDemo);
    document.getElementById("bleBtn")?.addEventListener("click", connectBLE);

    if (typeof Chart === "undefined") {
        console.warn("Chart.js missing");
        return;
    }

    hrChart   = createChart("hrChart", "Heart Rate (BPM)");
    spo2Chart = createChart("spo2Chart", "SpO2 (%)");
    tempChart = createChart("tempChart", "Temperature (°C)");
});


// ================= BLE CONNECTION =================
async function connectBLE() {
    try {
        setStatus("Connecting...");

        if (!navigator.bluetooth) {
            alert("Bluetooth not supported in this browser.");
            return;
        }

        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "VitalSense-ESP32C3" }],
            optionalServices: [SERVICE_UUID]
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);

        await enableNotify(service, HR_UUID, updateHR);
        await enableNotify(service, SPO2_UUID, updateSPO2);
        await enableNotify(service, TEMP_UUID, updateTemp);
        await enableNotify(service, GSR_UUID, updateGSR);
        await enableNotify(service, MOVE_UUID, updateMove);
        await enableNotify(service, STRESS_UUID, updateStress);

        device.addEventListener("gattserverdisconnected", () => {
            setStatus("Disconnected");
        });

        setStatus("BLE Connected");

    } catch (error) {
        console.error(error);
        alert("Bluetooth Error: " + error.message);
        setStatus("Connection Failed");
    }
}


// ================= ENABLE NOTIFICATION =================
async function enableNotify(service, uuid, callback) {
    const characteristic = await service.getCharacteristic(uuid);
    await characteristic.startNotifications();

    characteristic.addEventListener("characteristicvaluechanged", e => {

        let val;

        try {
            // Try text decoding first
            val = new TextDecoder().decode(e.target.value).trim();

            if (!val) throw "empty";

        } catch {
            // fallback numeric
            val = e.target.value.getUint8(0);
        }

        callback(val);
    });
}


// ================= UPDATE FUNCTIONS =================
function updateHR(value) {
    setText("hr-value", value);
    push(hrChart, parseFloat(value));
    calcRisk();
}

function updateSPO2(value) {
    setText("spo2-value", value);
    push(spo2Chart, parseFloat(value));
    calcRisk();
}

function updateTemp(value) {
    setText("temp-value", value);
    push(tempChart, parseFloat(value));
    calcRisk();
}

function updateGSR(value) {
    setText("gsr-value", value);
}

function updateMove(value) {
    setText("movement-value", value == "1" ? "Moving" : "Still");
}

function updateStress(value) {
    setText("stress-level", value);
}


// ================= SAFE TEXT SETTER =================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}


// ================= STATUS =================
function setStatus(text) {
    setText("status-text", text);
    setText("status-time", new Date().toLocaleTimeString());
}


// ================= RISK CALCULATION =================
function calcRisk() {

    const hr   = parseFloat(getText("hr-value"))   || 0;
    const spo2 = parseFloat(getText("spo2-value")) || 0;
    const temp = parseFloat(getText("temp-value")) || 0;

    let risk = 0;

    if (hr < 50 || hr > 120) risk++;
    if (spo2 && spo2 < 94) risk++;
    if (temp > 38) risk++;

    setText("risk-score", risk);

    let state = "Normal";
    if (risk === 1) state = "Warning";
    if (risk >= 2) state = "Critical";

    setStatus(state);
}

function getText(id) {
    return document.getElementById(id)?.innerText || "";
}


// ================= CHART CREATION =================
function createChart(canvasId, label) {

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label,
                data: [],
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            animation: false,
            responsive: true,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}


// ================= PUSH DATA INTO CHART =================
function push(chart, value) {

    if (!chart || isNaN(value)) return;

    chart.data.labels.push("");
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > 25) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}


// ================= DEMO MODE =================
function startDemo() {

    // If demo already running → STOP it
    if (demoTimer) {
        clearInterval(demoTimer);
        demoTimer = null;
        setStatus("Demo Stopped");
        return;
    }

    // Otherwise start demo
    setStatus("Demo Mode");

    demoTimer = setInterval(() => {

        updateHR(rand(65, 95));
        updateSPO2(rand(96, 100));
        updateTemp(rand(36, 37));
        updateGSR(rand(300, 600));
        updateMove(rand(0, 1));
        updateStress("NORMAL");

    }, 1000);
}

// ================= RANDOM =================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}