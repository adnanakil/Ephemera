# Ephemera - Web Content Scraper

A modern web application that uses Claude AI and Firecrawl MCP server to intelligently scrape and extract content from any URL.

## Features

- Clean, modern UI built with Next.js and Tailwind CSS
- Powered by Claude AI (Anthropic)
- Uses Firecrawl MCP server for robust web scraping
- Easy deployment to Vercel
- TypeScript support

## Prerequisites

Before you begin, you'll need:

1. **Node.js** (v18 or higher)
2. **Anthropic API Key** - Get one at [https://console.anthropic.com/](https://console.anthropic.com/)
3. **Firecrawl API Key** - Already included in the project (`fc-d0ea733c310b4a689453c9d479d8a38c`)

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.local` file and add your Anthropic API key:

```bash
# Open .env.local and add your API key
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
FIRECRAWL_API_KEY=fc-d0ea733c310b4a689453c9d479d8a38c
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. User enters a URL in the web interface
2. The frontend sends the URL to the Next.js API route (`/api/scrape`)
3. The API route:
   - Initializes a connection to the Firecrawl MCP server
   - Sends a request to Claude AI with the URL and available Firecrawl tools
   - Claude uses the Firecrawl tool to scrape the URL
   - Returns the extracted content
4. The content is displayed in the UI

## Project Structure

```
Ephemera/
├── app/
│   ├── api/
│   │   └── scrape/
│   │       └── route.ts       # API endpoint for scraping
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page with UI
├── public/                    # Static assets
├── .env.local                 # Environment variables (not committed)
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore rules
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── vercel.json                # Vercel deployment configuration
```

## Deploying to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add `ANTHROPIC_API_KEY` with your key
   - Add `FIRECRAWL_API_KEY` with value `fc-d0ea733c310b4a689453c9d479d8a38c`

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `FIRECRAWL_API_KEY`: `fc-d0ea733c310b4a689453c9d479d8a38c`
6. Click "Deploy"

## MCP Server Configuration

The Firecrawl MCP server is configured in the API route with the following settings:

```javascript
{
  command: "npx",
  args: ["-y", "firecrawl-mcp"],
  env: {
    FIRECRAWL_API_KEY: "fc-d0ea733c310b4a689453c9d479d8a38c"
  }
}
```

This configuration allows Claude to use Firecrawl's web scraping capabilities through the Model Context Protocol.

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Anthropic SDK** - Claude AI integration
- **MCP SDK** - Model Context Protocol for tool integration
- **Firecrawl** - Web scraping service

## Troubleshooting

### API Key Issues

If you see "ANTHROPIC_API_KEY not configured":
- Check that `.env.local` exists and contains your API key
- Restart the development server after adding environment variables

### MCP Connection Issues

If scraping fails:
- Ensure `npx` is available in your PATH
- Check that the Firecrawl API key is correct
- Review the console logs for detailed error messages

### Deployment Issues

If deployment fails on Vercel:
- Verify environment variables are set in Vercel dashboard
- Check build logs for specific errors
- Ensure all dependencies are listed in `package.json`

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
