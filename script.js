// אתחול האנימציות
AOS.init();
// הצגת עלות משלוח דינמית
document.getElementById('shippingCostDisplay').textContent = CONFIG.SHIPPING_COST;
// האזנה לסיום כניסת התמונה
document.addEventListener('aos:in:5maynl', () => {
    const title = document.getElementById('m44m59');
    title.classList.add('gold-shine-active');
});

const BOOK_PRICE = CONFIG.BOOK_PRICE;
const SHIPPING_COST = CONFIG.SHIPPING_COST;
const scriptURL = CONFIG.SCRIPT_URL;

// הגדרת דרגות הנחה
const DISCOUNT_TIERS = [
    { minQty: 10, discount: 0.15, label: '15%' }, // 10+ books: 15% off
    { minQty: 5, discount: 0.10, label: '10%' },  // 5-9 books: 10% off
    { minQty: 3, discount: 0.05, label: '5%' }    // 3-4 books: 5% off
];

function getDiscount(qty) {
    for (let tier of DISCOUNT_TIERS) {
        if (qty >= tier.minQty) {
            return tier;
        }
    }
    return { discount: 0, label: '0%' };
}

function calculatePrice(qty, isShipping) {
    const unitPrice = BOOK_PRICE;
    const subtotal = qty * unitPrice;
    const discountTier = getDiscount(qty);
    const discountAmount = Math.round(subtotal * discountTier.discount);
    const afterDiscount = subtotal - discountAmount;
    const shippingCost = isShipping ? SHIPPING_COST : 0;
    const total = afterDiscount + shippingCost;

    return {
        unitPrice,
        qty,
        subtotal,
        discountTier,
        discountAmount,
        afterDiscount,
        shippingCost,
        total
    };
}

function updatePriceDisplay(pricing) {
    // עדכון תצוגת המחיר
    document.getElementById('unitPrice').textContent = '₪' + pricing.unitPrice;
    document.getElementById('quantityDisplay').textContent = pricing.qty;
    document.getElementById('subtotal').textContent = '₪' + pricing.subtotal;
    document.getElementById('shippingCost').textContent = '₪' + pricing.shippingCost;
    document.getElementById('totalPriceDisplay').textContent = '₪' + pricing.total;

    // הצגת הנחה
    const discountRow = document.getElementById('discountRow');
    const discountNotice = document.getElementById('discountNotice');

    if (pricing.discountAmount > 0) {
        discountRow.classList.remove('hidden');
        document.getElementById('discountLabel').textContent = `הנחה (${pricing.discountTier.label}):`;
        document.getElementById('discountAmount').textContent = '-₪' + pricing.discountAmount;

        // הצגת הודעת הנחה
        discountNotice.classList.remove('hidden');
        document.getElementById('discountMessage').textContent =
            `כל הכבוד! חסכת ₪${pricing.discountAmount} עם הנחת ${pricing.discountTier.label}`;
    } else {
        discountRow.classList.add('hidden');
    }
}

function toggleManualQty() {
    const qtySelect = document.getElementById('quantity');
    const manualInput = document.getElementById('manualQty');
    manualInput.classList.toggle('hidden', qtySelect.value !== 'manual');
    manualInput.required = (qtySelect.value === 'manual');
    updateView(); // עדכון מחיר מיידי
}

function updateView() {
    const qtySelect = document.getElementById('quantity');
    const manualInput = document.getElementById('manualQty');
    const isShipping = document.getElementById('shippingOption').checked;
    const addrSection = document.getElementById('addressSection');
    const addrInput = document.getElementById('address');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');

    // קבלת כמות
    let qty = 1;
    if (qtySelect.value === 'manual') {
        manualInput.classList.remove('hidden');
        manualInput.required = true;
        qty = parseInt(manualInput.value) || 1;
    } else {
        manualInput.classList.add('hidden');
        manualInput.required = false;
        qty = parseInt(qtySelect.value) || 1;
    }

    // חישוב מחיר מלא
    const pricing = calculatePrice(qty, isShipping);
    updatePriceDisplay(pricing);

    // עדכון כפתורים וכתובת
    if (isShipping) {
        addrSection.classList.remove('hidden');
        addrInput.required = true;
        btnText.textContent = "שמירת פרטים להזמנה עתידית";
        btnIcon.className = "fas fa-user-plus";
    } else {
        addrSection.classList.add('hidden');
        addrInput.required = false;
        btnText.textContent = "עבור לתשלום מאובטח";
        btnIcon.className = "fas fa-credit-card";
    }
}

// הוספת מאזינים לשינויים בזמן אמת
document.addEventListener('DOMContentLoaded', function() {
    // מאזין לשינוי בכמות
    const qtySelect = document.getElementById('quantity');
    if (qtySelect) {
        qtySelect.addEventListener('change', updateView);
    }

    // מאזין לכתיבה בשדה כמות ידנית
    const manualInput = document.getElementById('manualQty');
    if (manualInput) {
        manualInput.addEventListener('input', updateView);
    }

    // מאזינים לשינוי באופן המשלוח
    const pickupOption = document.getElementById('pickupOption');
    const shippingOption = document.getElementById('shippingOption');
    if (pickupOption) pickupOption.addEventListener('change', updateView);
    if (shippingOption) shippingOption.addEventListener('change', updateView);

    // פונקציה לשמירת נתונים ב-Google Sheets
    async function saveToGoogleSheets(formData, qty, isPickup, paymentStatus = 'לא שולם', orderId = '') {
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            quantity: qty,
            delivery: isPickup ? "איסוף עצמי" : "משלוח עתידי",
            address: isPickup ? "בני ברק" : formData.get('address'),
            paymentStatus: paymentStatus,
            orderId: orderId,
            timestamp: new Date().toLocaleString('he-IL')
        };

        try {
            await fetch(scriptURL, {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            return true;
        } catch (error) {
            console.error('Error saving to sheets:', error);
            return false;
        }
    }

    // אתחול כפתור PayPal
    function initPayPalButton() {
        const paypalContainer = document.getElementById('paypal-button-container');
        if (!paypalContainer || typeof paypal === 'undefined') {
            console.error('PayPal SDK not loaded or container not found');
            return;
        }

        paypalContainer.innerHTML = ''; // נקה כפתורים קודמים

        const isShipping = document.getElementById('shippingOption').checked;
        const qtySelect = document.getElementById('quantity');
        const manualInput = document.getElementById('manualQty');
        const qty = qtySelect.value === 'manual' ? parseInt(manualInput.value) || 1 : parseInt(qtySelect.value) || 1;

        const pricing = calculatePrice(qty, isShipping);

        paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'pay',
                height: 50
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        description: `${qty} ספרים - לכתוב את חייך מחדש`,
                        amount: {
                            currency_code: 'ILS',
                            value: pricing.total.toString(),
                            breakdown: {
                                item_total: {
                                    currency_code: 'ILS',
                                    value: pricing.afterDiscount.toString()
                                },
                                shipping: {
                                    currency_code: 'ILS',
                                    value: pricing.shippingCost.toString()
                                },
                                discount: pricing.discountAmount > 0 ? {
                                    currency_code: 'ILS',
                                    value: pricing.discountAmount.toString()
                                } : undefined
                            }
                        }
                    }],
                    application_context: {
                        shipping_preference: 'NO_SHIPPING'
                    }
                });
            },
            onApprove: async function(data, actions) {
                const statusMsg = document.getElementById('formStatus');
                statusMsg.innerHTML = "מעבד תשלום...";
                statusMsg.className = "text-center mt-4 text-gold-500 block";

                return actions.order.capture().then(async function(orderData) {
                    // שמירת נתונים ל-Google Sheets עם סטטוס תשלום
                    const leadForm = document.getElementById('leadForm');
                    const formData = new FormData(leadForm);
                    const isPickup = document.getElementById('pickupOption').checked;
                    await saveToGoogleSheets(formData, qty, isPickup, 'שולם', orderData.id);

                    // הצלחה!
                    statusMsg.innerHTML = `✓ התשלום בוצע בהצלחה!<br>מזהה הזמנה: ${orderData.id}`;
                    statusMsg.className = "text-center text-lg mt-6 text-green-400 font-bold block bg-navy-800 p-4 rounded-lg border border-green-500/50";

                    // הפניה לעמוד תודה
                    setTimeout(() => {
                        window.location.href = `thanks.html?order=${orderData.id}`;
                    }, 2000);
                });
            },
            onError: function(err) {
                console.error('PayPal Error:', err);
                const statusMsg = document.getElementById('formStatus');
                statusMsg.innerHTML = "אירעה שגיאה בתשלום. אנא נסה שנית.";
                statusMsg.className = "text-center mt-4 text-red-500 block";
            },
            onCancel: function(data) {
                const statusMsg = document.getElementById('formStatus');
                statusMsg.innerHTML = "התשלום בוטל. תוכל לנסות שוב בכל עת.";
                statusMsg.className = "text-center mt-4 text-gray-400 block";
            }
        }).render('#paypal-button-container');
    }

    // מאזין לשליחת טופס
    const leadForm = document.getElementById('leadForm');
    if (leadForm) {
        leadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // בדיקת תקינות טלפון
            const phoneInput = document.getElementById('phone');
            const phoneRegex = /^05\d{8}$/;

            if (!phoneRegex.test(phoneInput.value)) {
                alert("נא להזין מספר טלפון ישראלי תקין (10 ספרות, מתחיל ב-05)");
                phoneInput.focus();
                return;
            }

            // בדיקת תקינות כל השדות
            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            const statusMsg = document.getElementById('formStatus');
            const isPickup = document.getElementById('pickupOption').checked;
            const formData = new FormData(this);
            const qty = formData.get('quantity') === 'manual' ? formData.get('manualQty') : formData.get('quantity');

            if (isPickup) {
                // איסוף עצמי - הצג כפתור PayPal
                submitBtn.classList.add('hidden');
                const paypalContainer = document.getElementById('paypal-button-container');
                paypalContainer.classList.remove('hidden');

                statusMsg.innerHTML = "נא להשלים את התשלום דרך PayPal:";
                statusMsg.className = "text-center mt-4 text-gold-400 block";

                // אתחול כפתור PayPal
                initPayPalButton();
            } else {
                // משלוח עתידי - שמור נתונים בלבד
                submitBtn.disabled = true;
                statusMsg.innerHTML = "שומר נתונים...";
                statusMsg.className = "text-center mt-4 text-gold-500 block";

                const saved = await saveToGoogleSheets(formData, qty, isPickup, 'לא שולם - הזמנה עתידית', '');

                if (saved) {
                    statusMsg.innerHTML = "פרטיך נשמרו בהצלחה! נחזור אליך כשיתאפשרו המשלוחים.";
                    statusMsg.className = "text-center text-lg mt-6 text-gold-400 font-bold block bg-navy-800 p-4 rounded-lg border border-gold-500/50";
                    submitBtn.classList.add('hidden');
                } else {
                    statusMsg.innerHTML = "אירעה שגיאה. נסה שנית.";
                    statusMsg.className = "text-center mt-4 text-red-500 block";
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // עדכון ראשוני
    updateView();

    // טיפול בטופס יצירת קשר
    const contactForm = document.getElementById('contactForm');
    console.log('Contact form found:', contactForm); // Debug log
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Contact form submitted'); // Debug log

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const statusMsg = document.getElementById('contactFormStatus');
            const formData = new FormData(this);

            // בדיקת תקינות השדות
            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            // שינוי מצב הכפתור
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>שולח...</span>';

            statusMsg.textContent = 'שולח הודעה...';
            statusMsg.className = 'text-center text-sm mt-4 text-gold-400 block';

            // הכנת נתונים לשליחה
            const contactData = {
                type: 'contact',
                name: formData.get('contactName'),
                email: formData.get('contactEmail'),
                phone: formData.get('contactPhone'),
                message: formData.get('contactMessage'),
                timestamp: new Date().toLocaleString('he-IL')
            };

            try {
                // שליחה ל-Google Sheets
                await fetch(scriptURL, {
                    method: "POST",
                    mode: 'no-cors',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(contactData)
                });

                // הצגת הודעת הצלחה
                statusMsg.textContent = '✓ ההודעה נשלחה בהצלחה! נחזור אליך בהקדם.';
                statusMsg.className = 'text-center text-sm mt-4 text-green-400 font-bold block';

                // איפוס הטופס
                this.reset();

                // החזרת הכפתור למצב רגיל
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>שלח הודעה</span>';
                    statusMsg.className = 'text-center text-sm mt-4 hidden';
                }, 3000);

            } catch (error) {
                console.error('Error sending contact form:', error);
                statusMsg.textContent = 'אירעה שגיאה בשליחה. אנא נסה שנית.';
                statusMsg.className = 'text-center text-sm mt-4 text-red-400 block';

                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>שלח הודעה</span>';
            }
        });
    }
});