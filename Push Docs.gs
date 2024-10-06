function updateGoogleDoc() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
  
    var dataRange = sheet.getDataRange();
    var data = dataRange.getValues();
  
    data.shift();
  
    var docId = 'YOUR_GOOGLE_DOC_ID_HERE';
  
    var doc = DocumentApp.openById(docId);
  
    doc.getBody().clear();
  
    data.forEach(function(row) {
      var title = row[0];
      var content = row[1];
  
      if (title) {
        doc.getBody().appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      }
  
      if (content) {
        doc.getBody().appendParagraph(content);
      }
    });
  
    doc.saveAndClose();
}