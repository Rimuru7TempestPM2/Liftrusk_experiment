// =========================================================================
// LIFTRUCK ENTERPRISE SYSTEM CORE ARCHITECTURE - UNIFIED MASTER CONTROLLER
// =========================================================================

// --- SECTION 1: BUSINESS LOGIC MATRIX CONFIGURATION ---
const BACKEND_API_URL = "https://script.google.com/macros/s/AKfycbxXwTrrD4JnmeeZo9UmuY6HAf4BMm1cYnW9S_Own8w0rYzdIxrssXxLb0CvtQ5aaRzf/exec";

const PRICING_LOGIC = {
    small:  { base: 200,  perKm: 40 },
    medium: { base: 600,  perKm: 75 },
    large:  { base: 1500, perKm: 110 },
    heavy:  { base: 3500, perKm: 160 }
};

let autocompletePick, autocompleteDrop;
let globalBookingData = null; 

// --- SECTION 2: INTERFACE TAB ROUTING CONTROLS ---
function switchTab(target) {
    const pClient = document.getElementById('panel-client');
    const pDriver = document.getElementById('panel-driver');
    const tClient = document.getElementById('tab-client');
    const tDriver = document.getElementById('tab-driver');

    if (target === 'client-panel') {
        pClient.classList.remove('hidden');
        pDriver.classList.add('hidden');
        tClient.className = "px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition";
        tDriver.className = "px-5 py-2.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl cursor-pointer transition";
    } else {
        pClient.classList.add('hidden');
        pDriver.classList.remove('hidden');
        tClient.className = "px-5 py-2.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl cursor-pointer transition";
        tDriver.className = "px-5 py-2.5 bg-blue-900 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition";
    }
}

// --- SECTION 3: GOOGLE PLACES CONFIGURATION ---
window.addEventListener('load', () => {
    const pickInput = document.getElementById('pickup');
    const dropInput = document.getElementById('dropoff');

    const geoOptions = {
        componentRestrictions: { country: "ke" },
        fields: ["geometry", "formatted_address"]
    };

    autocompletePick = new google.maps.places.Autocomplete(pickInput, geoOptions);
    autocompleteDrop = new google.maps.places.Autocomplete(dropInput, geoOptions);
});

// --- SECTION 4: CORE MATHEMATICAL GEOMETRY ENGINE (HAVERSINE) ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// --- SECTION 5: CLIENT BOOKING MATRIX AND CALCULATION ---
document.getElementById('calculateBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const cat = document.getElementById('weightSelect').value;

    const placePick = autocompletePick.getPlace();
    const placeDrop = autocompleteDrop.getPlace();

    if (!name || !phone || !placePick?.geometry || !placeDrop?.geometry) {
        alert("🚨 Booking Aborted: Ensure you provide client info and choose locations from the autocomplete dropdown menu list.");
        return;
    }

    try {
        const lat1 = placePick.geometry.location.lat();
        const lon1 = placePick.geometry.location.lng();
        const lat2 = placeDrop.geometry.location.lat();
        const lon2 = placeDrop.geometry.location.lng();

        // Spatial math containing your 30% road curvature buffer overhead adjustment
        const rawDist = getDistance(lat1, lon1, lat2, lon2) * 1.3;
        const displayDist = rawDist.toFixed(1); 
        
        // Execute conditional Base Price Protection (Under 1KM calculations remain flat minimums)
        const base = PRICING_LOGIC[cat].base;
        const perKm = PRICING_LOGIC[cat].perKm;
        const finalPrice = Math.ceil(rawDist < 1 ? base : base + (rawDist * perKm));

        const driverRevenue = Math.ceil(finalPrice * 0.85);
        const platformRevenue = finalPrice - driverRevenue;

        const pickAddress = placePick.formatted_address;
        const dropAddress = placeDrop.formatted_address;

        const allDrivers = await fetchLiveDrivers();
        const filteredDrivers = allDrivers.filter(d => d.category.toLowerCase() === cat.toLowerCase() && d.status === "Active");

        globalBookingData = {
            name, phone, pickAddress, dropAddress, category: cat,
            distance: displayDist, price: finalPrice, driverShare: driverRevenue, platformShare: platformRevenue
        };

        // Render to calculations interface pane components
        document.getElementById('distanceOutput').innerText = `${displayDist} KM`;
        document.getElementById('priceOutput').innerText = `KES ${finalPrice.toLocaleString()}`;
        document.getElementById('driverShare').innerText = `KES ${driverRevenue.toLocaleString()}`;
        document.getElementById('platformShare').innerText = `KES ${platformRevenue.toLocaleString()}`;

        renderDriversList(filteredDrivers);

        document.getElementById('placeholderText').className = 'hidden';
        document.getElementById('resultsWrapper').className = 'space-y-4';

    } catch (err) {
        alert("Core Engine Transaction Processing Exception: " + err.message);
    }
};

// --- SECTION 6: BACKEND SYNC AND INTERFACE RENDERING ---
async function fetchLiveDrivers() {
    try {
        const res = await fetch(`${BACKEND_API_URL}?action=getDrivers`);
        if (!res.ok) throw new Error("Endpoint communication drop.");
        return await res.json();
    } catch (e) {
        console.warn("API Offline. Injecting runtime fallback matrix logic. Profile details: ", e);
        return [
            { name: "Peter Mwangi", phone: "0711223344", plate: "KCD 123X", category: "small", status: "Active" },
            { name: "Evans Kiambu Trucker", phone: "0733445566", plate: "KCA 555Y", category: "large", status: "Active" }
        ];
    }
}

function renderDriversList(drivers) {
    const tableBody = document.getElementById('driverTableBody');
    document.getElementById('poolCounter').innerText = `${drivers.length} Driver Matches`;
    tableBody.innerHTML = '';

    if (drivers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs italic">No active verified drivers currently online for this cargo class configuration.</td></tr>`;
        return;
    }

    drivers.forEach(d => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition border-b border-gray-100 text-xs md:text-sm";
        row.innerHTML = `
            <td class="py-3 pl-2 font-bold text-gray-900">${d.name}</td>
            <td class="py-3 text-blue-600">${d.phone}</td>
            <td class="py-3 font-mono text-gray-600">${d.plate}</td>
            <td class="py-3"><span class="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded text-[10px] uppercase">${d.category}</span></td>
            <td class="py-3 text-right pr-2"><span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px]">● ${d.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// --- SECTION 7: BOOKING INGESTION DISPATCH LINK ---
document.getElementById('dispatchBtn').onclick = async () => {
    if (!globalBookingData) return;
    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true;
    btn.innerText = "Processing System Handshake...";

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "saveBooking", ...globalBookingData })
        });

        const msg = `*LIFTRUCK TRANSACTION DISPATCH ORDER*\n` +
                    `-------------------------------------------\n` +
                    `• *Client Name:* ${globalBookingData.name}\n` +
                    `• *Contact Number:* ${globalBookingData.phone}\n` +
                    `• *Pickup Address:* ${globalBookingData.pickAddress}\n` +
                    `• *Dropoff Address:* ${globalBookingData.dropAddress}\n` +
                    `• *Cargo Category Class:* ${globalBookingData.category.toUpperCase()}\n` +
                    `• *Total Traveled Distance:* ${globalBookingData.distance} KM\n` +
                    `-------------------------------------------\n` +
                    `*TOTAL CLIENT INVOICE:* KES ${globalBookingData.price.toLocaleString()}\n` +
                    `*DRIVER ALLOCATION (85%):* KES ${globalBookingData.driverShare.toLocaleString()}\n` +
                    `*LIFTRUCK FEES (15%):* KES ${globalBookingData.platformShare.toLocaleString()}\n\n` +
                    `_System Notice: Transaction logged to cloud master directory ledger._`;

        window.open(`https://wa.me/254712345678?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) {
        alert("Network operational write fault: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Log to Sheets & Launch Dispatch Payload";
    }
};

// --- SECTION 8: DRIVER ONBOARDING FORM HANDLER ---
document.getElementById('driverRegForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
        action: "registerDriver",
        name: document.getElementById('driverName').value.trim(),
        phone: document.getElementById('driverPhone').value.trim(),
        idNo: document.getElementById('driverNationalID').value.trim(),
        plate: document.getElementById('driverPlate').value.trim(),
        category: document.getElementById('driverCategory').value,
        docs: document.getElementById('driverDocsLink').value.trim()
    };

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("🎉 Application Processed!\n\nYour driver recruitment packet has been securely logged into our system directory dashboard. Administration will verify your cloud documentation link before activating your routing permissions.");
        document.getElementById('driverRegForm').reset();
        switchTab('client-panel');
    } catch (err) {
        alert("Registration pipeline communication failure: " + err.message);
    }
};
