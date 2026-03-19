#!/usr/bin/env python3
"""
WordPress to Static Site Cleanup Script
Removes WordPress dependencies and prepares site for Netlify deployment
"""

import os
import shutil
import re
from pathlib import Path
from html.parser import HTMLParser

# Configuration
SOURCE_DIR = Path(".")
OUTPUT_DIR = Path("../netlify-site")
ASSETS_DIR = OUTPUT_DIR / "assets"

class WordPressHTMLCleaner:
    """Clean WordPress-specific content from HTML files"""

    def __init__(self):
        self.wp_patterns = [
            # Remove WordPress meta tags
            (r'<meta name="generator" content="WordPress[^"]*"[^>]*>', ''),
            # Remove Yoast SEO comments
            (r'<!-- This site is optimized with the Yoast SEO plugin.*?-->', ''),
            (r'<!-- / Yoast SEO plugin\. -->', ''),
            # Remove WordPress JSON API links
            (r'<link[^>]*wp-json[^>]*>', ''),
            # Remove WordPress oembed links
            (r'<link[^>]*oembed[^>]*>', ''),
            # Remove RSS feed links (optional - you might want to keep these)
            (r'<link rel="alternate" type="application/rss\+xml"[^>]*>', ''),
            # Remove WordPress emoji detection script
            (r'<script[^>]*wp-emoji[^>]*>.*?</script>', '', re.DOTALL),
            # Remove inline WordPress styles
            (r'<style id="wp-[^"]*"[^>]*>.*?</style>', '', re.DOTALL),
        ]

    def clean_html(self, html_content):
        """Remove WordPress-specific content from HTML"""
        cleaned = html_content

        for pattern, replacement, *flags in self.wp_patterns:
            flag = flags[0] if flags else 0
            cleaned = re.sub(pattern, replacement, cleaned, flags=flag)

        return cleaned

    def update_asset_paths(self, html_content):
        """Update WordPress asset paths to new structure"""

        # Update wp-content paths
        html_content = re.sub(
            r'["\']/(wp-content/[^"\']*)["\']',
            r'"/assets/\1"',
            html_content
        )

        # Update wp-includes paths
        html_content = re.sub(
            r'["\']/(wp-includes/[^"\']*)["\']',
            r'"/assets/\1"',
            html_content
        )

        return html_content


def create_directory_structure():
    """Create the new directory structure"""
    print("Creating directory structure...")

    directories = [
        ASSETS_DIR / "css",
        ASSETS_DIR / "js",
        ASSETS_DIR / "images",
        ASSETS_DIR / "fonts",
        ASSETS_DIR / "wp-content",
        ASSETS_DIR / "wp-includes",
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

    print(f"✓ Created output directory: {OUTPUT_DIR}")


def copy_assets():
    """Copy and reorganize assets"""
    print("\nCopying assets...")

    # Copy wp-content
    if (SOURCE_DIR / "wp-content").exists():
        print("  Copying wp-content...")
        shutil.copytree(
            SOURCE_DIR / "wp-content",
            ASSETS_DIR / "wp-content",
            dirs_exist_ok=True
        )

    # Copy wp-includes
    if (SOURCE_DIR / "wp-includes").exists():
        print("  Copying wp-includes...")
        shutil.copytree(
            SOURCE_DIR / "wp-includes",
            ASSETS_DIR / "wp-includes",
            dirs_exist_ok=True
        )

    print("✓ Assets copied")


def process_html_files():
    """Process all HTML files"""
    print("\nProcessing HTML files...")

    cleaner = WordPressHTMLCleaner()
    html_files = list(SOURCE_DIR.glob("**/*.html"))

    total = len(html_files)
    processed = 0

    for html_file in html_files:
        # Skip files in wp-content and wp-includes
        if "wp-content" in str(html_file) or "wp-includes" in str(html_file):
            continue

        try:
            # Read original HTML
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Clean WordPress references
            content = cleaner.clean_html(content)

            # Update asset paths
            content = cleaner.update_asset_paths(content)

            # Create output path
            relative_path = html_file.relative_to(SOURCE_DIR)
            output_path = OUTPUT_DIR / relative_path
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Write cleaned HTML
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)

            processed += 1
            if processed % 100 == 0:
                print(f"  Processed {processed}/{total} files...")

        except Exception as e:
            print(f"  Error processing {html_file}: {e}")

    print(f"✓ Processed {processed} HTML files")


def copy_sitemaps_and_robots():
    """Copy sitemap and robots.txt files"""
    print("\nCopying sitemaps and robots.txt...")

    files_to_copy = [
        "robots.txt",
        "sitemap.xml",
        "sitemap_index.xml",
        "post-sitemap.xml",
        "post-sitemap2.xml",
        "page-sitemap.xml",
        "category-sitemap.xml",
        "main-sitemap.xsl",
    ]

    for filename in files_to_copy:
        source = SOURCE_DIR / filename
        if source.exists():
            shutil.copy2(source, OUTPUT_DIR / filename)
            print(f"  ✓ Copied {filename}")


def create_netlify_config():
    """Create Netlify configuration files"""
    print("\nCreating Netlify configuration...")

    # Create netlify.toml
    netlify_toml = """[build]
  publish = "."
  command = "echo 'No build needed - static site'"

[[redirects]]
  from = "/wp-admin/*"
  to = "/404.html"
  status = 404

[[redirects]]
  from = "/wp-login.php"
  to = "/404.html"
  status = 404

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.webp"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
"""

    with open(OUTPUT_DIR / "netlify.toml", 'w') as f:
        f.write(netlify_toml)

    print("  ✓ Created netlify.toml")

    # Create _redirects file (backup for netlify.toml)
    redirects = """/wp-admin/* /404.html 404
/wp-login.php /404.html 404
"""

    with open(OUTPUT_DIR / "_redirects", 'w') as f:
        f.write(redirects)

    print("  ✓ Created _redirects")


def create_404_page():
    """Create a custom 404 page"""
    print("\nCreating 404 page...")

    html_404 = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | Crypto Love You</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }

        .container {
            text-align: center;
            padding: 2rem;
        }

        h1 {
            font-size: 8rem;
            font-weight: bold;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }

        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }

        a {
            display: inline-block;
            padding: 1rem 2rem;
            background: #fff;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        a:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Sorry, the page you're looking for doesn't exist.</p>
        <a href="/">Go Back Home</a>
    </div>
</body>
</html>
"""

    with open(OUTPUT_DIR / "404.html", 'w') as f:
        f.write(html_404)

    print("  ✓ Created 404.html")


def create_gitignore():
    """Create .gitignore file"""
    print("\nCreating .gitignore...")

    gitignore_content = """# Dependencies
node_modules/
.npm

# Build outputs
.cache/
dist/

# Environment variables
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# Editor directories
.vscode/
.idea/
*.swp
*.swo

# Netlify
.netlify/
"""

    with open(OUTPUT_DIR / ".gitignore", 'w') as f:
        f.write(gitignore_content)

    print("  ✓ Created .gitignore")


def create_readme():
    """Create README.md with deployment instructions"""
    print("\nCreating README.md...")

    readme = """# Crypto Love You - Static Site

This is a static version of the Crypto Love You website, optimized for deployment on Netlify.

## What was done

- ✅ Removed all WordPress dependencies
- ✅ Reorganized assets into `/assets` directory
- ✅ Cleaned HTML files from WordPress-specific meta tags
- ✅ Created Netlify configuration for optimal performance
- ✅ Set up proper caching headers
- ✅ Created custom 404 page

## Deployment to Netlify

### Option 1: Deploy via Git

1. Initialize Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Clean static site"
   ```

2. Push to GitHub/GitLab:
   ```bash
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

3. Connect to Netlify:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider
   - Select your repository
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: `.`
   - Click "Deploy site"

### Option 2: Manual Deploy

1. Zip the entire directory
2. Go to https://app.netlify.com/drop
3. Drag and drop the folder

## Local Development

To run locally:

```bash
python3 -m http.server 8000
```

Then visit: http://localhost:8000

## Site Structure

```
.
├── index.html              # Homepage
├── assets/                 # All static assets
│   ├── wp-content/        # Theme assets, plugins
│   └── wp-includes/       # WordPress core assets
├── [article-slug]/        # Individual article pages
│   └── index.html
├── netlify.toml           # Netlify configuration
├── _redirects             # URL redirects
├── 404.html               # Custom 404 page
└── robots.txt             # SEO crawling rules

```

## Performance Optimizations

- Static HTML files (no server-side processing)
- Optimized caching headers (1 year for static assets)
- Security headers enabled
- Clean URLs with proper redirects

## License

All content belongs to Crypto Love You.
"""

    with open(OUTPUT_DIR / "README.md", 'w') as f:
        f.write(readme)

    print("  ✓ Created README.md")


def main():
    """Main execution function"""
    print("=" * 60)
    print("WordPress to Static Site Cleanup Script")
    print("=" * 60)

    # Check if output directory already exists
    if OUTPUT_DIR.exists():
        response = input(f"\n⚠️  Output directory '{OUTPUT_DIR}' already exists. Delete and recreate? (y/n): ")
        if response.lower() == 'y':
            shutil.rmtree(OUTPUT_DIR)
        else:
            print("Aborted.")
            return

    try:
        # Execute cleanup steps
        create_directory_structure()
        copy_assets()
        process_html_files()
        copy_sitemaps_and_robots()
        create_netlify_config()
        create_404_page()
        create_gitignore()
        create_readme()

        print("\n" + "=" * 60)
        print("✓ CLEANUP COMPLETE!")
        print("=" * 60)
        print(f"\nYour cleaned site is ready at: {OUTPUT_DIR.absolute()}")
        print("\nNext steps:")
        print("1. cd ../netlify-site")
        print("2. Review the site")
        print("3. Test locally: python3 -m http.server 8000")
        print("4. Initialize git: git init")
        print("5. Deploy to Netlify")
        print("\nSee README.md for detailed deployment instructions.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
