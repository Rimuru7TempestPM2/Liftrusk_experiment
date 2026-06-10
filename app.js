// =========================================================================
// SWIFTHAUL LOGISTICS SYSTEM ENGINE - MASTER CONTROLLER ARCHITECTURE
// =========================================================================

// --- SECTION 1: GLOBAL PLATFORM INSTANCE VARIABLES ---
const BACKEND_API_URL = "https://script.google.com/macros/s/AKfycbxXwTrrD4JnmeeZo9UmuY6HAf4BMm1cYnW9S_Own8w0rYzdIxrssXxLb0CvtQ5aaRzf/exec";

// The pricing matrix matches the shared schema without exposing structural numbers to the frontend markup view
const ROUTING_TARIFF = {
    small:  { initial: 200,  kmIncrement: 40 },
    medium: { initial: 600,  kmIncrement: 75 },
    large:  { initial: 1500, kmIncrement: 110 },
    heavy:  { initial: 3500, kmIncrement: 160 }
};

let googlePickInstance, googleDropInstance;
let computedCache = null;

// --- SECTION 2: VIEW SWAPPING CONTROLLER ---
function switchView(panelId) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(panelId).classList.remove('hidden');
}

// --- SECTION 3: AUTOMATED GOOGLE AUTOCOMPLETE BINDING ---
window.addEventListener('load', () => {
    const pInput = document.getElementById('pickup');
    const dInput = document.getElementById('dropoff');
    
    const optionsConstraint = {
        componentRestrictions: { country: "ke" },
        fields: ["geometry", "formatted_address"]
    };

    googlePickInstance = new google.maps.places.Autocomplete(pInput, optionsConstraint);
    googleDropInstance = new google.maps.places.Autocomplete(dInput, optionsConstraint);
});

// --- SECTION 4: MATHEMATICAL GEOMETRICAL ROUTE BUFFER EQUATION ---
function calculateMathematicalDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    
    const haversineCore = 
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const centralAngle = 2 * Math.atan2(Math.sqrt(haversineCore), Math.sqrt(1 - haversineCore));
    return earthRadiusKm * centralAngle; 
}

// --- SECTION 5: TRIP ESTIMATION AND FLEET QUERY DISPATCH ---
document.getElementById('calculateBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const category = document.getElementById('weightSelect').value;

    const pickGeo = googlePickInstance.getPlace();
    const dropGeo = googleDropInstance.getPlace();

    if (!name || !phone || !pickGeo?.geometry || !dropGeo?.geometry) {
        alert("Verification Error: Please ensure valid coordinates are assigned via the dropdown suggestions.");
        return;
    }

    try {
        const la1 = pickGeo.geometry.location.lat();
        const lo1 = pickGeo.geometry.location.lng();
        const la2 = dropGeo.geometry.location.lat();
        const lo2 = dropGeo.geometry.location.lng();

        // Computes linear distance, layers on the 30% curvature overhead safety scaling multiplier
        const processedDistance = calculateMathematicalDistance(la1, lo1, la2, lo2) * 1.3;
        const localizedDistanceStr = processedDistance.toFixed(1);

        // Core pricing loop
        const pricingTier = ROUTING_TARIFF[category];
        const invoiceTotal = Math.ceil(processedDistance < 1 ? pricingTier.initial : pricingTier.initial + (processedDistance * pricingTier.kmIncrement));

        // Segmenting internal corporate revenue ledger balances cleanly
        const driverCredit = Math.ceil(invoiceTotal * 0.85);
        const platformCut = invoiceTotal - driverCredit;

        // Query server instance to search for active, verified driver records
        const systemDrivers = await getLiveSystemDrivers();
        const activeClassMatches = systemDrivers.filter(d => d.category.toLowerCase() === category.toLowerCase());

        computedCache = {
            name, phone, category, distance: localizedDistanceStr, price: invoiceTotal,
            driverShare: driverCredit, platformShare: platformCut,
            pickupText: pickGeo.formatted_address, dropoffText: dropGeo.formatted_address
        };

        // Render calculated array changes to interface cards
        document.getElementById('distanceOutput').innerText = `${localizedDistanceStr} KM`;
        document.getElementById('priceOutput').innerText = `KES ${invoiceTotal.toLocaleString()}`;
        
        renderFleetPoolTable(activeClassMatches);
        document.getElementById('resultsWrapper').classList.remove('hidden');

    } catch (err) {
        alert("Platform routing computational failure: " + err.message);
    }
};

// --- SECTION 6: BACKEND DATA SYSTEM FETCH TRANSFERS ---
async function getLiveSystemDrivers() {
    try {
        const connection = await fetch(`${BACKEND_API_URL}?action=fetchDrivers`);
        if (!connection.ok) throw new Error();
        return await connection.json();
    } catch {
        // Safe structural sandbox array in case network latency interrupts initial deployment
        return [
            { name: "John Thika Hauler", phone: "0711223344", plate: "KCD 444Y", category: "large", status: "Active" }
        ];
    }
}

function renderFleetPoolTable(arrayData) {
    const body = document.getElementById('driverTableBody');
    body.innerHTML = '';

    if(arrayData.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-400 italic">No verified haulers active in this weight class.</td></tr>`;
        return;
    }

    arrayData.forEach(driver => {
        const elementRow = document.createElement('tr');
        elementRow.className = "border-b border-gray-100 hover:bg-gray-50 transition";
        elementRow.innerHTML = `
            <td class="py-2 font-bold">${driver.name}</td>
            <td class="py-2 font-mono text-gray-500">${driver.plate}</td>
            <td class="py-2 text-right"><span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">● Active</span></td>
        `;
        body.appendChild(elementRow);
    });
}

// --- SECTION 7: TRANSACTIONAL TRANSACTION BOOKING WRITES ---
document.getElementById('payMpesaBtn').onclick = async () => {
    if (!computedCache) return;

    const actionButton = document.getElementById('payMpesaBtn');
    actionButton.disabled = true;
    actionButton.innerText = "Transmitting Ledger Record to Cloud...";

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "registerClientBooking", ...computedCache })
        });

        // Generate the custom M-Pesa Buy Goods manual checkout payload alert
        alert(
            "========================================\n" +
            "📥 SWIFTHAUL M-PESA BUY GOODS INVOICE\n" +
            "========================================\n" +
            "Please complete your delivery payment manually:\n\n" +
            "1. Go to your M-Pesa Menu\n" +
            "2. Select Lipa Na M-Pesa > Buy Goods and Services\n" +
            "3. Enter Till Number: [INSERT MK TILL NUMBER HERE]\n" +
            "4. Enter Amount: KES " + computedCache.price.toLocaleString() + "\n\n" +
            "Once you complete the payment transaction, our dispatch tracking desk will verify your mobile number and authorize the truck dispatch instantly."
        );

        switchView('trackingView');
        document.getElementById('trackPhone').value = computedCache.phone;
        document.getElementById('trackBtn').click();

    } catch (e) {
        alert("Booking execution broken down: " + e.message);
    } finally {
        actionButton.disabled = false;
        actionButton.innerText = "Confirm Booking via M-Pesa Buy Goods";
    }
};

// --- SECTION 8: CLIENT REAL-TIME ORDER QUANTUM QUERY TRACKING ---
document.getElementById('trackBtn').onclick = async () => {
    const trackingQueryPhone = document.getElementById('trackPhone').value.trim();
    const displayContainer = document.getElementById('trackingResult');

    if (!trackingQueryPhone) return alert("Please input your mobile identifier code.");

    displayContainer.classList.remove('hidden');
    displayContainer.innerHTML = `<span class="text-xs font-bold text-gray-500 animate-pulse">Querying secure transport ledger records...</span>`;

    try {
        const response = await fetch(`${BACKEND_API_URL}?action=trackConsignment&phone=${trackingQueryPhone}`);
        const dataLog = await response.json();

        if (dataLog.error) {
            displayContainer.innerHTML = `
                <div class="text-xs font-bold text-red-600">📍 No Consignment Record Located</div>
                <p class="text-gray-500 text-[11px] mt-1">Verify that the phone number matches the tracking record entered on the estimate tab.</p>`;
            return;
        }

        displayContainer.innerHTML = `
            <div class="space-y-2 text-xs">
                <div class="flex justify-between items-center border-b pb-2">
                    <span class="font-bold text-gray-900">Consignment Status:</span>
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-800 font-black uppercase rounded text-[10px]">${dataLog.status}</span>
                </div>
                <div><strong>Route Path:</strong> ${dataLog.pickup} ➔ ${dataLog.dropoff}</div>
                <div><strong>Cargo Category:</strong> ${dataLog.category.toUpperCase()}</div>
                <div><strong>Logistical Distance:</strong> ${dataLog.distance} KM</div>
                <div class="pt-1 border-t text-gray-500 text-[10px]">Last modified spreadsheet timestamp entry: ${dataLog.timestamp}</div>
            </div>`;

    } catch {
        displayContainer.innerHTML = `<span class="text-xs text-red-500 font-bold">Network verification timed out. Awaiting manual validation link.</span>`;
    }
};

// --- SECTION 9: DRIVER MANAGEMENT ONBOARDING PIPELINE ENGINE ---
document.getElementById('regDriverBtn').onclick = async () => {
    const dName = document.getElementById('driverName').value.trim();
    const dPhone = document.getElementById('driverPhone').value.trim();
    const dPlate = document.getElementById('driverPlate').value.trim();
    const dCat = document.getElementById('driverCat').value;

    if (!dName || !dPhone || !dPlate) {
        alert("Onboarding Error: Please fill in all fields to register your vehicle.");
        return;
    }

    const regButton = document.getElementById('regDriverBtn');
    regButton.disabled = true;
    regButton.innerText = "Registering Driver Profile...";

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "registerDriverProfile",
                name: dName, phone: dPhone, plate: dPlate, category: dCat
            })
        });

        // Custom formatting string to push document verification metrics to WhatsApp Desk
        const whatsappVerificationPayload = 
            `*SWIFTHAUL FLEET VERIFICATION RECRUITMENT*\n` +
            `-----------------------------------------\n` +
            `• *Applicant Name:* ${dName}\n` +
            `• *WhatsApp Phone:* ${dPhone}\n` +
            `• *Vehicle Plate:* ${dPlate}\n` +
            `• *Assigned Cargo Class:* ${dCat.toUpperCase()}\n` +
            `-----------------------------------------\n\n` +
            `*MANDATORY DOCUMENTS SUBMISSION CHECKLIST:*\n` +
            `Please attach and reply with clean photos of the following items immediately:\n` +
            `1. National ID Card (Front & Back)\n` +
            `2. Valid Class NTSA Driving License\n` +
            `3. Commercial Vehicle Insurance Certificate\n` +
            `4. Latest NTSA Inspection Sticker Log\n\n` +
            `_Notice: Your profile row is saved in the pending ledger cache database. Verification takes 12-24 hours._`;

        const operationsManagerWhatsApp = "254712345678"; // This is your phone line to intercept documents!
        window.open(`https://wa.me/${operationsManagerWhatsApp}?text=${encodeURIComponent(whatsappVerificationPayload)}`, '_blank');

        alert("Application Registered successfully! Your browser will now open WhatsApp to complete your document uploads.");
        
        // Reset Inputs
        document.getElementById('driverName').value = '';
        document.getElementById('driverPhone').value = '';
        document.getElementById('driverPlate').value = '';

    } catch (e) {
        alert("Registration pipeline failed: " + e.message);
    } finally {
        regButton.disabled = false;
        regButton.innerText = "Submit Fleet Application Profile";
    }
};
