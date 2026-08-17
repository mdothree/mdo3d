# State Corporation Databases

## Florida ✅ (Working)
- **SFTP Host:** sftp.floridados.gov
- **User:** Public
- **Pass:** PubAccess1845!
- **Format:** Fixed-width TXT
- **Location:** doc/cor/yyyymmddc.txt

## Other States Found

### West Virginia
- **Bulk Data:** https://apps.wv.gov/sos/bulkdata/
- **Requires:** Registration required

### Kentucky
- **Bulk Data:** https://www.sos.ky.gov/bus/Pages/Bulk-Data-Service.aspx
- **Requires:** Monthly subscription

### Arkansas
- **Bulk Data:** https://portal.arkansas.gov/service/ar-corp-bulk-data-download/
- **Requires:** Account required

### Tennessee
- **Data Download:** https://tnbear.tn.gov/Ecommerce/DBDownloadWizard.aspx
- **Requires:** Account required (paid)

### Texas
- **Corp Search:** https://direct.sos.state.tx.us/help/help-corp.asp?pg=bulk
- **Requires:** Account + fees

### New York
- **Search API:** https://apify.com/clawdeus/ny-biz-lookup
- **Notes:** No bulk download, API-based only

### Washington
- **Search API:** http://finditconsumer.wa.gov/corps/searchapi.aspx
- **Notes:** API access available

## Recommendations

1. **States with bulk SFTP/FTP access:** Research individually
2. **Web scraping:** Risk of blocking
3. **API services:** Apify has multi-state scrapers
4. **Paid services:** Corporation Service Company (CSC), Wolters Kluwer

## Expansion Strategy

1. Focus on states with public data access first
2. Build state-specific parsers for each format
3. Consider Apify API for NY, TX (already has integrations)
4. Rate limiting critical to avoid IP blocks

## Notes

- Florida is unusual in having completely free public SFTP
- Most states charge for bulk data
- Format varies significantly by state
