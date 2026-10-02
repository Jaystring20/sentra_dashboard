/**
 * Sentra — Google Sheets API (Apps Script web app)
 *
 * Turns this spreadsheet into the database Sentra reads from:
 *   GET  ?action=feedback          → all feedback rows as JSON
 *   GET  ?action=summary           → latest executive summary (optional tab)
 *   GET  ?action=health            → quick connectivity check
 *   POST {action:"updateStatus", id, status, token}
 *                                  → changes one row's status
 *
 * Setup (see google-sheets/README.md for the full walkthrough):
 *   1. Extensions → Apps Script, paste this file, save.
 *   2. Run setupSheet() once (creates the tabs and header rows).
 *   3. Project Settings → Script properties → add SENTRA_TOKEN (any long random string).
 *   4. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
 *   5. Put the web app URL and token in Sentra's VITE_SHEETS_API_URL / VITE_SHEETS_TOKEN.
 */

var FEEDBACK_SHEET = 'feedback'
var SUMMARY_SHEET = 'executive_summaries'

var FEEDBACK_HEADERS = [
  'id', 'original_message', 'subject', 'source', 'received_at', 'customer_name', 'customer_email',
  'sentiment', 'sentiment_score', 'category', 'theme', 'issue', 'severity', 'ai_summary', 'status',
  'created_at', 'gmail_message_id',
]
var SUMMARY_HEADERS = ['generated_at', 'summary', 'highlights']
var STATUSES = ['new', 'in_review', 'actioned', 'resolved']

/* ------------------------------------------------------------------ setup */

/** Run once from the Apps Script editor. Safe to re-run: it never deletes data. */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  ensureSheet_(ss, FEEDBACK_SHEET, FEEDBACK_HEADERS)
  ensureSheet_(ss, SUMMARY_SHEET, SUMMARY_HEADERS)
  var sheet = ss.getSheetByName(FEEDBACK_SHEET)
  // Status dropdown so people editing the sheet by hand stay within valid values.
  var statusCol = FEEDBACK_HEADERS.indexOf('status') + 1
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build()
  sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule)
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name)
  var existing = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : []
  var missing = headers.filter(function (h) { return existing.indexOf(h) === -1 })
  if (missing.length) {
    sheet.getRange(1, existing.filter(String).length + 1, 1, missing.length).setValues([missing])
  }
  sheet.setFrozenRows(1)
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold')
}

/* ------------------------------------------------------------------- HTTP */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'feedback'
  try {
    if (action === 'feedback') return json_({ ok: true, rows: readRows_(FEEDBACK_SHEET) })
    if (action === 'summary') return json_({ ok: true, summary: latestSummary_() })
    if (action === 'health') return json_({ ok: true, rows: Math.max(0, sheet_(FEEDBACK_SHEET).getLastRow() - 1) })
    return json_({ ok: false, error: 'Unknown action: ' + action })
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var expected = PropertiesService.getScriptProperties().getProperty('SENTRA_TOKEN')
    if (expected && body.token !== expected) return json_({ ok: false, error: 'Invalid token' })
    if (body.action === 'updateStatus') return json_(updateStatus_(String(body.id || ''), String(body.status || '')))
    return json_({ ok: false, error: 'Unknown action: ' + body.action })
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

/* ------------------------------------------------------------------ logic */

function sheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
  if (!sheet) throw new Error('Missing tab "' + name + '". Run setupSheet() first.')
  return sheet
}

/** Every non-empty row as an object keyed by the header row. Dates become ISO strings. */
function readRows_(name) {
  var sheet = sheet_(name)
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  var headers = values[0].map(function (h) { return String(h).trim() })
  var rows = []
  for (var r = 1; r < values.length; r++) {
    var row = values[r]
    if (row.every(function (v) { return v === '' || v === null })) continue
    var obj = {}
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue
      var v = row[c]
      obj[headers[c]] = v instanceof Date ? v.toISOString() : v === '' ? null : v
    }
    // Rows added by hand may lack an id; fall back to a stable row-based one.
    if (!obj.id) obj.id = 'ROW-' + (r + 1)
    rows.push(obj)
  }
  return rows
}

function latestSummary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss.getSheetByName(SUMMARY_SHEET)) return null
  var rows = readRows_(SUMMARY_SHEET).filter(function (r) { return r.summary })
  if (!rows.length) return null
  rows.sort(function (a, b) { return String(b.generated_at || '').localeCompare(String(a.generated_at || '')) })
  var latest = rows[0]
  var highlights = latest.highlights
  if (typeof highlights === 'string') {
    try { highlights = JSON.parse(highlights) } catch (e) { highlights = highlights.split('\n') }
  }
  return {
    summary: latest.summary,
    generated_at: latest.generated_at,
    highlights: (highlights || []).filter(String),
  }
}

function updateStatus_(id, status) {
  if (STATUSES.indexOf(status) === -1) return { ok: false, error: 'Invalid status: ' + status }
  var lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    var sheet = sheet_(FEEDBACK_SHEET)
    var values = sheet.getDataRange().getValues()
    var headers = values[0].map(function (h) { return String(h).trim() })
    var idCol = headers.indexOf('id')
    var statusCol = headers.indexOf('status')
    if (idCol === -1 || statusCol === -1) return { ok: false, error: 'Sheet needs "id" and "status" columns' }
    for (var r = 1; r < values.length; r++) {
      var rowId = values[r][idCol] ? String(values[r][idCol]) : 'ROW-' + (r + 1)
      if (rowId === id) {
        sheet.getRange(r + 1, statusCol + 1).setValue(status)
        return { ok: true }
      }
    }
    return { ok: false, error: 'No feedback row with id ' + id }
  } finally {
    lock.releaseLock()
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
