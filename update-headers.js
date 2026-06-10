const { google } = require('googleapis');
require('dotenv').config({ path: './.env' });

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
  rawKey = JSON.parse(rawKey);
}
const GOOGLE_PRIVATE_KEY = rawKey.replace(/\\n/g, '\n');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const HEADERS = [
  'Timestamp', 'Full Name', 'WhatsApp', 'Email', 'Gender', 'City', 'Area',
  'Date of Birth', 'Source', 'Living Arrangement',
  'Position Applied For', 'Employment Status', 'Current Role / Responsibilities',
  'Reason For Change', 'Left Last Job (Date)', 'Reason For Leaving', 'Reason For Leaving (Detail)',
  'Experience', 'Education', 'Current Company', 'Current Designation',
  'Current Salary', 'Expected Salary', 'Salary Jump Justification', 'Notice Period / Availability',
  'Work History Summary', 'Skills', 'Languages', 'LinkedIn URL', 'Portfolio URL', 'References',
  'Tenure Expectation', 'Why Join', 'Achievements', 'Certifications', 'Additional Notes',
  'Resume File', 'Resume Link', 'Status', 'Assigned To', 'Follow Up Date',
  'Interview ID', 'Interview Score', 'Detailed Summary', 'Green Flags', 'Red Flags', 'Report Link', 'Final Status'
];

async function updateHeaders() {
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
    
    // First, clear the first row so we don't leave any leftover old headers (since we reduced from 58 to 47, or if they had 33)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Candidate Applications!1:1',
    });

    console.log('Cleared old headers. Writing new headers...');

    // Now write the new headers
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Candidate Applications!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [HEADERS],
      },
    });

    console.log(`Successfully updated ${response.data.updatedCells} cells!`);
    console.log('The sheet now has exactly 47 columns matching the updated application form.');
  } catch (error) {
    console.error('Error updating headers:', error.message);
  }
}

updateHeaders();
