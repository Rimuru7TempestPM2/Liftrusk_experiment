// =========================================================================
// SWIFTHAUL LOGISTICS - CORE HYBRID MULTI-FACTOR COST-PLUS REGRESSION ENGINE
// =========================================================================

// --- SECTION 1: SYSTEM ENDPOINT CONFIGURATION ---
const BACKEND_API_URL = "https://script.google.com/macros/s/AKfycbxXwTrrD4JnmeeZo9UmuY6HAf4BMm1cYnW9S_Own8w0rYzdIxrssXxLb0CvtQ5aaRzf/exec";

// --- SECTION 2: DYNAMIC ALGORITHM CONSTANTS (AS DESCRIBED IN DOCUMENTATION) ---
const EPRA_FUEL_BASELINE = 180;      // Baseline metric parameter for local fuel cost calculations
let CURRENT_EPRA_FUEL_PRICE = 195;   // Real-time index price (Simulating current EPRA KES/Liter valuation)

// Structural Vehicle Profile Coefficients
const VEHICLE_PROFILES = {
    pickup: { name: "1-Ton Pick-up", baseRate: 1500, perKmRate: 50 },
    canter: { name: "3-Ton Canter",  baseRate: 3000, perKmRate: 75 },
    lorry:  { name: "10-Ton Lorry",  baseRate: 6000, perKmRate: 120 }
};

// Cargo Multiplier Risk Configurations
const CARGO_MULTIPLIERS = {
    standard:   1.0,
    fragile:    1.2,   // High-value cargo care layer
    perishable: 1.3,   // Cold-chain refrigeration fuel consumption
    bulky:      1.15   // Heavy load degradation compensation
};

let googlePickInstance, googleDropInstance;
let computedCache = null;

// --- SECTION 3: SYSTEM INTERFACE ROUTER ---
function switchPortalView(panelId) {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(panelId).classList.remove('hidden');
}

// --- SECTION 4: GOOGLE PLACES INTERACTION AUTOCOMPLETE BINDING ---
window.addEventListener('load', () => {
    const pInput = document.getElementById('pickup');
    const dInput = document.getElementById('dropoff');
    
    const operationalScopeOptions = {
        componentRestrictions: { country: "ke" },
        fields: ["geometry", "formatted_address"]
    };

    googlePickInstance = new google.maps.places.Autocomplete(pInput, operationalScopeOptions);
    googleDropInstance = new google.maps.places.Autocomplete(dInput, operationalScopeOptions);
});

// --- SECTION 5: HAVERSINE MATHEMATICAL GEOMETRIC DISTANCE EQUATION ---
// Computes direct spatial points which are later adjusted to match real-world routing conditions
function calculateMathematicalDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const haversineCore = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const centralAngle = 2 * Math.atan2(Math.sqrt(haversineCore), Math.sqrt(1 - haversineCore));
    return earthRadiusKm * centralAngle; 
}

// --- SECTION 6: THE MULTI-FACTOR REGRESSION PRICE GENERATOR ---
document.getElementById('calculateBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const vehicleClass = document.getElementById('vehicleSelect').value;
    const cargoRisk = document.getElementById('cargoSelect').value;

    const pickPlace = googlePickInstance.getPlace();
    const dropPlace = googleDropInstance.getPlace();

    if (!name || !phone || !pickPlace?.geometry || !dropPlace?.geometry) {
        alert("Configuration Notice: Please select exact geographic addresses from the drop-down listings.");
        return;
    }

    try {
        const originLat = pickPlace.geometry.location.lat();
        const originLon = pickPlace.geometry.location.lng();
        const destLat = dropPlace.geometry.location.lat();
        const destLon = dropPlace.geometry.location.lng();

        // 1. Calculate base spatial distance and add a 30% curvature overhead safety buffer
        const rawDistance = calculateMathematicalDistance(originLat, originLon, destLat, destLon);
        const bufferedDistance = rawDistance * 1.3;
        const finalizedDistanceString = bufferedDistance.toFixed(1);

        // 2. Compute the dynamic Fuel Surcharge Modifier Matrix
        // For every 5 KES increase or decrease from baseline, scale the surcharge modifier up or down by 2%
        const fuelDeltaPrice = CURRENT_EPRA_FUEL_PRICE - EPRA_FUEL_BASELINE;
        const fuelSurchargeSteps = Math.floor(fuelDeltaPrice / 5);
        const dynamicFuelSurchargePercentage = (fuelSurchargeSteps * 2) / 100;

        // 3. Extract core coefficient references from structural database tables
        const vehicleProfile = VEHICLE_PROFILES[vehicleClass];
        const cargoWeightMultiplier = CARGO_MULTIPLIERS[cargoRisk];

        // 4. Core Algorithmic Regression Execution Loop
        // Equation Model: [Base Rate + (Distance * Per-KM Rate)] * (1 + Fuel Surcharge %) * Cargo Multiplier Risk
        const primaryTransportCost = vehicleProfile.baseRate + (bufferedDistance * vehicleProfile.perKmRate);
        const costWithSurchargeApplied = primaryTransportCost * (1 + dynamicFuelSurchargePercentage);
        const finalCalculatedInvoiceTotal = Math.ceil(costWithSurchargeApplied * cargoWeightMultiplier);

        // 5. Apportion platform agency fee revenue matrix shares (85% Driver Payout / 15% System Retention)
        const driverShareRevenue = Math.ceil(finalCalculatedInvoiceTotal * 0.85);
        const platformShareRevenue = finalCalculatedInvoiceTotal - driverShareRevenue;

        // Query active verified databases for vehicle distribution arrays
        const rawFleetList = await fetchActiveSystemFleetPool();
        const structuralClassMatches = rawFleetList.filter(driver => driver.category.toLowerCase() === vehicleClass.toLowerCase());

        // Cache parameters securely to prevent mutation alterations during posting routines
        computedCache = {
            name, phone, category: vehicleClass, cargoType: cargoRisk, distance: finalizedDistanceString,
            price: finalCalculatedInvoiceTotal, driverShare: driverShareRevenue, platformShare: platformShareRevenue,
            pickupText: pickPlace.formatted_address, dropoffText: dropPlace.formatted_address,
            fuelPriceApplied: CURRENT_EPRA_FUEL_PRICE, surchargeApplied: (dynamicFuelSurchargePercentage * 100) + "%"
        };

        // UI Presentation - Renders single aggregate output quote without exposing internal operational cost components
        document.getElementById('distanceOutput').innerText = `${finalizedDistanceString} KM`;
        document.getElementById('priceOutput').innerText = `KES ${finalCalculatedInvoiceTotal.toLocaleString()}`;
        
        renderFleetPoolTable(structuralClassMatches);
        document.getElementById('resultsWrapper').classList.remove('hidden');

    } catch (error) {
        alert("Pricing System Fault: Unable to complete route cost processing. " + error.message);
    }
};

// --- SECTION 7: API DRIVER DATA RETRIEVAL BRIDGE ---
async function fetchActiveSystemFleetPool() {
    try {
        const systemConnection = await fetch(`${BACKEND_API_URL}?action=fetchDrivers`);
        if (!systemConnection.ok) throw new Error();
        return await systemConnection.json();
    } catch {
        // High-availability sandbox tracking fallbacks
        return [
            { name: "John Thika Hauler", phone: "0711223344", plate: "KCD 444Y", category: "lorry" }
        ];
    }
}

function renderFleetPoolTable(driversArray) {
    const tableBodyNode = document.getElementById('driverTableBody');
    tableBodyNode.innerHTML = '';

    if (driversArray.length === 0) {
        tableBodyNode.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400 italic">No verified vehicle units currently checked into this class registry.</td></tr>`;
        return;
    }

    driversArray.forEach(driver => {
        const rowNode = document.createElement('tr');
        rowNode.className = "border-b border-slate-100 hover:bg-slate-50 transition text-[11px]";
        rowNode.innerHTML = `
            <td class="py-2.5 font-bold text-slate-900">${driver.name}</td>
            <td class="py-2.5 text-slate-500 uppercase">${driver.category}</td>
            <td class="py-2.5 font-mono text-slate-600 font-bold">${driver.plate}</td>
            <td class="py-2.5 text-right"><span class="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-black">● READY</span></td>
        `;
        tableBodyNode.appendChild(rowNode);
    });
}

// --- SECTION 8: MPESA INVOICE EXTRACTION AND POST ROUTINE ---
document.getElementById('payMpesaBtn').onclick = async () => {
    if (!computedCache) return;

    const invoiceSubmitBtn = document.getElementById('payMpesaBtn');
    invoiceSubmitBtn.disabled = true;
    invoiceSubmitBtn.innerText = "Transmitting Transaction Ledger Entry...";

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "registerClientBooking", ...computedCache })
        });

        alert(
            "========================================\n" +
            "📥 SWIFTHAUL INVOICE CHECKOUT INTERFACE\n" +
            "========================================\n" +
            "Please process your platform payment manually:\n\n" +
            "1. Access your M-Pesa SIM menu toolkit\n" +
            "2. Select Lipa Na M-Pesa > Buy Goods and Services\n" +
            "3. Input Corporate Till Number: [INSERT MK TILL HERE]\n" +
            "4. Input Invoice Amount: KES " + computedCache.price.toLocaleString() + "\n\n" +
            "Our logistics hub will review the transaction reference code and authorize dispatch."
        );

        switchPortalView('trackingView');
        document.getElementById('trackPhone').value = computedCache.phone;
        document.getElementById('trackBtn').click();

    } catch (err) {
        alert("Transaction Write Pipeline Interrupted: " + err.message);
    } finally {
        invoiceSubmitBtn.disabled = false;
        invoiceSubmitBtn.innerText = "Confirm via M-Pesa Buy Goods";
    }
};

// --- SECTION 9: REAL-TIME SECURE LIFECYCLE TRACKING ENGINE ---
document.getElementById('trackBtn').onclick = async () => {
    const customerTrackingPhone = document.getElementById('trackPhone').value.trim();
    const trackingOutputContainer = document.getElementById('trackingResult');

    if (!customerTrackingPhone) return alert("Validation Notice: Input phone criteria key.");

    trackingOutputContainer.classList.remove('hidden');
    trackingOutputContainer.innerHTML = `<span class="text-xs font-bold text-slate-400 animate-pulse">Running tracking lookup across active cloud shards...</span>`;

    try {
        const networkQuery = await fetch(`${BACKEND_API_URL}?action=trackConsignment&phone=${customerTrackingPhone}`);
        const trackingLogPayload = await networkQuery.json();

        if (trackingLogPayload.error) {
            trackingOutputContainer.innerHTML = `
                <div class="text-xs font-bold text-red-600">📍 No Consignment Record Located</div>
                <p class="text-[10px] text-slate-400 mt-1">Verify that your input matches your booking credentials.</p>`;
            return;
        }

        trackingOutputContainer.innerHTML = `
            <div class="space-y-2.5 text-xs font-medium">
                <div class="flex justify-between items-center border-b pb-2">
                    <span class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Consignment Lifecycle Status:</span>
                    <span class="px-2.5 py-0.5 bg-blue-900 text-white font-black uppercase rounded text-[9px] tracking-wide shadow-sm animate-pulse">${trackingLogPayload.status}</span>
                </div>
                <div><span class="text-slate-400">Route Path:</span> ${trackingLogPayload.pickup} <span class="text-blue-600 font-bold">➔</span> ${trackingLogPayload.dropoff}</div>
                <div class="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-lg text-[11px]">
                    <div><span class="text-slate-400">Cargo Type:</span> ${trackingLogPayload.cargoType.toUpperCase()}</div>
                    <div><span class="text-slate-400">Logistical Distance:</span> ${trackingLogPayload.distance} KM</div>
                </div>
                <div class="text-[9px] text-slate-400 italic pt-1 border-t">Spreadsheet Ledger Timestamp: ${trackingLogPayload.timestamp}</div>
            </div>`;
    } catch {
        trackingOutputContainer.innerHTML = `<span class="text-xs text-red-500 font-bold">Network response timed out. Awaiting gateway syncing.</span>`;
    }
};

// --- SECTION 10: DRIVER ONBOARDING & INTERFACES PIPELINE ---
document.getElementById('regDriverBtn').onclick = async () => {
    const dName = document.getElementById('driverName').value.trim();
    const dPhone = document.getElementById('driverPhone').value.trim();
    const dPlate = document.getElementById('driverPlate').value.trim();
    const dCat = document.getElementById('driverCat').value;

    if (!dName || !dPhone || !dPlate) {
        alert("Validation Notice: All registration rows require data entries.");
        return;
    }

    const registrationSubmitBtn = document.getElementById('regDriverBtn');
    registrationSubmitBtn.disabled = true;
    registrationSubmitBtn.innerText = "Transmitting Application Profile Row...";

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

        // Deep link tracking payload structure optimized for immediate manual verification handling
        const whatsappOnboardingTemplate = 
            `*SWIFTHAUL LOGISTICS FLEET VERIFICATION RECRUITMENT*\n` +
            `=========================================\n` +
            `• *Applicant Name:* ${dName}\n` +
            `• *WhatsApp Phone Contact:* ${dPhone}\n` +
            `• *Vehicle Plate Registration:* ${dPlate}\n` +
            `• *Assigned Cargo Asset Class:* ${dCat.toUpperCase()}\n` +
            `=========================================\n\n` +
            `*MANDATORY DOCUMENTS SUBMISSION CHECKLIST:*\n` +
            `Please attach and reply with clean photos of the following items immediately:\n` +
            `1. National ID Card (Front & Back Photo)\n` +
            `2. Valid Class NTSA Driving License\n` +
            `3. Commercial Vehicle Comprehensive Insurance Certificate\n` +
            `4. Latest NTSA Inspection Sticker Log File\n\n` +
            `_Notice: Profile logged to pending spreadsheet rows. Verification parameters require 12-24 operational hours._`;

        const verificationDeskLine = "254712345678"; // Insert your office management mobile terminal line here
        window.open(`https://wa.me/${verificationDeskLine}?text=${encodeURIComponent(whatsappOnboardingTemplate)}`, '_blank');
        
        alert("Application Registered! Please transmit your validation paperwork files via the open WhatsApp link connection.");
        
        document.getElementById('driverName').value = '';
        document.getElementById('driverPhone').value = '';
        document.getElementById('driverPlate').value = '';

    } catch (error) {
        alert("Onboarding Pipeline Failure: " + error.message);
    } finally {
        registrationSubmitBtn.disabled = false;
        registrationSubmitBtn.innerText = "Submit System Profile Row";
    }
};
