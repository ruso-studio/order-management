const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/**
 * Scrapes Steadfast consignment details by phone number.
 * 
 * @param {string} phoneNumber - Customer phone number to search.
 * @param {string} cookieHeaderString - Raw session cookie string extracted from browser.
 * @returns {Promise<Object>} Formatted order details.
 */
async function scrapeByPhone(phoneNumber, cookieHeaderString) {
    if (!phoneNumber) {
        throw new Error("Phone number is required.");
    }
    if (!cookieHeaderString) {
        throw new Error("Session cookie string is required for authenticated dashboard access.");
    }

    // Launch headless browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();

    try {
        // Set viewport and User-Agent to match a real browser
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Parse and set cookies dynamically
        const cookies = cookieHeaderString.split(';').map(pair => {
            const [name, ...val] = pair.trim().split('=');
            return {
                name: name.trim(),
                value: val.join('=').trim(),
                domain: '.steadfast.com.bd',
                path: '/'
            };
        });
        await page.setCookie(...cookies);

        // 1. Navigate to Dashboard
        await page.goto('https://steadfast.com.bd/dashboard', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Check if session expired (redirected to login)
        if (page.url().includes('/login')) {
            throw new Error("Authentication failed. Session cookie might be expired or invalid.");
        }

        // 2. Type phone number into search input
        const searchInputSelector = '#searchInput';
        await page.waitForSelector(searchInputSelector, { timeout: 10000 });
        await page.click(searchInputSelector);
        
        // Clear input and type phone
        await page.evaluate((selector) => {
            document.querySelector(selector).value = '';
        }, searchInputSelector);
        await page.type(searchInputSelector, phoneNumber, { delay: 100 });

        // 3. Wait for search results container to populate
        const firstResultSelector = '#searchResults li a[href*="/user/consignment/"]';
        await page.waitForSelector(firstResultSelector, { timeout: 8000 }).catch(() => {
            throw new Error(`No consignment results found for phone number: ${phoneNumber}`);
        });

        // 4. Extract first consignment link & click
        const consignmentHref = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute('href') : null;
        }, firstResultSelector);

        if (!consignmentHref) {
            throw new Error("Result found but could not extract consignment URL.");
        }

        const targetUrl = consignmentHref.startsWith('http') 
            ? consignmentHref 
            : `https://steadfast.com.bd${consignmentHref}`;

        // Navigate directly to details page
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // 5. Parse Page DOM with Cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        // Helper function for text extraction
        const cleanText = (selector) => $(selector).text().trim().replace(/\s+/g, ' ');

        // Extract raw fields based on DOM
        const parcelInfo = $('.parcel-information');
        if (!parcelInfo.length) {
            throw new Error("Failed to locate parcel information container on details page.");
        }

        // Parse key-value metadata
        const consignmentId = parcelInfo.find('p:contains("Id :") span').text().trim();
        const invoiceId = parcelInfo.find('p:contains("Invoice :") span').text().trim();
        const trackingCode = parcelInfo.find('p:contains("Tracking Code :") a').text().trim();
        const trackingLink = parcelInfo.find('.input-group span.bg-white').text().trim();
        const createdAt = parcelInfo.find('p:contains("Created at :")').text().replace('Created at :', '').trim();
        const approvedAt = parcelInfo.find('p:contains("Approved at:")').text().replace('Approved at:', '').trim();
        const weight = parcelInfo.find('p:contains("Weight :") span').text().trim();
        const codAmount = parcelInfo.find('h6:contains("COD:")').text().replace('COD:', '').trim();
        const deliveryStatus = parcelInfo.find('label.alert').text().trim();
        const deliveryCharge = parcelInfo.find('p:contains("Delivery Charge :") span').text().trim();

        // Customer details
        const clientInfo = $('.client-info');
        const customerName = clientInfo.find('p:contains("Name :") span').text().trim();
        const customerAddress = clientInfo.find('p:contains("Address :") span').text().trim();
        const policeStation = clientInfo.find('p:contains("Policestation :") span').text().trim();
        const customerPhone = clientInfo.find('p:contains("Phone Number :") span').first().text().trim();

        // Rider & Hub details
        const riderName = $('.rider-name p.my-3 small').text().trim().split('(')[0].trim();
        const riderPhone = $('.rider-name .cell span').first().text().trim();
        const hubName = $('.zone p:contains("Hub :") span').text().trim();
        const hubContact = $('.zone p:contains("Hub Contact :") span').text().trim();

        // Structure JSON response
        const resultData = {
            query_phone: phoneNumber,
            consignment_id: consignmentId || null,
            invoice_id: invoiceId || null,
            tracking_code: trackingCode || null,
            tracking_link: trackingLink || null,
            status: deliveryStatus || "Unknown",
            financials: {
                cod_amount: codAmount || "0",
                delivery_charge: deliveryCharge || "0"
            },
            dates: {
                created_at: createdAt || null,
                approved_at: approvedAt || null
            },
            parcel_specs: {
                weight: weight || null
            },
            customer: {
                name: customerName || null,
                phone: customerPhone || phoneNumber,
                address: customerAddress || null,
                police_station: policeStation || null
            },
            logistics: {
                hub_name: hubName || null,
                hub_contact: hubContact || null,
                rider_name: riderName || null,
                rider_phone: riderPhone || null
            }
        };

        return resultData;

    } catch (error) {
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeByPhone };