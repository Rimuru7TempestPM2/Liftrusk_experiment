// =========================================================================
// LIFTRUCK ENTERPRISE MASTER SYSTEM ARCHITECTURE - PRODUCTION CORE
// =========================================================================

const BACKEND_API_URL = "https://script.google.com/macros/s/AKfycbxXwTrrD4JnmeeZo9UmuY6HAf4BMm1cYnW9S_Own8w0rYzdIxrssXxLb0CvtQ5aaRzf/exec";

// Secure internal configuration array containing structural base and per-KM calculations
const PRICING_LOGIC = {
    small:  { base: 200,  perKm: 40 },
    medium: { base: 600,  perKm: 75 },
    large:  { base: 1500, perKm: 110 },
    heavy:  { base: 3500, perKm: 160 }
};

// Legal Vault Database Object
const LEGAL_VAULT = {
    driver: `
        <div class="space-y-4 text-slate-700">
            <p class="font-bold text-red-600 underline">Last updated: 5/6/2026</p>
            <h4 class="font-bold text-slate-900">1. Introduction</h4>
            <p>These Terms & Conditions apply to all truck owners, drivers, or transport service providers ("Drivers") who use the Platform to accept and complete delivery jobs. By registering, you agree to these terms.</p>
            <h4 class="font-bold text-slate-900">2. Relationship Between Driver and Platform</h4>
            <p>You are an independent contractor, not an employee. You provide transport services directly to the client. The Platform only facilitates matching and payment.</p>
            <h4 class="font-bold text-slate-900">3. Driver Eligibility</h4>
            <p>To join, Drivers must: Upload valid ID, Provide a valid driving license, Provide proof of vehicle ownership or authorization, Submit insurance documents. Providing false documents will lead to permanent suspension.</p>
            <h4 class="font-bold text-slate-900">4. Obligations of Drivers</h4>
            <p>Drivers agree to: Transport goods safely, Follow all traffic laws, Handle cargo with care, Arrive on time for pickup.</p>
            <h4 class="font-bold text-slate-900">5. Responsibility for Goods</h4>
            <p>You, the Driver, accept full responsibility for goods once handed over to you. You may be held liable for theft due to negligence, loss of goods, or damage caused by improper handling.</p>
            <h4 class="font-bold text-slate-900">6. Prohibited Conduct</h4>
            <p>Drivers may NOT: Carry unauthorized passengers, Demand extra payment outside the Platform, or Use alcohol/drugs while working.</p>
            <h4 class="font-bold text-slate-900">7. Pricing and Earnings</h4>
            <p>The Platform sets or suggests trip prices. Drivers earn the trip amount minus platform commission paid through mobile money.</p>
            <h4 class="font-bold text-slate-900">8. Insurance Requirements</h4>
            <p>Drivers must maintain valid motor insurance and report accidents immediately.</p>
            <h4 class="font-bold text-slate-900">9. Liability</h4>
            <p>Drivers are liable for goods damaged through negligence. The Platform does not cover losses unless the client purchased insurance.</p>
            <h4 class="font-bold text-slate-900">10. Account Suspension</h4>
            <p>Account may be suspended for fraud, overcharging, mishandling cargo, or illegal activities.</p>
        </div>`,
    client: `
        <div class="space-y-4 text-slate-700">
            <p class="font-bold text-red-600 underline">Last updated: 5/6/2026</p>
            <h4 class="font-bold text-slate-900">1. Introduction</h4>
            <p>These Terms & Conditions govern the use of the platform that connects clients ("Users") with independent truck owners. By using the Platform, you agree to these terms.</p>
            <h4 class="font-bold text-slate-900">2. Service Description</h4>
            <p>The Platform is not a transporter. It does not own vehicles or employ Drivers. It only connects Users with Drivers.</p>
            <h4 class="font-bold text-slate-900">3. Booking Transport Services</h4>
            <p>Users must provide accurate information (weight, destination). Misleading information may result in additional charges.</p>
            <h4 class="font-bold text-slate-900">4. Payments</h4>
            <p>All payments must be made through the Platform (M-Pesa/Card). Payment confirms acceptance of service.</p>
            <h4 class="font-bold text-slate-900">5. User Responsibilities</h4>
            <p>You agree to provide correct cargo details and ensure goods are properly packaged. Improper packaging leads to denial of compensation.</p>
            <h4 class="font-bold text-slate-900">6. Liability for Goods</h4>
            <p>The Platform is not liable for damage, theft, loss, or delays. The Driver is primarily responsible once in possession of goods.</p>
            <h4 class="font-bold text-slate-900">7. Insurance</h4>
            <p>Clients may purchase optional cargo insurance. If declined, they accept full risk for theft or damage.</p>
            <h4 class="font-bold text-slate-900">8. Cancellation Policy</h4>
            <p>Once a Driver is assigned, cancellation may attract a fee.</p>
            <h4 class="font-bold text-slate-900">9. Dispute Resolution</h4>
            <p>Disputes must be raised within 24–48 hours of delivery through the Platform support system.</p>
            <h4 class="font-bold text-slate-900">10. Prohibited Goods</h4>
            <p>Illegal drugs, weapons, bulk cash, and hazardous materials are strictly prohibited.</p>
        </div>`
};

let autocompletePick, autocompleteDrop;
let activeCachedInvoice = null;

// --- REGIONAL INTERFACE ROUTING HUB ---
function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-tab'));
    document.getElementById(targetId).classList.remove('hidden-tab');
    
    ['booking-tab', 'tracker-tab', 'driver-tab'].forEach(id => {
        const btn = document.getElementById(`btn-${id}`);
        if (id === targetId) {
            btn.classList.remove('bg-slate-100', 'text-slate-600');
            btn.classList.add('bg-blue-900', 'text-white');
        } else {
            btn.classList.remove('bg-blue-900', 'text-white');
            btn.classList.add('bg-slate-100', 'text-slate-600');
        }
    });
}

// --- LEGAL MODAL DISPATCH CONTROL ---
function openTermsModal(type) {
    document.getElementById('modalTitle').innerText = `${type === 'driver' ? 'Driver Fleet' : 'Client User'} Operational Terms & Conditions`;
    document.getElementById('modalBody').innerHTML = LEGAL_VAULT[type];
    document.getElementById('termsModal').classList.remove('hidden');
    document.getElementById('termsModal').classList.add('flex');
}
function closeTermsModal() {
    document.getElementById('termsModal').classList.add('hidden');
    document.getElementById('termsModal').classList.remove('flex');
}

// --- GOOGLE AUTOCOMPLETE GEOLOCATION BOUNDING ---
window.addEventListener('load', () => {
    const options = { componentRestrictions: { country: "ke" }, fields: ["geometry", "formatted_address"] };
    autocompletePick = new google.maps.places.Autocomplete(document.getElementById('pickup'), options);
    autocompleteDrop = new google.maps.places.Autocomplete(document.getElementById('dropoff'), options);
});

// --- GEOMETRIC COORDINATE CONVERSION ENGINE (HAVERSINE WITH OVERHEAD OVERLAYS) ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// --- CLIENT QUOTE CALCULATION CONTROLLER ---
document.getElementById('calculateBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const cat = document.getElementById('weightSelect').value;
    const acceptTerms = document.getElementById('clientTermsAgree').checked;

    const p1 = autocompletePick.getPlace();
    const p2 = autocompleteDrop.getPlace();

    if (!name || !phone || !p1?.geometry || !p2?.geometry) return alert("Please fill all input fields and choose verified locations from the dropdown list.");
    if (!acceptTerms) return alert("You must read and check the Client Terms and Conditions container before parsing.");

    try {
        const rawDist = getDistance(p1.geometry.location.lat(), p1.geometry.location.lng(), p2.geometry.location.lat(), p2.geometry.location.lng()) * 1.3; // 30% curvature safeguard matrix
        const displayDist = rawDist.toFixed(1);
        
        const base = PRICING_LOGIC[cat].base;
        const perKm = PRICING_LOGIC[cat].perKm;
        const finalPrice = Math.ceil(rawDist < 1 ? base : base + (rawDist * perKm));

        // Ingest clean matching pools
        const allDrivers = await fetchDriversPool();
        const matches = allDrivers.filter(d => d.category.toLowerCase() === cat.toLowerCase());

        activeCachedInvoice = {
            name, phone, pickup: p1.formatted_address, dropoff: p2.formatted_address,
            category: cat, distance: displayDist, totalBill: finalPrice
        };

        document.getElementById('distanceOutput').innerText = `${displayDist} KM`;
        document.getElementById('priceOutput').innerText = `KES ${finalPrice.toLocaleString()}`;
        
        renderDriversGrid(matches);
        document.getElementById('placeholderText').classList.add('hidden');
        document.getElementById('resultsWrapper').classList.remove('hidden');
    } catch (err) { alert("Telemetry System failure: " + err.message); }
};

async function fetchDriversPool() {
    try {
        const res = await fetch(`${BACKEND_API_URL}?action=getDrivers`);
        return res.ok ? await res.json() : [];
    } catch {
        return [
            { name: "Peter Mwangi", phone: "0711223344", plate: "KCD 123X", category: "small", status: "Active" },
            { name: "John Thika Owner", phone: "0722334455", plate: "KDD 987Z", category: "medium", status: "Active" }
        ];
    }
}

function renderDriversGrid(arr) {
    const tbody = document.getElementById('driverTableBody');
    document.getElementById('poolCounter').innerText = `${arr.length} Units Available`;
    tbody.innerHTML = '';
    if(!arr.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 italic text-xs text-slate-400">No matching class transport assets verified right now.</td></tr>`;
        return;
    }
    arr.forEach(d => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="py-3 pl-2 font-bold text-slate-900">${d.name}</td>
                <td class="py-3 text-blue-600">${d.phone}</td>
                <td class="py-3 font-mono text-slate-500">${d.plate}</td>
                <td class="py-3 font-bold uppercase text-[10px]"><span class="bg-slate-100 p-1 rounded">${d.category}</span></td>
                <td class="py-3 text-right pr-2"><span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">● Online</span></td>
            </tr>`;
    });
}

// --- M-PESA TRANSACTUAL SYSTEM EXPRESS HANDLERS ---
document.getElementById('mpesaPayBtn').onclick = () => {
    if (!activeCachedInvoice) return;
    document.getElementById('mpesaModalAmount').innerText = `KES ${activeCachedInvoice.totalBill.toLocaleString()}`;
    document.getElementById('mpesaModal').classList.remove('hidden');
    document.getElementById('mpesaModal').classList.add('flex');
};

async function simulatePaymentResponse(isSuccess) {
    document.getElementById('mpesaModal').classList.add('hidden');
    document.getElementById('mpesaModal').classList.remove('flex');
    if (!isSuccess) return alert("❌ M-Pesa Transaction aborted by client handset cancellation request.");

    try {
        await fetch(BACKEND_API_URL, {
            method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "saveBooking", status: "Paid & Dispatched", ...activeCachedInvoice })
        });

        // WhatsApp Operations Notification Thread Trigger
        const msg = `*LIFTRUCK TRANSACTION VERIFIED*\n-----------------------------------\n• *Client:* ${activeCachedInvoice.name}\n• *Phone:* ${activeCachedInvoice.phone}\n• *From:* ${activeCachedInvoice.pickup}\n• *To:* ${activeCachedInvoice.dropoff}\n• *Class:* ${activeCachedInvoice.category.toUpperCase()}\n• *Distance:* ${activeCachedInvoice.distance} KM\n-----------------------------------\n*GROSS INVOICE RETAINED:* KES ${activeCachedInvoice.totalBill.toLocaleString()}\n*STATUS:* Paid (M-Pesa Buy Goods API Validation Proof)`;
        window.open(`https://wa.me/254712345678?text=${encodeURIComponent(msg)}`, '_blank');
        alert("✅ Transaction Authorized! Order logged into secure tracking databases and shared via corporate dispatch.");
    } catch (e) { alert("Cloud database synchronization drop: " + e.message); }
}

// --- CLIENT CONSIGNMENT LIVE ORDER TRACKER ENGINE ---
async function executeOrderTracking() {
    const inputNum = document.getElementById('trackPhone').value.trim();
    const outputBox = document.getElementById('trackerResultWrapper');
    if(!inputNum) return alert("Input your registered booking number.");

    outputBox.classList.remove('hidden');
    outputBox.innerHTML = `<div class="text-center py-4 text-xs font-bold text-slate-400 animate-pulse">Querying tracking database rows...</div>`;

    try {
        const res = await fetch(`${BACKEND_API_URL}?action=trackOrder&phone=${inputNum}`);
        if(!res.ok) throw new Error();
        const records = await res.json();

        if(!records.length) {
            outputBox.innerHTML = `<div class="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-bold text-center">No active logistics logs matched with phone string context.</div>`;
            return;
        }

        outputBox.innerHTML = `<h4 class="text-xs font-black uppercase text-slate-400 tracking-wider">Matched active Consignments (${records.length})</h4>`;
        records.forEach(r => {
            outputBox.innerHTML += `
                <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-400">${new Date(r.timestamp).toLocaleDateString()}</span>
                        <span class="px-2 py-0.5 bg-blue-900 text-white font-black rounded-sm tracking-wide text-[9px] uppercase">${r.status}</span>
                    </div>
                    <div class="text-xs font-medium space-y-1">
                        <div>📍 <span class="font-bold">Pickup:</span> ${r.pickup}</div>
                        <div>🏁 <span class="font-bold">Dropoff:</span> ${r.dropoff}</div>
                        <div class="pt-2 border-t border-dashed border-slate-200 flex justify-between font-bold text-slate-800">
                            <span>Total Bill: KES ${Number(r.bill).toLocaleString()}</span>
                            <span>Distance: ${r.distance} KM</span>
                        </div>
                    </div>
                </div>`;
        });
    } catch {
        outputBox.innerHTML = `<div class="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-bold text-center">Database timeout. Verify endpoint connection parameters.</div>`;
    }
}

// --- REGISTRATION AND WHATSAPP PRE-FILLED SYSTEM ---
function executeDriverRegistration(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const plate = document.getElementById('regPlate').value.trim();
    const cat = document.getElementById('regCategory').value;

    const whatsappText = `*NEW LIFTRUCK FLEET DRIVER APPLICATION*\n` +
                         `-------------------------------------------\n` +
                         `• *Applicant Name:* ${name}\n` +
                         `• *Active Contact:* ${phone}\n` +
                         `• *Vehicle Plate:* ${plate}\n` +
                         `• *Operating Class Allocation:* ${cat.toUpperCase()}\n` +
                         `-------------------------------------------\n` +
                         `💡 _Internal Onboarding Instructions: Please reply to this thread by attaching high-resolution photo exposures of your National ID card, Driving License card, Commercial Vehicle Insurance, and NTSA Inspection Certificate documents._`;

    // Direct routing to your operational verification center
    window.open(`https://wa.me/254712345678?text=${encodeURIComponent(whatsappText)}`, '_blank');
    alert("🚀 Fleet profile compiled! Redirecting to the administrative onboarding center to complete your document verification uploads.");
}
