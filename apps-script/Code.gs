/**
 * knoll.space signup endpoint.
 *
 * Lives inside the "Knoll Signups" spreadsheet (Extensions > Apps Script).
 * Deploy: Deploy > New deployment > Web app, Execute as "Me",
 * Who has access "Anyone" (NOT "Anyone with Google account").
 * Copy the /exec URL into SIGNUP_ENDPOINT in index.html.
 *
 * Editing this later: Deploy > Manage deployments > pencil > Version:
 * "New version" > Deploy. Saving alone does not update the live URL.
 */

// The tab name inside the spreadsheet. Headers in row 1:
// A Timestamp | B Email | C Category | D Source
const SHEET_NAME = 'Signups';

function doPost(e) {
  // Stops two simultaneous signups from clobbering the same row.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return json({ ok: false, error: 'sheet_not_found' });

    // Accept either JSON or plain form fields.
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); }
      catch (err) { data = (e && e.parameter) || {}; }
    } else {
      data = (e && e.parameter) || {};
    }

    // Honeypot: real people leave this blank, bots fill it in.
    if (data.website) return json({ ok: true, duplicate: false });

    const email = String(data.email || '').trim().toLowerCase();
    const category = String(data.category || '').trim();
    const source = String(data.source || '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return json({ ok: false, error: 'invalid_email' });
    }

    // Already on the list? Say yes, but don't add a second row.
    if (sheet.getLastRow() > 1) {
      const seen = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
        .getValues()
        .map(function (r) { return String(r[0]).trim().toLowerCase(); });
      if (seen.indexOf(email) !== -1) {
        return json({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([new Date(), email, category, source]);
    return json({ ok: true, duplicate: false });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you sanity-check the URL in a browser.
function doGet() {
  return json({ ok: true, message: 'knoll signups endpoint is live' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
