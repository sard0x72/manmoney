# Wiki source

These Markdown files are the source for the project's GitHub Wiki. They're kept in the main repo so the wiki content is versioned alongside the code.

## Page naming

GitHub Wiki turns each filename into a page title, replacing hyphens with spaces. So `Getting-Started.md` becomes the "Getting Started" page, and `[[Getting Started]]` links resolve to it. The special files `_Sidebar.md` and `_Footer.md` render on every page. `Home.md` is the landing page.

## Publishing to the GitHub Wiki

The wiki is a separate git repository (`<repo>.wiki.git`) that only exists once the wiki has been initialized. To publish:

1. On GitHub, open the repo's **Wiki** tab and click **Create the first page** (save anything — it just initializes the wiki repo).
2. Clone the wiki repo and copy these files into it:

   ```bash
   git clone https://github.com/sard0x72/manmoney.wiki.git
   cp wiki/*.md manmoney.wiki/
   cd manmoney.wiki
   git add .
   git commit -m "Add ManMoney wiki"
   git push
   ```

The pages will appear under the repo's Wiki tab.
