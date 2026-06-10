const { google } = require('googleapis');
require('dotenv').config({ path: './.env' });

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

// Handle private key formatting safely
let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
  rawKey = JSON.parse(rawKey);
}
const GOOGLE_PRIVATE_KEY = rawKey.replace(/\\n/g, '\n');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function getHeaders() {
  if (!GOOGLE_PRIVATE_KEY) {
    console.error('Missing private key');
    return;
  }
  try {
    console.log(`Connecting to Sheet ID: ${GOOGLE_SHEET_ID}`);
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY,
      SCOPES
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Candidate Applications!1:1', // Gets the entire first row
    });

    const headers = response.data.values ? response.data.values[0] : [];
    
    console.log('\n=== COLUMNS IN "Candidate Applications" SHEET ===\n');
    if (headers.length === 0) {
      console.log('No headers found. The sheet might be empty or missing the first row.');
    } else {
      headers.forEach((header, index) => {
        // Convert column index (0, 1, 2...) to letter (A, B, C...)
        let temp = index;
        let letter = '';
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        console.log(`Column ${letter}: ${header}`);
      });
    }
    console.log('\nTotal columns:', headers.length);
  } catch (error) {
    console.error('Error fetching headers:', error.message);
  }
}

getHeaders();
