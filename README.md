# Website Notes (Chrome Extension)

[日本語のドキュメントはこちら (Japanese)](./README_JA.md)

**Website Notes** is a Chrome Extension that allows you to take markdown notes specific to the website (domain) you are currently visiting. It resides in the Chrome Side Panel, providing a seamless note-taking experience without leaving your current tab.

<img width="1664" height="1186" alt="image" src="https://github.com/user-attachments/assets/27ec6c31-2cd8-4c2b-b167-10d6336e9f95" />


## Features

-   **Domain-Aware Notes:** Notes are automatically organized by the domain of the active tab. You always see the notes relevant to the site you are browsing.
-   **All Notes View:** You can switch the list to view all notes across all domains from the menu.
-   **Context Menu Integration:** Right-click on any page to quickly "Create Note for this Page" or "Open Note for this Page".
-   **Smart Notifications:** A badge on the extension icon notifies you if there are notes specifically for the current URL.
-   **Markdown Editor:** Features a high-performance editor (CodeMirror 6) with syntax highlighting.
-   **Live Preview:** Toggle preview mode to see your Markdown rendered with GitHub-like styling.
-   **Metadata Automation:** New notes automatically include the URL, title, and creation date in the YAML front matter.
-   **Auto-Save:** Your notes are saved automatically as you type.
-   **Code Copy:** Easily copy code blocks in preview mode with a single click.
-   **Customization:**
    -   **Dark/Light Mode:** Adapts to your system's color scheme.
    -   **Fonts:** Customize fonts for the editor and code blocks via the Options page.
    -   **Resizable Sidebar:** Adjust the sidebar width to your liking.
-   **Data Management:**
    -   **Export/Import:** Backup and restore all your notes as JSON via the Options page.
    -   **Download Markdown:** Download individual notes as `.md` files.

## Installation (Development)

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the extension:
    ```bash
    npm run build
    ```
4.  Load into Chrome:
    -   Open `chrome://extensions/`
    -   Enable **Developer mode** (top right).
    -   Click **Load unpacked**.
    -   Select the `dist` directory in the project folder.

## Usage

1.  **Open the Panel:** Click the extension icon or use the right-click menu ("Open Note for this Page").
2.  **Create a Note:** Click the "New Note" option in the sidebar menu or use the right-click menu.
3.  **Edit:** Write using standard Markdown syntax. Metadata is managed automatically at the top.
4.  **Preview:** Click the "Preview" button to view the rendered note.
5.  **Switch View:** Use the sidebar menu (︙) to toggle between "View Current Domain" and "View All Notes".
6.  **Settings:** Access font settings and data export/import from the sidebar menu > "Settings".

## License

MIT
