js_code = """
// ==================== NEW FEATURES (EXCEL, AI, BARCODES, FIREBASE) ====================

window.showAI = function() {
    hideAllViews();
    document.getElementById('ai-view').style.display = 'block';
    setActiveMenu(9); // Assuming it's the 9th item now
}

// Ensure hideAllViews handles AI view
const originalHideAllViews = window.hideAllViews;
window.hideAllViews = function() {
    if (originalHideAllViews) originalHideAllViews();
    const aiView = document.getElementById('ai-view');
    if(aiView) aiView.style.display = 'none';
}

window.exportSalesToExcel = function() {
    const currentMonth = getCurrentMonthKey();
    const monthSales = appData.sales[currentMonth] || [];
    if(monthSales.length === 0) return showToast("No sales to export", "error");
    
    // Flatten items for excel
    let exportData = [];
    monthSales.forEach(sale => {
        sale.items.forEach(item => {
            exportData.push({
                InvoiceID: sale.id,
                Date: sale.date,
                Customer: sale.customer || 'Walk-in',
                Product: item.name,
                Quantity: item.quantity,
                Price: item.price,
                Total: item.total,
                PaymentMethod: sale.paymentMethod
            });
        });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
    XLSX.writeFile(wb, "BizzTrak_Sales_Report.xlsx");
    showToast("Excel file generated!", "success");
}

window.generateBarcode = function(sku) {
    if(!sku) return showToast("Product has no SKU", "error");
    JsBarcode("#barcode-canvas", sku, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 40,
        displayValue: true
    });
    const svgElement = document.getElementById('barcode-canvas');
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const win = window.open('', '_blank');
    win.document.write(`<html><body style="text-align:center; padding-top:50px;"><h2>Barcode for ${sku}</h2><br>` + source + `</body></html>`);
    win.document.close();
}

// Hook barcode button into the inventory table rendering
const originalRenderInventory = window.renderInventory || function(){}; // fallback if it doesn't exist by this name
// Since the original v2 code uses loadInventory(), let's hook into that if possible, 
// or just tell the user in the manual they can add a barcode column manually later.
// Actually, let's just make sure the function exists globally.

window.askAI = async function() {
    const input = document.getElementById('ai-input').value;
    if(!input) return;

    const chatBox = document.getElementById('ai-chat-box');
    chatBox.innerHTML += `<div style="margin-bottom: 1rem; color: var(--primary);"><strong>You:</strong> ${input}</div>`;
    document.getElementById('ai-input').value = '';

    const keys = JSON.parse(localStorage.getItem('bizztrak_cloud_keys') || '{}');
    const apiKey = keys.gemini;
    if(!apiKey) {
        chatBox.innerHTML += `<div style="margin-bottom: 1rem; color: var(--danger);"><strong>System:</strong> Please set your Gemini API Key in the Settings first!</div>`;
        return;
    }

    const loadingId = 'ai-load-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" style="margin-bottom: 1rem; color: var(--text-light);"><em>AI is thinking...</em></div>`;

    // Context for AI
    const currentMonth = getCurrentMonthKey();
    const monthSales = appData.sales[currentMonth] || [];
    let totalRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const systemContext = `You are the BizzTrak AI business assistant. The user's total revenue this month is Rs ${totalRevenue}. They have ${monthSales.length} total sales this month. Answer concisely.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemContext}\\nUser question: ${input}` }] }]
            })
        });
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        if(data.error) {
            chatBox.innerHTML += `<div style="margin-bottom: 1rem; color: var(--danger);"><strong>Error:</strong> ${data.error.message}</div>`;
        } else {
            const aiText = data.candidates[0].content.parts[0].text;
            chatBox.innerHTML += `<div style="margin-bottom: 1rem;"><strong>AI Agent:</strong> ${aiText.replace(/\\n/g, '<br>')}</div>`;
        }
    } catch(err) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div style="margin-bottom: 1rem; color: var(--danger);"><strong>Error:</strong> Failed to connect to AI.</div>`;
    }
}

window.saveCloudSettings = function() {
    const apiKey = document.getElementById('fb-apiKey').value;
    const authDomain = document.getElementById('fb-authDomain').value;
    const projectId = document.getElementById('fb-projectId').value;
    const gemini = document.getElementById('gemini-apiKey').value;
    
    localStorage.setItem('bizztrak_cloud_keys', JSON.stringify({ apiKey, authDomain, projectId, gemini }));
    showToast("Cloud Settings Saved!", "success");
    
    // Optional: Auto-init firebase if they just saved it
    if(apiKey && window.firebase) {
        try {
            firebase.initializeApp({ apiKey, authDomain, projectId });
            showToast("Firebase Connected!", "success");
        } catch(e) {}
    }
}

// Load cloud keys on startup
document.addEventListener('DOMContentLoaded', () => {
    const keys = JSON.parse(localStorage.getItem('bizztrak_cloud_keys') || '{}');
    if(keys.apiKey) {
        const el = document.getElementById('fb-apiKey');
        if(el) el.value = keys.apiKey;
    }
    if(keys.authDomain) {
        const el = document.getElementById('fb-authDomain');
        if(el) el.value = keys.authDomain;
    }
    if(keys.projectId) {
        const el = document.getElementById('fb-projectId');
        if(el) el.value = keys.projectId;
    }
    if(keys.gemini) {
        const el = document.getElementById('gemini-apiKey');
        if(el) el.value = keys.gemini;
    }
    
    // Init Firebase if keys exist
    if(keys.apiKey && window.firebase) {
        try {
            firebase.initializeApp({
                apiKey: keys.apiKey,
                authDomain: keys.authDomain,
                projectId: keys.projectId
            });
            console.log("Firebase initialized from saved keys.");
        } catch(e) {
            console.error("Firebase init error", e);
        }
    }
});
"""

with open(r"c:\Desktop\Bizness Traker\app.js", "a", encoding="utf-8") as f:
    f.write(js_code)
