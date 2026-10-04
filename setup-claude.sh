#!/bin/bash

# Claude Code setup script for zippp project
# This script configures Claude Code with GLM Flash as primary and DeepSeek as fallback

set -e

echo "Setting up Claude Code for zippp project..."

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo "Claude Code is not installed. Installing..."
    npm install -g @anthropic-ai/claude-code
fi

# Navigate to the project directory
cd /home/b0bthcdrz/dev/work/appworkz/zippp.link

# Create .claude directory if it doesn't exist
mkdir -p .claude

# Configure Claude Code settings
cat > .claude/settings.json << 'EOF'
{
  "model": "glm-4.5-flash",
  "fallbackModel": "deepseek-chat",
  "maxTurns": 10,
  "maxBudgetUsd": 5.0,
  "permissionMode": "acceptEdits",
  "allowedTools": ["Read", "Edit", "Write", "Bash"],
  "tools": ["Read", "Edit", "Write", "Bash"],
  "settings": {
    "permissions": {
      "allow": ["Read", "Edit", "Write", "Bash"],
      "ask": [],
      "deny": []
    }
  }
}
EOF

# Create project memory file
cat > .claude/CLAUDE.md << 'EOF'
# zippp bilingual landing page and app development

## Project Overview
zippp (zippp.link) turns a receipt or invoice photo into structured data: merchant, date, currency, line items, subtotal, tax, total. Shown as a table with CSV and JSON download. Phase 1 adds Google Sheets as the destination (OAuth + append).

## Architecture
- **Main lineage:** Next.js extractor app (current location)
- **Landing lineage:** docs/ + landing/ (to be implemented)
- **Backend:** Next.js with API routes
- **Authentication:** Google OAuth for Sheets access
- **Data processing:** Gemini Flash API for receipt extraction
- **Storage:** Google Sheets as system of record

## Development Setup
- **Primary model:** GLM Flash (glm-4.5-flash)
- **Fallback model:** DeepSeek (deepseek-chat)
- **Working directory:** /home/b0bthcdrz/dev/work/appworkz/zippp.link
- **Package manager:** npm
- **Framework:** Next.js

## Key Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables
Required in `.env.local`:
- `GEMINI_API_KEY` - Gemini Flash API key for receipt extraction
- `GOOGLE_CLIENT_ID` - OAuth web client id for Google Sheets
- `GOOGLE_CLIENT_SECRET` - OAuth web client secret for Google Sheets
- `GOOGLE_REDIRECT_URI` - Default: http://localhost:3000/api/auth/callback
- `TOKEN_ENCRYPTION_KEY` - AES-GCM key for refresh tokens

## Development Workflow
1. Use Claude Code with GLM Flash as primary model
2. DeepSeek as fallback when GLM is overloaded
3. Work in isolated git worktrees for features
4. Follow Next.js best practices
5. Maintain TypeScript for type safety
6. Test with real receipt images

## Code Standards
- TypeScript for all new code
- 4-space indentation
- Comprehensive error handling
- Type hints on all public functions
- Docstrings in Google style
- ESLint + TypeScript configuration

## Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── auth/          # OAuth authentication
│   │   └── sheets/        # Google Sheets integration
│   ├── components/        # React components
│   ├── lib/               # Utility libraries
│   │   ├── google/        # Google API helpers
│   │   └── extraction/    # Receipt extraction logic
│   └── globals.css        # Global styles
├── public/                # Static assets
└── ...                    # Config files
```

## Key Features
- **Receipt extraction:** Gemini Flash API for photo-to-structured-data
- **Google Sheets integration:** OAuth + append functionality
- **Bilingual support:** English and interface
- **Real-time processing:** Immediate extraction results
- **Data export:** CSV and JSON download options

## API Endpoints
- `/api/auth/login` - Google OAuth initiation
- `/api/auth/callback` - OAuth callback handler
- `/api/auth/me` - Current user status
- `/api/auth/logout` - Sign out
- `/api/sheets/connect` - Connect to Google Sheet
- `/api/sheets/disconnect` - Disconnect from Sheet
- `/api/extract` - Receipt extraction endpoint

## Testing
- Test with real receipt images
- Verify OAuth flows
- Test data mapping and export
- Ensure bilingual functionality works
- Test error handling scenarios

## Deployment
- Vercel deployment configured
- Environment variables required for production
- Google Cloud Console setup for OAuth
- API keys management in production

## Bilingual Content
See `spec/wording.md` for complete bilingual text specifications.
EOF

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Check if environment file exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local from template..."
    cp .env.example .env.local
    echo "Please edit .env.local with your API keys and credentials"
fi

echo "Claude Code setup complete!"
echo ""
echo "To start development:"
echo "  1. Edit .env.local with your API keys"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Use 'claude -p \"your task\"' for coding tasks"
echo ""
echo "Example Claude Code commands:"
echo "  claude -p \"Build the landing page with bilingual support\" --max-turns 10"
echo "  claude -w feature-branch --tmx  # Create isolated worktree with tmux session"
echo "  claude -p \"Add Google Sheets integration\" --allowedTools \"Read,Edit,Write\" --max-turns 15"