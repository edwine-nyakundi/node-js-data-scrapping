const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

// Function to log messages to a file
function logMessage(message) {
    fs.appendFile('maintenance_log.txt', `${new Date().toISOString()} - ${message}\n`, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
}

// Function to scrape Google Sheets
async function scrapeGoogleSheet(url, retries = 3) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Increased timeout to 60 seconds

        // Wait for the table to load
        await page.waitForSelector('table', { timeout: 60000 }); // Increased timeout to 60 seconds

        // Extract the content of cell A1
        const cellA1 = await page.evaluate(() => {
            return document.querySelector('table tbody tr:nth-child(1) td:nth-child(1)').innerText;
        });

        await browser.close();
        return cellA1;
    } catch (error) {
        if (browser) await browser.close();
        if (retries > 0) {
            logMessage(`Error scraping Google Sheet, retrying... (${retries} attempts left)`);
            return scrapeGoogleSheet(url, retries - 1);
        } else {
            logMessage(`Error scraping Google Sheet: ${error.message}`);
            throw error;
        }
    }
}

// Function to send email
async function sendEmail(subject, text) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Your Outlook email address from .env file
            pass: process.env.EMAIL_PASS  // Your Outlook email password from .env file
        }
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Sending to the same Outlook email address
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            logMessage(`Error sending email: ${error.message}`);
            return console.error(error);
        }
        logMessage(`Email sent: ${info.response}`);
    });
}

// Function to extract the date from the cell content
function extractDate(cellContent) {
    const datePattern = /Bot \((\d{2}\/\d{2}\/\d{2})\)/;
    const match = cellContent.match(datePattern);
    return match ? match[1] : null;
}

// Function to check if the date in A1 matches today's date
function checkMaintenance(cellDate) {
    // Convert cellDate to Date object
    const cellDateObj = new Date(cellDate);

    // Get today's date
    const today = new Date();

    // Compare the dates
    if (cellDateObj.toDateString() === today.toDateString()) {
        // Send an email if the dates match
        sendEmail('Truck Maintenance Notification', `Check Truck Maintenance ${today.toDateString()}`);
    } else {
        logMessage('No matching date found.');
    }
}

// Function to perform the scrape and check process
async function runScrapeAndCheck() {
    try {
        const cellA1 = await scrapeGoogleSheet(googleSheetURL);
        logMessage(`Content in A1: ${cellA1}`);
        const extractedDate = extractDate(cellA1);
        if (extractedDate) {
            logMessage(`Extracted date: ${extractedDate}`);
            checkMaintenance(extractedDate);
        } else {
            logMessage('No valid date found in cell A1.');
        }
    } catch (error) {
        logMessage(`Error in scraping and checking process: ${error.message}`);
    }
}

// Google Sheets URL
const googleSheetURL = 'https://docs.google.com/spreadsheets/d/1Av6zU_vCjOSQblRxxr_doGZFw4IXb6Oiz1YEumQWm5w/edit?usp=sharing';

// Schedule the scraping task to run daily at 5 a.m.
cron.schedule('0 5 * * *', () => {
    logMessage('Running the scraping task at 5 a.m.');
    runScrapeAndCheck();
}, {
    timezone: "America/New_York" // Adjust this to your desired timezone
});

logMessage('Scheduler is set up to run daily at 5 a.m.');

// Check for manual execution
if (process.argv.includes('--run-now')) {
    logMessage('Manual execution triggered.');
    runScrapeAndCheck();
}
