# State Corporation Databases

Implementation status and the adapter interface: `docs/STATE_ADAPTERS.md`.
Order (plan §C5): free bulk/open data first, then registration-required, then paid. **Paid feeds are a spend
decision for the Principal; registration-required ones need a Principal account step.** Neither is implemented.

| state | access | status |
|---|---|---|
| FL | free bulk SFTP (public login) | adapter #1, live in ingest |
| CO | free open data (Socrata 4ykn-tg5h, Public Domain) | adapter #2, live in ingest |
| CT | free open data (data.ct.gov n7gp-d28j, Public Domain) | adapter #3, live in ingest |
| OR | free open data (data.oregon.gov tckn-sxa6; no licence in metadata) | candidate; one row per associated person, check terms first |
| WV, AR | registration required | Principal account step |
| KY, TN, TX | paid | spend decision |

## Florida ✅ (Working)
- **SFTP Host:** sftp.floridados.gov
- **User:** Public
- **Pass:** PubAccess1845!
- **Format:** Fixed-width TXT
- **Location:** doc/cor/yyyymmddc.txt

## Colorado ✅ (Working)
- **Dataset:** https://data.colorado.gov/Business/Business-Entities-in-Colorado/4ykn-tg5h
- **API:** `https://data.colorado.gov/resource/4ykn-tg5h.json?$where=entityformdate='2026-10-09T00:00:00'`
- **Licence:** Public Domain; daily refresh; no registration (optional free Socrata app token for rate limits)

## Connecticut ✅ (Working)
- **Dataset:** https://data.ct.gov/Business/Connecticut-Business-Registry-Business-Master/n7gp-d28j
- **API:** `https://data.ct.gov/resource/n7gp-d28j.json?$where=date_registration='2026-10-09T00:00:00'`
- **Licence:** Public Domain (attribution Secretary of the State); daily refresh; no registration (optional free
  Socrata app token). Publishes NAICS and the business email on the filing; ~150–230 new rows per weekday.

## Oregon (candidate)
- **Dataset:** https://data.oregon.gov/resource/tckn-sxa6.json ("Active Businesses - ALL"), filter `registry_date`
- One row per associated name (registered agent, members): group by `registry_number`. No licence in metadata.

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
