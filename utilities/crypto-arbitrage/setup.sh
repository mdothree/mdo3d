#!/bin/bash

# Crypto Arbitrage Setup Script

echo "====================================="
echo "Crypto Arbitrage Bot Setup"
echo "====================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    read -p ".env file already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy .env.example to .env
echo "Creating .env file from template..."
cp .env.example .env

echo ""
echo "✓ .env file created!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys:"
echo "   - Get Coinbase API keys from: https://www.coinbase.com/settings/api"
echo "   - Get Kraken API keys from: https://www.kraken.com/u/security/api"
echo ""
echo "2. Install dependencies:"
echo "   npm install"
echo ""
echo "3. Test in dry run mode (no API keys needed):"
echo "   npm start"
echo ""
echo "4. When ready for live trading:"
echo "   - Add your API keys to .env"
echo "   - Set DRY_RUN=false in .env"
echo "   - Start with small TRADE_AMOUNT_USD"
echo ""
echo "⚠️  WARNING: Live trading involves real money and risk!"
echo "    Always test in dry run mode first."
echo ""
