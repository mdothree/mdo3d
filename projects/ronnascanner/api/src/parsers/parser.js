import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

/**
 * Server-side resume parser
 * Handles PDF and DOCX file parsing
 */

export class ServerResumeParser {
  async parse(filePath, fileType) {
    if (fileType === 'application/pdf') {
      return await this.parsePDF(filePath);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await this.parseDOCX(filePath);
    } else {
      throw new Error('Unsupported file type');
    }
  }

  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  async parseDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }
}
