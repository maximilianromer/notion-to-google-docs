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