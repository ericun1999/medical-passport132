function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet()
    var sheet = doc.getSheetByName('智慧醫療記錄')
    if (!sheet) {
      sheet = doc.insertSheet('智慧醫療記錄')
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['時間', '姓名', '血型', '緊急聯絡人', '病史', '藥物過敏', '常服用藥物'])
    }

    var raw = e && e.postData && e.postData.contents ? e.postData.contents : ''
    if (!raw && e && e.parameter && e.parameter.data) raw = e.parameter.data
    if (!raw) throw new Error('No post body')

    var data = JSON.parse(raw)
    sheet.appendRow([
      new Date(),
      data.name || '',
      data.blood || '',
      data.contact || '',
      data.history || '',
      data.allergy || '',
      data.meds || '',
    ])

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  } finally {
    lock.releaseLock()
  }
}
