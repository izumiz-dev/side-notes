# Website Notes (Chrome Extension)

閲覧中のウェブサイト（ドメイン）ごとにメモを自動で整理・管理できる、Chrome サイドパネル型の Markdown メモアプリ。

Website Notes is a Chrome Extension that allows you to take markdown notes specific to the website (domain) you are currently visiting. It resides in the Chrome Side Panel, providing a seamless note-taking experience without leaving your current tab.

## Features

-   **Domain-Aware Notes:** アクティブなタブのドメインごとにメモを自動整理。
-   **URL-Specific Context:** 閲覧中の特定のURLに紐づくメモがある場合、バッジで通知。
-   **Badge Notifications:** 拡張機能アイコンにバッジを表示し、現在のページに関連するメモの存在を通知。
-   **Context Menu Integration:** 右クリックメニューから「このページのメモを開く」または「新規作成」が可能。
-   **High-Performance Editor:** CodeMirror 6 を採用した、シンタックスハイライト対応の Markdown エディタ。
-   **Live Preview:** GitHub スタイルのプレビュー表示。YAML Front Matter のテーブル表示にも対応。
-   **YAML Front Matter:** 新規メモ作成時に URL、タイトル、作成日時を自動でメタデータとして挿入。
-   **Dark/Light Mode:** システム設定に合わせたダークモード自動切替。
-   **Data Persistence:** `chrome.storage.local` を使用した自動保存（1000ms デバウンス処理付き）。
-   **Sidebar Persistence:** サイドバーの開閉状態をブラウザを閉じても保持。
-   **Export/Import:** メモ全データを JSON 形式でエクスポート・インポート可能。

## Tech Stack

-   **Framework:** React 19 + TypeScript
-   **Build Tool:** Vite + CRXJS
-   **Styling:** Tailwind CSS v4
-   **Editor:** CodeMirror 6 (`@uiw/react-codemirror`)
-   **Markdown:** `marked` + `DOMPurify` + `github-markdown-css`

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

1.  **Open the Panel:** 拡張機能アイコンをクリック、または右クリックメニューから起動。
2.  **Create a Note:** 「＋」ボタンまたは右クリックメニュー「Create Note for this Page」から作成。
3.  **Edit:** Markdown 形式で自由に記述。Front Matter は自動生成されます。
4.  **Preview:** 「Preview」ボタンでレンダリング結果を確認。
5.  **Manage:** サイドバーで現在のドメインに紐づくメモを切り替え。

## License

MIT