#!/usr/bin/env python3
"""
mdothree family SEO / metadata / brand-asset generator.

Rewrites the <head> SEO block of every served HTML page for mdothree.com and the
nine tool subdomains, standardises the "mdothree" wordmark, and regenerates the
share image + icons from one SVG template.

Usage (from repo root):  python3 projects/mdothree/landing/scripts/seo/build_seo.py
Requires: rsvg-convert, ImageMagick (`magick`), fonts Inter + JetBrains Mono.

Outputs per site (public/ = Vercel output dir):
  og-image.png (1200x630), favicon.svg, favicon.ico (16/32), apple-touch-icon.png (180),
  icon-192.png, icon-512.png, site.webmanifest (+ manifest.json kept in sync), sitemap.xml
Sources are written to <site>/brand/{og-image.svg,icon.svg} so they can be edited/re-rendered.
Idempotent: safe to re-run.
"""
import json, os, re, subprocess, sys, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
MDO = os.path.normpath(os.path.join(ROOT, '..', '..', '..'))  # projects/mdothree
BRAND = 'mdothree'
GREEN = '#10B981'
BG = '#0F172A'
TODAY = datetime.date.today().isoformat()

# ---------------------------------------------------------------------------
# Page metadata. path: clean URL path ('' = home). noindex pages are left out
# of sitemap.xml. app: JSON-LD WebApplication for tool pages.
# ---------------------------------------------------------------------------
def P(file, title, desc, kw, app=True, noindex=False, canonical=True):
    return dict(file=file, title=title, desc=desc, kw=kw, app=app, noindex=noindex, canonical=canonical)

def pricing(tool):
    return P('pricing.html', f'{tool} Pricing — {BRAND}',
             f'Compare the free plan with mdothree Pro for {tool}. Pro costs $4.99/month and adds unlimited file processing, batch operations, and premium tools.',
             [f'{tool.lower()} pricing', 'mdothree pro', 'subscription', 'pricing', 'online tools'], app=False)

def account(tool):
    return P('account.html', f'Account — {BRAND} {tool}',
             f'Manage your mdothree Pro subscription for {tool}: view your usage history, update billing details, and sign in or out of your account.',
             ['mdothree account', 'pro subscription', 'billing', 'usage history', 'sign in'], app=False, noindex=True)

def notfound(tool):
    return P('404.html', f'Page Not Found — {BRAND} {tool}',
             f'The page you were looking for on mdothree {tool} could not be found. Head back to the {tool} home page to browse every available tool.',
             ['404', 'page not found', 'missing page', 'mdothree', tool.lower()], app=False, noindex=True, canonical=False)

SITES = [
  dict(dir='landing', domain='mdothree.com', name='mdothree', short='mdothree', glyph='m3',
       tagline='Everyday utility tools for files, text and code',
       tagline2='PDF · Image · QR · JSON · Hash · Time · Color · Text · Password',
       category='UtilitiesApplication', home=True, pages=[
    P('index.html', 'Free Browser Utility Tools — mdothree',
      'Simple browser tools for everyday tasks: merge and split PDFs, resize images, format JSON, generate hashes, QR codes, and passwords, and convert timestamps.',
      ['online tools', 'browser tools', 'pdf tools', 'image tools', 'json formatter', 'hash generator', 'qr code generator', 'password generator'], app=False),
    P('pro.html', 'Upgrade to Pro — mdothree',
      'mdothree Pro unlocks bcrypt and HMAC hashing, batch hashing, the breach checker, the cron parser, business days, gradients, and the colorblind simulator.',
      ['mdothree pro', 'upgrade', 'hmac generator', 'bcrypt', 'breach checker', 'cron parser', 'pricing'], app=False),
    P('privacy.html', 'Privacy Policy — mdothree',
      'Read the mdothree privacy policy covering the browser utility tools, Pro accounts and payments, and the third-party services the sites rely on to run.',
      ['privacy policy', 'mdothree', 'data', 'cookies', 'pro account'], app=False),
    P('terms.html', 'Terms of Service — mdothree',
      'The terms of service for using the mdothree browser utility tools and the mdothree Pro subscription, including acceptable use, billing, and liability.',
      ['terms of service', 'mdothree', 'terms', 'subscription', 'acceptable use'], app=False),
    P('success.html', 'Payment Successful — mdothree',
      'Your mdothree Pro payment went through. Return to any mdothree tool to start using the Pro features that are included with your new subscription.',
      ['mdothree pro', 'payment', 'subscription', 'upgrade', 'success'], app=False, noindex=True),
    P('404.html', 'Page Not Found — mdothree',
      'The page you were looking for on mdothree could not be found. Head back to the home page to browse the full set of free browser utility tools.',
      ['404', 'page not found', 'missing page', 'mdothree', 'online tools'], app=False, noindex=True, canonical=False),
  ]),
  dict(dir='mdothree-color', domain='color.mdothree.com', name='Color Tools', short='Color Tools', glyph='RGB',
       tagline='Convert, mix and test colors in your browser', category='DesignApplication', pages=[
    P('index.html', 'Color Picker: HEX, RGB, HSL & CMYK — mdothree',
      'Pick any color and instantly get its HEX, RGB, HSL, and CMYK values, with eyedropper support. Part of the mdothree color tools that run in your browser.',
      ['color picker', 'hex to rgb', 'rgb to hex', 'hsl', 'cmyk', 'eyedropper', 'color tools']),
    P('converter.html', 'Color Converter: HEX, RGB, HSL, CMYK — mdothree',
      'Convert colors between HEX, RGB, HSL, HSV, and CMYK formats with a single click. Paste any value and copy the result in the format you need.',
      ['color converter', 'hex to rgb', 'rgb to hsl', 'hsv', 'cmyk converter', 'color codes']),
    P('shades.html', 'Color Shades Generator — mdothree',
      'Generate a full lightness scale of tints and shades from any base color, then export it as CSS custom properties or SCSS variables for your project.',
      ['shades generator', 'tints and shades', 'color scale', 'css variables', 'scss variables']),
    P('mixer.html', 'Color Mixer — mdothree',
      'Blend two colors together at any ratio and preview the full mix strip from 0% to 100%. A quick way to find in-between colors for UI and design work.',
      ['color mixer', 'blend colors', 'mix two colors', 'color blend', 'color ratio']),
    P('contrast.html', 'WCAG Contrast Checker — mdothree',
      'Check foreground and background color contrast ratios against the WCAG AA and AAA accessibility standards, right in your browser, before you ship a design.',
      ['contrast checker', 'wcag contrast', 'color contrast ratio', 'accessibility', 'wcag aa', 'wcag aaa']),
    P('palette-generator.html', 'Color Palette Generator — mdothree',
      'Generate complementary, analogous, triadic, and monochromatic color palettes from any base color, and save your favorite palettes for later use.',
      ['palette generator', 'color palette', 'complementary colors', 'analogous', 'triadic', 'monochromatic']),
    P('gradient.html', 'CSS Gradient Generator — mdothree',
      'Create CSS linear, radial, and conic gradients with a live preview, then copy the result as CSS or a Tailwind class. Included with mdothree Pro.',
      ['css gradient generator', 'linear gradient', 'radial gradient', 'conic gradient', 'tailwind gradient']),
    P('colorblind.html', 'Colorblind Simulator — mdothree',
      'Simulate how colors appear to people with protanopia, deuteranopia, or tritanopia color vision deficiency. The simulator is included with mdothree Pro.',
      ['colorblind simulator', 'protanopia', 'deuteranopia', 'tritanopia', 'color blindness', 'accessibility']),
    notfound('Color Tools'),
  ]),
  dict(dir='mdothree-hash', domain='hash.mdothree.com', name='Hash Generator', short='Hash Tools', glyph='#',
       tagline='Hashes, HMAC, UUIDs and encoding, client-side', category='DeveloperApplication', pages=[
    P('index.html', 'Hash Generator: MD5, SHA-256, SHA-512 — mdothree',
      'Generate cryptographic hashes such as MD5, SHA-1, SHA-256, and SHA-512 instantly. Hashing runs client-side in your browser; bcrypt is available with Pro.',
      ['hash generator', 'md5', 'sha-256', 'sha-512', 'sha-1', 'bcrypt', 'checksum']),
    P('encode.html', 'Base64, Base32 & Hex Encoder/Decoder — mdothree',
      'Encode and decode text in Base64, Base64URL, Base32, and Hex formats instantly in your browser. Paste your input and copy the converted output.',
      ['base64 encode', 'base64 decode', 'base64url', 'base32', 'hex encoder', 'decoder']),
    P('uuid.html', 'UUID Generator: v1, v4, v5 — mdothree',
      'Generate UUIDs in version 1 (time-based), version 4 (random), or version 5 (name-based SHA-1) formats, one at a time or in bulk, then copy them.',
      ['uuid generator', 'guid generator', 'uuid v4', 'uuid v1', 'uuid v5', 'bulk uuid']),
    P('hmac.html', 'HMAC Generator: SHA-256, SHA-512 — mdothree',
      'Generate HMAC signatures with SHA-256, SHA-384, SHA-512, or SHA-1 from a message and secret key, computed in your browser. Included with mdothree Pro.',
      ['hmac generator', 'hmac sha256', 'hmac sha512', 'signature', 'secret key', 'webhook signature']),
    P('checker.html', 'Hash Checker: Verify File Integrity — mdothree',
      'Verify file or text integrity by comparing it against a known hash value. Supports SHA-256, SHA-512, MD5, and more, with every check done in your browser.',
      ['hash checker', 'verify checksum', 'file integrity', 'sha-256 checksum', 'md5 checksum']),
    P('batch.html', 'Batch Hash Generator — mdothree',
      'Hash many strings at once, one per line, with SHA-256, MD5, SHA-1, or CRC32, and export the results as CSV. Batch hashing is included with mdothree Pro.',
      ['batch hash', 'bulk hash generator', 'crc32', 'sha-256', 'md5', 'csv export']),
    notfound('Hash Generator'),
  ]),
  dict(dir='mdothree-timestamp', domain='timestamp.mdothree.com', name='Timestamp Converter', short='Timestamp', glyph='UTC',
       tagline='Unix time, timezones, durations and cron', category='DeveloperApplication', pages=[
    P('index.html', 'Unix Timestamp Converter — mdothree',
      'Convert Unix timestamps to human-readable dates and back again, with a live epoch counter and output in several common date and time formats.',
      ['unix timestamp converter', 'epoch converter', 'unix time', 'epoch to date', 'date to timestamp']),
    P('timezone-converter.html', 'Timezone Converter — mdothree',
      'Convert a date and time across any world timezone and save the timezone pairs you use most as presets for quick conversions later on.',
      ['timezone converter', 'time zone converter', 'world clock', 'utc converter', 'time difference']),
    P('duration-calculator.html', 'Duration Calculator — mdothree',
      'Calculate the exact duration between two dates, or add and subtract days, hours, and minutes from any date to find the resulting date and time.',
      ['duration calculator', 'date difference', 'time between dates', 'add days to date', 'date calculator']),
    P('age-calculator.html', 'Age Calculator — mdothree',
      'Calculate an exact age in years, months, days, hours, minutes, and seconds from any birth date or starting date, computed right in your browser.',
      ['age calculator', 'exact age', 'birthday calculator', 'how old am i', 'date of birth']),
    P('business-days.html', 'Business Days Calculator — mdothree',
      'Count the business days between two dates, or find the date that falls N working days after a start date. The calculator is included with mdothree Pro.',
      ['business days calculator', 'working days', 'weekdays between dates', 'add business days', 'workday calculator']),
    P('countdown.html', 'Countdown Timer to Any Date — mdothree',
      'Set a live countdown timer to any date or event and watch the days, hours, minutes, and seconds remaining tick down in real time in your browser.',
      ['countdown timer', 'countdown to date', 'event countdown', 'days until', 'timer']),
    P('cron-parser.html', 'Cron Expression Parser — mdothree',
      'Parse and explain cron expressions in plain English and preview the next five run times for any schedule. The cron parser is included with mdothree Pro.',
      ['cron parser', 'cron expression', 'crontab', 'cron schedule', 'next run time', 'cron explained']),
    notfound('Timestamp Converter'),
  ]),
  dict(dir='mdothree-password', domain='password.mdothree.com', name='Password Generator', short='Passwords', glyph='***',
       tagline='Strong passwords, passphrases and PINs', category='SecurityApplication', pages=[
    P('index.html', 'Secure Password Generator — mdothree',
      'Generate cryptographically secure random passwords with custom length and character sets, plus a strength analysis, all created locally in your browser.',
      ['password generator', 'random password', 'secure password', 'strong password', 'password creator']),
    P('strength.html', 'Password Strength Checker — mdothree',
      'Test how strong a password is in real time with entropy analysis, a strength score, and suggestions for improving it, checked locally in your browser.',
      ['password strength checker', 'password entropy', 'password tester', 'how strong is my password', 'password security']),
    P('passphrase.html', 'Passphrase Generator — mdothree',
      'Generate memorable passphrases from randomly chosen words. Long passphrases are easier to remember than random strings and can be just as strong.',
      ['passphrase generator', 'diceware', 'memorable password', 'random words', 'password phrase']),
    P('pin.html', 'Random PIN Generator — mdothree',
      'Generate cryptographically secure numeric PINs of configurable length, with options that avoid sequential and repeating digits for safer codes.',
      ['pin generator', 'random pin', 'secure pin', 'numeric code', '4 digit pin', '6 digit pin']),
    P('breach.html', 'Password Breach Checker — mdothree',
      'Check whether a password appears in known data breaches via the HaveIBeenPwned k-anonymity API, so the full password is never sent. Included with Pro.',
      ['password breach checker', 'haveibeenpwned', 'pwned passwords', 'data breach', 'k-anonymity']),
    notfound('Password Generator'),
  ]),
  dict(dir='mdothree-json', domain='json.mdothree.com', name='JSON Tools', short='JSON Tools', glyph='{ }',
       tagline='Format, validate, convert and diff JSON', category='DeveloperApplication', pages=[
    P('index.html', 'JSON Formatter, Validator & Converter — mdothree',
      'Free JSON tools: format and validate JSON, convert it to YAML, CSV, XML, or TypeScript, compare two documents, encode Base64, and run JSONPath queries.',
      ['json formatter', 'json validator', 'json to yaml', 'json to csv', 'json diff', 'jsonpath', 'json tools']),
    P('format.html', 'JSON Formatter & Beautifier — mdothree',
      'Beautify or minify JSON with syntax highlighting and adjustable indentation, then copy the result or download it as a .json file from your browser.',
      ['json formatter', 'json beautifier', 'json minifier', 'pretty print json', 'format json']),
    P('validate.html', 'JSON Validator — mdothree',
      'Check JSON syntax and pinpoint the exact location of errors with line numbers, so you can fix malformed JSON quickly before using it in your code.',
      ['json validator', 'validate json', 'json lint', 'json syntax checker', 'json error']),
    P('to-yaml.html', 'JSON to YAML Converter — mdothree',
      'Convert JSON objects into clean, readable YAML in your browser. Paste your JSON, review the YAML output, and copy it or download it as a .yaml file.',
      ['json to yaml', 'yaml converter', 'convert json', 'yaml', 'json yaml']),
    P('to-csv.html', 'JSON to CSV Converter — mdothree',
      'Flatten JSON arrays of objects into CSV format with your choice of delimiter, then download the result as a .csv file ready for any spreadsheet app.',
      ['json to csv', 'csv converter', 'json array to csv', 'export csv', 'flatten json']),
    P('to-xml.html', 'JSON to XML Converter — mdothree',
      'Convert JSON into valid XML with a configurable root element name. Review the output in your browser, then copy it or download it as an .xml file.',
      ['json to xml', 'xml converter', 'convert json to xml', 'xml', 'root element']),
    P('to-typescript.html', 'JSON to TypeScript Interfaces — mdothree',
      'Generate TypeScript interfaces from sample JSON data, with optional or required fields, and download the generated types as a .ts file for your project.',
      ['json to typescript', 'typescript interface generator', 'json to ts', 'types from json', 'typescript']),
    P('json-diff.html', 'JSON Diff: Compare Two JSON Objects — mdothree',
      'Compare two JSON objects and highlight the values that were added, removed, or changed, making it easy to spot the differences between two versions.',
      ['json diff', 'compare json', 'json compare', 'json difference', 'diff tool']),
    P('base64.html', 'Base64 to JSON Encoder & Decoder — mdothree',
      'Encode JSON to a Base64 string or decode Base64 back into formatted, readable JSON. Useful for inspecting API payloads, tokens, and config values.',
      ['base64 to json', 'json to base64', 'base64 decode', 'base64 encode', 'decode payload']),
    P('json-path.html', 'JSONPath Query Tester — mdothree',
      'Query JSON data with JSONPath expressions, including filters, wildcards, recursive descent, and array slices, and see the matching results instantly.',
      ['jsonpath', 'jsonpath tester', 'json query', 'jsonpath expression', 'json filter']),
    pricing('JSON Tools'), account('JSON Tools'), notfound('JSON Tools'),
  ]),
  dict(dir='mdothree-text', domain='text.mdothree.com', name='Text Tools', short='Text Tools', glyph='TXT',
       tagline='Count, convert, compare and clean up text', category='UtilitiesApplication', pages=[
    P('index.html', 'Text Tools: Word Counter, Diff & More — mdothree',
      'Free text utilities in your browser: word counter, case converter, text diff, find and replace, line sorter, URL extractor, and lorem ipsum generator.',
      ['text tools', 'word counter', 'case converter', 'text diff', 'find and replace', 'lorem ipsum']),
    P('word-counter.html', 'Word Counter — mdothree',
      'Count words, characters, sentences, and paragraphs and estimate reading time, with real-time stats and a top word frequency list as you type or paste.',
      ['word counter', 'character counter', 'reading time', 'sentence counter', 'word frequency']),
    P('lorem-ipsum.html', 'Lorem Ipsum Generator — mdothree',
      'Generate lorem ipsum placeholder text by paragraphs, sentences, words, or bytes, with an option to wrap the output in HTML tags for mockups and layouts.',
      ['lorem ipsum generator', 'placeholder text', 'dummy text', 'filler text', 'lorem ipsum html']),
    P('case-converter.html', 'Case Converter — mdothree',
      'Convert text to UPPER, lower, Title, or Sentence case, or to camelCase, snake_case, kebab-case, and other programming styles, instantly in your browser.',
      ['case converter', 'uppercase', 'lowercase', 'title case', 'camelcase', 'snake_case', 'kebab-case']),
    P('text-diff.html', 'Text Diff Checker — mdothree',
      'Compare two blocks of text and highlight the differences at the character, word, or line level, with a live diff that updates as you edit either side.',
      ['text diff', 'diff checker', 'compare text', 'text compare', 'difference checker']),
    P('find-replace.html', 'Find and Replace Text — mdothree',
      'Find and replace text online with regular expression support, case-sensitive matching, and whole-word mode, all processed locally in your browser.',
      ['find and replace', 'regex replace', 'text replace', 'search and replace', 'regular expression']),
    P('line-sorter.html', 'Line Sorter & Deduplicator — mdothree',
      'Sort, deduplicate, shuffle, number, trim, and transform lines of text in one place. Handy for cleaning up lists, logs, and exported data in your browser.',
      ['line sorter', 'sort lines', 'remove duplicate lines', 'shuffle lines', 'alphabetize list']),
    P('extract-urls.html', 'Extract URLs from Text — mdothree',
      'Extract every URL and link from any block of plain text, HTML, or Markdown, and get a clean list you can copy for audits, research, or link checks.',
      ['extract urls', 'url extractor', 'link extractor', 'find links in text', 'extract links']),
    pricing('Text Tools'), account('Text Tools'), notfound('Text Tools'),
  ]),
  dict(dir='mdothree-pdf', domain='pdf.mdothree.com', name='PDF Tools', short='PDF Tools', glyph='PDF',
       tagline='Merge, split, compress and convert PDFs', category='UtilitiesApplication', pages=[
    P('index.html', 'PDF Tools: Merge, Split & Compress — mdothree',
      'Free PDF tools to merge, split, and compress PDFs, convert pages to images, and extract text. Processing is client-side, so files never leave your browser.',
      ['pdf tools', 'merge pdf', 'split pdf', 'compress pdf', 'pdf to jpg', 'extract text from pdf']),
    P('merge.html', 'Merge PDF Files — mdothree',
      'Combine multiple PDF files into a single document right in your browser. Drag files to reorder them before merging. Free for up to 3 files at a time.',
      ['merge pdf', 'combine pdf', 'join pdf files', 'pdf merger', 'merge pdf online']),
    P('split.html', 'Split PDF — mdothree',
      'Split a PDF by page range, extract specific pages, or save every page as a separate file. Processing happens in your browser with no file upload.',
      ['split pdf', 'extract pdf pages', 'pdf splitter', 'separate pdf pages', 'page range']),
    P('compress.html', 'Compress PDF — mdothree',
      'Reduce PDF file size with adjustable quality settings and optional metadata removal, all in your browser. Free for PDF files up to 10MB in size.',
      ['compress pdf', 'reduce pdf size', 'pdf compressor', 'shrink pdf', 'remove pdf metadata']),
    P('pdf-to-images.html', 'PDF to JPG & PNG Converter — mdothree',
      'Convert PDF pages to JPG or PNG images with your choice of DPI and quality, and preview each page instantly before downloading the images.',
      ['pdf to jpg', 'pdf to png', 'pdf to image', 'convert pdf pages', 'pdf dpi']),
    P('images-to-pdf.html', 'Images to PDF Converter — mdothree',
      'Combine JPG, PNG, or WebP images into a single PDF document in your browser. Drag the images to reorder pages before you create the final file.',
      ['images to pdf', 'jpg to pdf', 'png to pdf', 'webp to pdf', 'photo to pdf']),
    P('extract-text.html', 'Extract Text from PDF — mdothree',
      'Extract all of the text from a PDF and copy it to your clipboard or download it as a .txt file. No upload is needed, since extraction runs in your browser.',
      ['extract text from pdf', 'pdf to text', 'pdf text extractor', 'copy text from pdf', 'pdf to txt']),
    pricing('PDF Tools'), account('PDF Tools'), notfound('PDF Tools'),
  ]),
  dict(dir='mdothree-image', domain='image.mdothree.com', name='Image Tools', short='Image Tools', glyph='IMG',
       tagline='Resize, convert, compress and crop images', category='MultimediaApplication', pages=[
    P('index.html', 'Image Tools: Resize, Convert & Compress — mdothree',
      'Free image tools that run in your browser: resize, convert, compress, crop, rotate and flip images, and remove solid-color backgrounds from pictures.',
      ['image tools', 'resize image', 'convert image', 'compress image', 'crop image', 'remove background']),
    P('resize.html', 'Resize Image — mdothree',
      'Resize images by percentage or to exact pixel dimensions with a live preview. Supports JPG, PNG, and WebP, and all processing happens in your browser.',
      ['resize image', 'image resizer', 'resize photo', 'scale image', 'change image size']),
    P('convert.html', 'Convert Images: JPG, PNG, WebP — mdothree',
      'Convert images between JPG, PNG, and WebP formats, and batch convert several images at once. Conversion runs locally in your browser, with no upload.',
      ['image converter', 'png to jpg', 'jpg to png', 'webp converter', 'batch convert images']),
    P('compress.html', 'Compress Image — mdothree',
      'Reduce image file size with a live quality preview and output to JPG, PNG, or WebP. Find the right balance between quality and size before you download.',
      ['compress image', 'image compressor', 'reduce image size', 'optimize image', 'compress jpg']),
    P('crop.html', 'Crop Image — mdothree',
      'Drag to crop images with aspect ratio presets such as square, 16:9, and 4:3. Cropping runs in your browser, so your photos are never uploaded anywhere.',
      ['crop image', 'image cropper', 'crop photo', 'aspect ratio', 'square crop']),
    P('rotate.html', 'Rotate & Flip Image — mdothree',
      'Rotate images by any angle or flip them horizontally and vertically, with transparent background support for rotated corners, right in your browser.',
      ['rotate image', 'flip image', 'mirror image', 'rotate photo', 'image rotation']),
    P('remove-bg.html', 'Remove Image Background — mdothree',
      'Remove solid-color backgrounds from images using tolerance-based flood fill to get a transparent background, with all processing done in your browser.',
      ['remove background', 'background remover', 'transparent background', 'remove white background', 'flood fill']),
    pricing('Image Tools'), account('Image Tools'), notfound('Image Tools'),
  ]),
  dict(dir='mdothree-qr', domain='qr.mdothree.com', name='QR Code Tools', short='QR Tools', glyph='QR',
       tagline='Generate, scan and batch-create QR codes', category='UtilitiesApplication', pages=[
    P('index.html', 'QR Code Generator & Scanner — mdothree',
      'Generate and decode QR codes for URLs, WiFi networks, vCards, email, and SMS, with custom colors and bulk generation, all from one set of browser tools.',
      ['qr code generator', 'qr code scanner', 'wifi qr code', 'vcard qr', 'bulk qr codes']),
    P('generate.html', 'QR Code Generator — mdothree',
      'Create custom QR codes for URLs, WiFi networks, contacts, email, and SMS messages, then download them as PNG or SVG files for print or the web.',
      ['qr code generator', 'create qr code', 'qr code svg', 'wifi qr code', 'custom qr code']),
    P('scan.html', 'Scan QR Code from Image — mdothree',
      'Upload an image to decode any QR code it contains. The scanner detects URLs, WiFi credentials, vCards, and other content types and shows the result.',
      ['qr code scanner', 'scan qr code', 'qr code reader', 'decode qr', 'qr from image']),
    P('batch.html', 'Batch QR Code Generator — mdothree',
      'Generate multiple QR codes from a list of URLs or text, and download them all together as a single ZIP file, ready for printing labels or sharing.',
      ['batch qr code generator', 'bulk qr codes', 'qr code zip', 'multiple qr codes', 'qr code list']),
    pricing('QR Code Tools'), account('QR Code Tools'), notfound('QR Code Tools'),
  ]),
]

ORG = {"@type": "Organization", "@id": "https://mdothree.com/#org", "name": BRAND,
       "url": "https://mdothree.com/", "logo": "https://mdothree.com/icon-512.png",
       "parentOrganization": {"@type": "Organization", "name": "MDO3D", "url": "https://mdo3d.com"}}

# ---------------------------------------------------------------------------
def esc(s):
    return html.escape(s, quote=True)

def page_url(site, file):
    base = f"https://{site['domain']}/"
    if file == 'index.html':
        return base
    return base + file[:-5]

def jsonld(site, p, url):
    graph = []
    if p['file'] == 'index.html':
        graph.append({"@type": "WebSite", "@id": f"https://{site['domain']}/#website", "name":
                      BRAND if site.get('home') else f"{BRAND} {site['name']}",
                      "url": f"https://{site['domain']}/", "publisher": {"@id": ORG['@id']}})
        if site.get('home'):
            graph.append(ORG)
    if p['app']:
        graph.append({"@type": "WebApplication", "name": p['title'].split(' — ')[0], "url": url,
                      "description": p['desc'], "applicationCategory": site['category'],
                      "operatingSystem": "Any (web browser)", "browserRequirements": "Requires JavaScript",
                      "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
                      "publisher": {"@type": "Organization", "name": BRAND, "url": "https://mdothree.com/"}})
    elif p['file'] != 'index.html':
        graph.append({"@type": "WebPage", "name": p['title'], "url": url, "description": p['desc'],
                      "isPartOf": {"@type": "WebSite", "name": BRAND, "url": f"https://{site['domain']}/"}})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)

def head_block(site, p):
    url = page_url(site, p['file'])
    img = f"https://{site['domain']}/og-image.png"
    alt = f"{site['name']} by {BRAND}" if not site.get('home') else f"{BRAND}: simple tools for everyday tasks"
    t, d = esc(p['title']), esc(p['desc'])
    L = [
        '<meta charset="UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        f'<title>{t}</title>',
        f'<meta name="description" content="{d}" />',
        f'<meta name="keywords" content="{esc(", ".join(p["kw"]))}" />',
        f'<meta name="robots" content="{"noindex" if p["noindex"] else "index, follow"}" />',
    ]
    if p['canonical']:
        L.append(f'<link rel="canonical" href="{url}" />')
    L += [
        '<meta property="og:type" content="website" />',
        f'<meta property="og:site_name" content="{BRAND}" />',
        f'<meta property="og:title" content="{t}" />',
        f'<meta property="og:description" content="{d}" />',
    ]
    if p['canonical']:
        L.append(f'<meta property="og:url" content="{url}" />')
    L += [
        f'<meta property="og:image" content="{img}" />',
        '<meta property="og:image:type" content="image/png" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:image:alt" content="{esc(alt)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{t}" />',
        f'<meta name="twitter:description" content="{d}" />',
        f'<meta name="twitter:image" content="{img}" />',
        f'<meta name="twitter:image:alt" content="{esc(alt)}" />',
        f'<meta name="theme-color" content="{GREEN}" />',
        '<link rel="icon" href="/favicon.ico" sizes="32x32" />',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
        '<link rel="manifest" href="/site.webmanifest" />',
    ]
    if p['canonical']:  # no structured data on the 404 page (served at arbitrary URLs)
        L.append(f'<script type="application/ld+json">{jsonld(site, p, url)}</script>')
    return '<!-- SEO: generated by projects/mdothree/landing/scripts/seo/build_seo.py -->\n  ' + \
           '\n  '.join(L) + '\n  <!-- /SEO -->'

STRIP = [
    r'<!-- SEO: generated.*?<!-- /SEO -->',
    r'<title>.*?</title>',
    r'<meta\s+charset[^>]*>',
    r'<meta\b[^>]*\bname\s*=\s*"(?:viewport|description|keywords|theme-color|robots|twitter:[^"]+)"[^>]*>',
    r'<meta\b[^>]*\bproperty\s*=\s*"og:[^"]+"[^>]*>',
    r'<link\b[^>]*\brel\s*=\s*"(?:canonical|manifest|icon|shortcut icon|apple-touch-icon|mask-icon)"[^>]*>',
    r'<script\s+type="application/ld\+json">.*?</script>',
    r'<!--\s*(?:Open Graph|Twitter Card|Twitter|PWA|SEO|Primary Meta Tags?|Favicon|Icons?)\s*-->',
]

WORDMARK = 'mdo<span class="dot">three</span>'
LOGO_SUBS = [
    (r'm<span class="dot">\.</span>three', WORDMARK),
    (r'm<span class="dot">\.</span>3', WORDMARK),
    (r'm<span>\.</span>3', WORDMARK),
]

def rewrite_html(site, p, path):
    s = open(path, encoding='utf-8').read()
    m = re.search(r'<head[^>]*>(.*?)</head>', s, re.S | re.I)
    head = m.group(1)
    for pat in STRIP:
        head = re.sub(pat, '', head, flags=re.S | re.I)
    head = re.sub(r'\n[ \t]*(?=\n)', '', head)          # drop now-empty lines
    head = re.sub(r'^[ \t]*\n', '', head)
    head = '\n  ' + head_block(site, p) + '\n' + head.rstrip() + '\n'
    s = s[:m.start(1)] + head + s[m.end(1):]
    s = re.sub(r'<html(?![^>]*\blang=)', '<html lang="en"', s, count=1)
    for a, b in LOGO_SUBS:
        s = re.sub(a, b, s)
    tool_slug = site['domain'].split('.')[0]
    suffix = f' <span style="color:var(--slate-500);margin-left:8px;font-size:0.7rem;">/ {tool_slug}</span>'
    s = re.sub(r'(class="nav-logo">)(?:JSON Tools|Text Tools|Tools)(</a>)', r'\g<1>' + WORDMARK + suffix + r'\g<2>', s)
    if site.get('home'):
        s = s.replace('<h1>MDOThree</h1>', '<h1>mdothree</h1>')
    open(path, 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------------------
def glyph_svg_text(glyph, cx, baseline_y, tile):
    n = len(glyph)
    fs = min(0.56 * tile, 1.12 * tile / max(n, 1))
    return (f'<text x="{cx}" y="{baseline_y}" text-anchor="middle" font-family="JetBrains Mono" '
            f'font-weight="800" font-size="{fs:.1f}" fill="{GREEN}">{esc(glyph)}</text>'), fs

def icon_svg(site, size=512):
    r = size * 0.2
    txt, fs = glyph_svg_text(site['glyph'], size / 2, 0, size)
    y = size / 2 + fs * 0.36
    txt = txt.replace(' y="0"', f' y="{y:.1f}"')
    if site['glyph'] == '***':
        txt = txt.replace(f' y="{y:.1f}"', f' y="{y + fs * 0.25:.1f}"')
    if site['glyph'] == 'm3':
        txt = (f'<text x="{size/2}" y="{y:.1f}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" '
               f'font-size="{fs:.1f}"><tspan fill="#FFFFFF">m</tspan><tspan fill="{GREEN}">3</tspan></text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">\n'
            f'  <!-- mdothree icon: {esc(site["name"])}. Source; rendered by landing/scripts/seo/build_seo.py -->\n'
            f'  <rect width="{size}" height="{size}" rx="{r:.0f}" fill="{BG}"/>\n  {txt}\n</svg>\n')

def og_svg(site):
    W, H = 1200, 630
    tile, tx, ty = 168, 80, 214
    txt, fs = glyph_svg_text(site['glyph'], tx + tile / 2, 0, tile)
    gy = ty + tile / 2 + fs * 0.36 + (fs * 0.25 if site['glyph'] == '***' else 0)
    txt = txt.replace(' y="0"', f' y="{gy:.1f}"')
    if site['glyph'] == 'm3':
        txt = (f'<text x="{tx + tile/2}" y="{gy:.1f}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" '
               f'font-size="{fs:.1f}"><tspan fill="#FFFFFF">m</tspan><tspan fill="{GREEN}">3</tspan></text>')
    name = site['name']
    name_fs = 76 if len(name) <= 16 else 66
    lines = [f'<text x="292" y="292" font-family="Inter" font-weight="800" font-size="{name_fs}" fill="#F8FAFC" letter-spacing="-1.5">{esc(name)}</text>',
             f'<text x="294" y="350" font-family="Inter" font-weight="500" font-size="32" fill="#94A3B8">{esc(site["tagline"])}</text>']
    if site.get('tagline2'):
        lines.append(f'<text x="80" y="470" font-family="Inter" font-weight="600" font-size="28" fill="#CBD5E1">{esc(site["tagline2"])}</text>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <!-- mdothree share image template: {esc(name)}. Rendered to public/og-image.png by landing/scripts/seo/build_seo.py -->
  <defs>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8">
      <stop offset="0" stop-color="{GREEN}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="{GREEN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="{BG}"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="{W}" height="8" fill="{GREEN}"/>
  <text x="80" y="128" font-family="Inter" font-weight="800" font-size="46" letter-spacing="-1"><tspan fill="#FFFFFF">mdo</tspan><tspan fill="{GREEN}">three</tspan></text>
  <rect x="{tx}" y="{ty}" width="{tile}" height="{tile}" rx="34" fill="#1E293B" stroke="{GREEN}" stroke-width="3"/>
  {txt}
  {chr(10).join("  " + l for l in lines).strip()}
  <line x1="80" y1="520" x2="1120" y2="520" stroke="#334155" stroke-width="2"/>
  <text x="80" y="570" font-family="JetBrains Mono" font-weight="600" font-size="30" fill="{GREEN}">{esc(site["domain"])}</text>
  <text x="1120" y="570" text-anchor="end" font-family="Inter" font-weight="500" font-size="26" fill="#64748B">Simple tools for everyday tasks</text>
</svg>
'''

def run(cmd):
    subprocess.run(cmd, check=True)

def build_assets(site, sdir, pub):
    bdir = os.path.join(sdir, 'brand')
    os.makedirs(bdir, exist_ok=True)
    og, ic = os.path.join(bdir, 'og-image.svg'), os.path.join(bdir, 'icon.svg')
    open(og, 'w').write(og_svg(site))
    open(ic, 'w').write(icon_svg(site))
    run(['rsvg-convert', '-w', '1200', '-h', '630', og, '-o', os.path.join(pub, 'og-image.png')])
    for n, size in (('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)):
        run(['rsvg-convert', '-w', str(size), '-h', str(size), ic, '-o', os.path.join(pub, n)])
    # favicon.svg: 32-unit viewBox copy of the icon
    fav = icon_svg(site, 32).replace('width="32" height="32" ', '')
    open(os.path.join(pub, 'favicon.svg'), 'w').write(fav)
    tmp16, tmp32 = os.path.join(bdir, '.f16.png'), os.path.join(bdir, '.f32.png')
    run(['rsvg-convert', '-w', '16', '-h', '16', ic, '-o', tmp16])
    run(['rsvg-convert', '-w', '32', '-h', '32', ic, '-o', tmp32])
    run(['magick', tmp16, tmp32, os.path.join(pub, 'favicon.ico')])
    os.remove(tmp16); os.remove(tmp32)
    for n in ('og-image.jpg',):  # superseded share image
        f = os.path.join(pub, n)
        if os.path.exists(f):
            os.remove(f)

def build_manifest(site, pub):
    m = {
        "name": BRAND if site.get('home') else f"{BRAND} {site['name']}",
        "short_name": site['short'],
        "description": site['pages'][0]['desc'],
        "start_url": "/", "scope": "/", "display": "standalone",
        "background_color": BG, "theme_color": GREEN,
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            {"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml"},
        ],
    }
    old = os.path.join(pub, 'manifest.json')
    if os.path.exists(old):  # keep any extra keys (shortcuts, categories) from the old manifest
        try:
            prev = json.load(open(old))
            for k, v in prev.items():
                if k not in m and k not in ('icons',):
                    m[k] = v
        except Exception:
            pass
    txt = json.dumps(m, indent=2, ensure_ascii=False) + '\n'
    open(os.path.join(pub, 'site.webmanifest'), 'w').write(txt)
    open(old, 'w').write(txt)  # legacy path, still precached by older service workers

def build_sitemap(site, pub):
    urls = [page_url(site, p['file']) for p in site['pages'] if not p['noindex']]
    body = '\n'.join(f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n  </url>' for u in urls)
    open(os.path.join(pub, 'sitemap.xml'), 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + body + '\n</urlset>\n')

def check_robots(site, pub):
    f = os.path.join(pub, 'robots.txt')
    want = f"Sitemap: https://{site['domain']}/sitemap.xml"
    s = open(f).read() if os.path.exists(f) else 'User-agent: *\nAllow: /\n'
    s = re.sub(r'(?im)^Sitemap:.*\n?', '', s).rstrip() + '\n\n' + want + '\n'
    open(f, 'w').write(s)

def validate(site):
    for p in site['pages']:
        assert len(p['title']) <= 60, (site['dir'], p['file'], len(p['title']), p['title'])
        assert 120 <= len(p['desc']) <= 160, (site['dir'], p['file'], len(p['desc']), p['desc'])
        assert 5 <= len(p['kw']) <= 10, (site['dir'], p['file'])
    titles = [p['title'] for p in site['pages']]
    descs = [p['desc'] for p in site['pages']]
    assert len(set(titles)) == len(titles) and len(set(descs)) == len(descs), site['dir']

def main():
    only = sys.argv[1:]
    for site in SITES:
        if only and site['dir'] not in only:
            continue
        validate(site)
        sdir = os.path.join(MDO, site['dir'])
        pub = os.path.join(sdir, 'public')
        files = sorted(f for f in os.listdir(pub) if f.endswith('.html'))
        known = {p['file'] for p in site['pages']}
        missing = set(files) - known
        assert not missing, f"{site['dir']}: no metadata for {missing}"
        for p in site['pages']:
            rewrite_html(site, p, os.path.join(pub, p['file']))
        build_assets(site, sdir, pub)
        build_manifest(site, pub)
        build_sitemap(site, pub)
        check_robots(site, pub)
        print('ok', site['dir'], len(site['pages']), 'pages')

if __name__ == '__main__':
    main()
