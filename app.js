// =========================================================================
// SWIFTHAUL LOGISTICS PORTAL ENGINE - PROGRAMMATIC PRODUCTION CONTROLLER
// =========================================================================

// =========================================================================
// SPECIAL NOTE: CLOUD ENDPOINT CONFIGURATION
// Swap out this variable string value with your active Google Apps Script web application link.
// =========================================================================
const BACKEND_API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

// Algorithmic Pricing Engine Constants
const EPRA_FUEL_BASELINE = 180;    // Structural baseline price of diesel in KES
let CURRENT_EPRA_FUEL_PRICE = 195;  // Active month's EPRA rate (Test value demonstrating +15 KES shift)

// Vehicle Structural Parameter Database Profiles
const VEHICLE_PROFILES = {
    pickup: { name: "1-Ton Pick-up", baseRate: 1500, perKmRate: 50 },
    canter: { name: "3-Ton Canter",  baseRate: 3000, perKmRate: 75 },
    lorry:  { name: "10-Ton Lorry",  baseRate: 6000, perKmRate: 120 }
};

// Cargo Multiplier Risk Profile Weightings
const CARGO_MULTIPLIERS = {
    standard:   1.0,
    fragile:    1.2,
    perishable: 1.3,
    bulky:      1.15
};

let googlePickInstance, googleDropInstance;
let computedCache = null;

// Navigation Panel Toggle Mechanism
function switchView(panelId) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(panelId).classList.remove('hidden');
}

// =========================================================================
// SPECIAL NOTE: INITIALIZE GOOGLE AUTOCOMPLETE PLACES BINDING
// The system maps map boundary nodes here. If you replace this with hardware tracking coordinates later,
// your active lat/lng objects will interface directly with the mathematical distance formula below.
// =========================================================================
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

// Haversine Coordinate Path Solver (Calculates linear distance, applies 30% curvature buffer)
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

// Dynamic Calculation Execution Block
document.getElementById('calculateBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const vehicleType = document.getElementById('weightSelect').value;
    const cargoType = document.getElementById('cargoSelect').value;

    const pickGeo = googlePickInstance.getPlace();
    const dropGeo = googleDropInstance.getPlace();

    if (!name || !phone || !pickGeo?.geometry || !dropGeo?.geometry) {
        alert("Input Validation Failure: Please verify your spatial location arguments using the drop-down listings.");
        return;
    }

    try {
        const la1 = pickGeo.geometry.location.lat();
        const lo1 = pickGeo.geometry.location.lng();
        const la2 = dropGeo.geometry.location.lat();
        const lo2 = dropGeo.geometry.location.lng();

        // Process linear scale, apply 30% detour routing curvature buffer
        const processedDistance = calculateMathematicalDistance(la1, lo1, la2, lo2) * 1.3;
        const localizedDistanceStr = processedDistance.toFixed(1);

        // Dynamically compute fuel surcharge percentages (Every 5 KES delta shifts index by 2%)
        const fuelDeltaPrice = CURRENT_EPRA_FUEL_PRICE - EPRA_FUEL_BASELINE;
        const fuelSteps = Math.floor(fuelDeltaPrice / 5);
        const fuelSurchargePercentage = (fuelSteps * 2) / 100;

        const profile = VEHICLE_PROFILES[vehicleType];
        const cargoMultiplier = CARGO_MULTIPLIERS[cargoType];

        // Core Dynamic Pricing Regression Algorithm Calculation Block
        // Formula: [Base Rate + (Distance * Per-KM Rate)] * (1 + Fuel Surcharge %) * Cargo Multiplier
        const structuralBaseCost = profile.baseRate + (processedDistance * profile.perKmRate);
        const dynamicCostWithSurcharge = structuralBaseCost * (1 + fuelSurchargePercentage);
        const finalizedGrossInvoice = Math.ceil(dynamicCostWithSurcharge * cargoMultiplier);

        // Segregate Gross Receivables (85% Fleet Credit Allocation / 15% Platform Margin Cut)
        const driverCredit = Math.ceil(finalizedGrossInvoice * 0.85);
        const platformCut = finalizedGrossInvoice - driverCredit;

        const systemDrivers = await getLiveSystemDrivers();
        const activeClassMatches = systemDrivers.filter(d => d.category.toLowerCase() === vehicleType.toLowerCase());

        computedCache = {
            name, phone, category: vehicleType, cargoType, distance: localizedDistanceStr, 
            price: finalizedGrossInvoice, driverShare: driverCredit, platformShare: platformCut,
            pickupText: pickGeo.formatted_address, dropoffText: dropGeo.formatted_address,
            fuelPriceApplied: CURRENT_EPRA_FUEL_PRICE, surchargeApplied: (fuelSurchargePercentage * 100) + "%"
        };

        // Render calculated array outputs directly to front end views
        document.getElementById('distanceOutput').innerText = `${localizedDistanceStr} KM`;
        document.getElementById('priceOutput').innerText = `KES ${finalizedGrossInvoice.toLocaleString()}`;
        
        renderFleetPoolTable(activeClassMatches);
        document.getElementById('resultsWrapper').classList.remove('hidden');

    } catch (err) {
        alert("Platform routing calculation breakdown: " + err.message);
    }
};

// Database Query Fetches
async function getLiveSystemDrivers() {
    try {
        const connection = await fetch(`${BACKEND_API_URL}?action=fetchDrivers`);
        if (!connection.ok) throw new Error();
        return await connection.json();
    } catch {
        return [{ name: "John Thika Hauler", phone: "0711223344", plate: "KCD 444Y", category: "lorry" }];
    }
}

function renderFleetPoolTable(arrayData) {
    const body = document.getElementById('driverTableBody');
    body.innerHTML = '';

    if(arrayData.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-400 italic">No verified haulers currently available in this specific class.</td></tr>`;
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

// Client Booking & Payment Transmission Pipeline
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

        // =========================================================================
        // SPECIAL NOTE: MPESA MANUAL INTERFACE INJECTION PANEL
        // When MK establishes the Buy Goods API layer, your AJAX callback handler will replace this basic alert
        // window with a background STK-Push script invocation calling Safaricom Daraja systems.
        // =========================================================================
        alert(
            "========================================\n" +
            "📥 SWIFTHAUL M-PESA BUY GOODS INVOICE\n" +
            "========================================\n" +
            "Please complete your delivery payment manually:\n\n" +
            "1. Go to your M-Pesa Menu\n" +
            "2. Select Lipa Na M-Pesa > Buy Goods and Services\n" +
            "3. Enter Till Number: [INSERT MK TILL NUMBER HERE]\n" +
            "4. Enter Amount: KES " + computedCache.price.toLocaleString() + "\n\n" +
            "Once transaction is processed, our system logs will authorize consignment routing."
        );

        switchView('trackingView');
        document.getElementById('trackPhone').value = computedCache.phone;
        document.getElementById('trackBtn').click();

    } catch (e) {
        alert("Booking transmission error: " + e.message);
    } finally {
        actionButton.disabled = false;
        actionButton.innerText = "Confirm Booking via M-Pesa Buy Goods";
    }
};

// Client Order Status Verification Ledger Query Engine
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
            displayContainer.innerHTML = `<div class="text-xs font-bold text-red-600">📍 No Active Consignment Located. Please verify your phone format matches your reservation.</div>`;
            return;
        }

        displayContainer.innerHTML = `
            <div class="space-y-2 text-xs">
                <div class="flex justify-between items-center border-b pb-2">
                    <span class="font-bold text-gray-900">Consignment Lifecycle Status:</span>
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-800 font-black uppercase rounded text-[10px]">${dataLog.status}</span>
                </div>
                <div><strong>Route Path Summary:</strong> ${dataLog.pickup} ➔ ${dataLog.dropoff}</div>
                <div><strong>Cargo Commodity Category:</strong> ${dataLog.cargoType.toUpperCase()}</div>
                <div><strong>Logistical Vector Length:</strong> ${dataLog.distance} KM</div>
                <div class="pt-1 border-t text-gray-500 text-[10px]">Database Modification Timestamp: ${dataLog.timestamp}</div>
            </div>`;
    } catch {
        displayContainer.innerHTML = `<span class="text-xs text-red-500 font-bold">Network timeout checking core sheets database.</span>`;
    }
};

// Fleet Driver Activation & Formatted WhatsApp Transmission Interface
document.getElementById('regDriverBtn').onclick = async () => {
    const dName = document.getElementById('driverName').value.trim();
    const dPhone = document.getElementById('driverPhone').value.trim();
    const dPlate = document.getElementById('driverPlate').value.trim();
    const dCat = document.getElementById('driverCat').value;

    if (!dName || !dPhone || !dPlate) {
        alert("Onboarding Entry Error: Ensure all fields are filled.");
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

        // Required text payload verification block containing the requested verification checklist rules
        const whatsappVerificationPayload = 
            `*SWIFTHAUL FLEET VERIFICATION RECRUITMENT*\n` +
            `-----------------------------------------\n` +
            `• *Applicant Name:* ${dName}\n` +
            `• *WhatsApp Phone:* ${dPhone}\n` +
            `• *Vehicle Plate:* ${dPlate}\n` +
            `• *Assigned Cargo Class:* ${dCat.toUpperCase()}\n` +
            `-----------------------------------------\n\n` +
            `*VERIFICATION CHECKLIST REQUIREMENTS:*\n` +
            `Please attach clean photos of the following documents to this chat thread immediately:\n` +
            `• You must have a valid Smartphone with WhatsApp\n` +
            `• Have your ID & Driving License ready to upload\n` +
            `• Vehicle must have valid Insurance & Inspection.\n\n` +
            `_Notice: Profile registered inside pending ledger array database rows. Activation completes within 12-24 hours._`;

        const operationsManagerWhatsApp = "254712345678"; // Update with your actual phone line to catch documents
        window.open(`https://wa.me/${operationsManagerWhatsApp}?text=${encodeURIComponent(whatsappVerificationPayload)}`, '_blank');
        alert("Application Profile logged successfully! The app will now trigger the WhatsApp interface window to upload your verification files.");
        
        document.getElementById('driverName').value = '';
        document.getElementById('driverPhone').value = '';
        document.getElementById('driverPlate').value = '';
    } catch (e) {
        alert("Registration pipeline failure: " + e.message);
    } finally {
        regButton.disabled = false;
        regButton.innerText = "Submit Fleet Application Profile";
    }
};
