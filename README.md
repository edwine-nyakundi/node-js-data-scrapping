# My Scraper Bot

This project is a bot that scrapes a Google Sheets document and sends an email if the date in cell D1 matches today's date.

## Setup

1. download  and unzip.
2. Navigate to the project directory.
3. Create a `.env` file in the project directory with the following content:
   ```plaintext
   EMAIL_USER=your-email@outlook.com
   EMAIL_PASS=your-email-password
   GOOGLE_SHEET_URL=your-google-sheet-url
   ```
4. Install the dependencies:
   ```sh
   npm install
   ```

## Running the Bot

- To run the bot manually:
  ```sh
  node index.js --run-now
