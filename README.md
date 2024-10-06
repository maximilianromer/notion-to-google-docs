# Convert Notion Databases into a Google Doc

### Overview

This guide will help you convert Notion Databases into Google Docs. We will cover three main steps:

1.  Setting up the Notion API connection.
    
2.  Creating Google Sheets and Google Docs, and setting up Google Scripts.
    
3.  Automating the process to pull data from Notion and push it to Google Docs every hour.
    

----------

### Step 1: Setting Up Notion Connection and Getting API Key

1.  **Create a Notion Integration:**
    
    -   Go to Notion Developers Page and click "New Integration".
        
    -   Give your integration a name (e.g., "Google Docs Integration"), and select the appropriate workspace.
        
    -   Click "Submit" to generate your API key. **Copy** this key; you'll need it shortly.
        
2.  **Add Integration to Notion Database:**
    
    -   Open the Notion Database you want to export.
        
    -   Click on the **three dots** on the top-right corner and select "Add Connections".
        
    -   Search for and add your newly created integration.
        

----------

### Step 2: Setting Up Google Sheets and Google Docs with Google Scripts

#### 1. **Create a New Google Sheet:**

-   Open Google Sheets and create a new spreadsheet. Name it something like "Notion Note Export Sheet".
    
-   **Copy the Spreadsheet ID**: You can find the ID in the URL of your Google Sheet. It’s located at `https://docs.google.com/spreadsheets/d/SHEET-ID-HERE/edit`.
    

#### 2. **Create a New Google Doc:**

-   Open Google Docs and create a new document. Name it whatever you want, as this will be the document you will actually be accessing.
    
-   **Note the Document ID**: The ID is found in the URL, similar to the spreadsheet: `https://docs.google.com/document/d/SHEET-ID-HERE/edit`.
    

#### 3. **Set Up Google Scripts for Pulling Data from Notion**:

-   **Open the Script Editor** in your Google Sheet: Click on **Extensions** > **Apps Script**.
    
-   **Upload the Script**: Copy the contents from [Pull Notion.gs](https://github.com/maximilianromer/notion-to-google-docs/blob/main/Pull%20Notion.gs):

```javascript
function dothing() {
    const NOTION_API_KEY = 'YOUR_NOTION_API_KEY_HERE';
    const DATABASE_ID = 'YOUR_DATABASE_ID_HERE';
  
    function importNotionData() {
      const pages = queryDatabase(DATABASE_ID);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      sheet.clearContents();
      sheet.appendRow(['Title', 'Content']);
  
      pages.forEach(page => {
        const title = getTitle(page);
        const content = getPageContent(page.id);
        sheet.appendRow([title, content]);
      });
    }
  
    function queryDatabase(databaseId) {
      const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28'
        },
        muteHttpExceptions: true
      };
  
      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());
  
      if (data.error) {
        throw new Error(`Error querying database: ${data.error.message}`);
      }
  
      return data.results;
    }
  
    function getTitle(page) {
      const titleProperty = page.properties['Name'] || page.properties['Title'];
      if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
        return titleProperty.title[0].plain_text;
      }
      return 'Untitled';
    }
  
    function getPageContent(pageId) {
      let content = '';
      let url = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`;
      const headers = {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      };
  
      do {
        const options = {
          method: 'get',
          headers: headers,
          muteHttpExceptions: true
        };
  
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());
  
        data.results.forEach(block => {
          content += extractTextFromBlock(block) + '\n';
        });
  
        if (data.has_more) {
          url = `https://api.notion.com/v1/blocks/${pageId}/children?start_cursor=${data.next_cursor}&page_size=100`;
        } else {
          url = null;
        }
      } while (url);
  
      return content.trim();
    }
  
    function extractTextFromBlock(block) {
      let text = '';
      const blockType = block.type;
      const blockContent = block[blockType];
  
      if (blockType === 'paragraph') {
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'heading_1') {
        text += '# ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'heading_2') {
        text += '## ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'heading_3') {
        text += '### ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'bulleted_list_item') {
        text += '- ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'numbered_list_item') {
        text += '1. ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'to_do') {
        text += '- [ ] ';
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else if (blockType === 'toggle') {
        blockContent.rich_text.forEach(t => {
          text += t.plain_text;
        });
      } else {
      }
  
      if (block.has_children) {
        const childBlocks = getChildBlocks(block.id);
        childBlocks.forEach(childBlock => {
          text += '\n' + extractTextFromBlock(childBlock);
        });
      }
  
      return text.trim();
    }
  
    function getChildBlocks(blockId) {
      let blocks = [];
      let url = `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`;
      const headers = {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      };
  
      do {
        const options = {
          method: 'get',
          headers: headers,
          muteHttpExceptions: true
        };
  
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());
  
        if (data.error) {
          throw new Error(`Error fetching child blocks: ${data.error.message}`);
        }
  
        blocks = blocks.concat(data.results);
  
        if (data.has_more) {
          url = `https://api.notion.com/v1/blocks/${blockId}/children?start_cursor=${data.next_cursor}&page_size=100`;
        } else {
          url = null;
        }
      } while (url);
  
      return blocks;
    }
  }
```
    
-   **Replace Variable Placeholders**:
    
    -   `YOUR_NOTION_API_KEY_HERE`: Replace the placeholder with your Notion API key.
        
    -   `YOUR_DATABASE_ID_HERE`: Replace the placeholder with your Notion Database ID. It's located at `https://www.notion.so/username/YOUR_DATABASE_ID_HERE?v=abunchanumbers`
        
-   **Save and Run** the script by pressing the **floppy disc icon** and the **Run** button. The Google Sheet should instantly populate with every page in the Database.
    

#### **4. Push Data from Google Sheet to Google Docs:**

-   **Create a new script** by clicking **+** > **Script**. Name it `Push Docs.gs`. Paste in the contents of [Push Docs.gs](https://github.com/maximilianromer/notion-to-google-docs/blob/main/Push%20Docs.gs):

```javascript
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
```

-   **Replace Variable Placeholders**:
    
    -   **Google Doc ID**: Replace the placeholder with your desired Google Doc ID. Again, this can be found at `https://docs.google.com/spreadsheets/d/SHEET-ID-HERE/edit`.
        
-   **Save and Run** the script by pressing the floppy disc icon and the Run button. The Google Doc should instantly populate with every page in the Database.
    

Congratulations! You now have your Notion Database exported into a Google Doc. Read on if you want to make it automatically update.

----------

### Step 3: Automate Script Execution

To keep your Notion data synced with Google Docs automatically, you'll set up triggers for both Google Scripts.

#### 1. **Setting Up Trigger for Pulling Data from Notion**:

-   **Open the Script Editor** in your Google Sheet.
    
-   Click on the **Clock Icon** on the left menu to access the **Triggers** section.
    
-   Click on **+ Add Trigger**.
    
-   Set up the trigger as follows:
    
    -   **Choose which function to run**: Select the main function in Pull Notion.gs, `dothing`.
        
    -   **Select event source**: Choose "Time-driven".
        
    -   **Select type of time-based trigger**: Choose "Hour timer" and set it to "Every hour".
        
-   Click **Save** to set up the hourly execution.
    

#### 2. **Setting Up Trigger for Pushing Data to Google Docs**:

-   Repeat the above steps for the main function in Push Docs.gs, `updateGoogleDoc`.
    
-   Click **Save**.


Your Google Doc will now automatically update with changes to your Notion Database every hour. Enjoy!
