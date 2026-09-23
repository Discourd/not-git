const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ★【重要】あなたしか知らない秘密のURLパスを設定（好きな文字列に変えてOK！）
const ADMIN_PATH = '/pr';

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. 一般ユーザー用トップページ（入力フォーム）
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ぷりのウェブサイト</title>
      <style>
        body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        textarea { width: 100%; height: 150px; }
        button { padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>ぷりのウェブサイト</h1>
      <p>ここから自分だけのページを作成・公開できます。</p>
      <form id="siteForm">
        <p>
          <label>ページID（半角英数字）:</label><br>
          <input type="text" id="siteName" required placeholder="mypage">
        </p>
        <p>
          <label>HTMLコード:</label><br>
          <textarea id="htmlContent" required placeholder="<h1>こんにちは！</h1>"></textarea>
        </p>
        <button type="submit">公開する</button>
      </form>

      <script>
        document.getElementById('siteForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const siteName = document.getElementById('siteName').value;
          const htmlContent = document.getElementById('htmlContent').value;

          const res = await fetch('/api/sites/' + siteName, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: htmlContent })
          });

          if (res.ok) {
            alert('公開されました！');
            window.location.href = '/sites/' + siteName;
          } else {
            alert('エラーが発生しました。');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// 2. ページ保存 API
app.post('/api/sites/:siteName', (req, res) => {
  const siteName = req.params.siteName.replace(/[^a-zA-Z0-9_-]/g, '');
  const { html } = req.body;

  if (!siteName || !html) {
    return res.status(400).json({ error: '無効な入力です' });
  }

  const filePath = path.join(DATA_DIR, `${siteName}.html`);
  fs.writeFile(filePath, html, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: '保存失敗' });
    res.json({ success: true });
  });
});

// 3. 秘密の管理者ページ（あなただけが見られる一覧ページ）
app.get(ADMIN_PATH, (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) return res.status(500).send('エラーが発生しました');

    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    let listItems = '';
    htmlFiles.forEach(file => {
      const siteName = file.replace('.html', '');
      const filePath = path.join(DATA_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // 画面上に公開ページへのリンクと、入力されたHTMLコードを表示
      listItems += `
        <div style="border: 1px solid #ccc; margin-bottom: 20px; padding: 15px; border-radius: 8px;">
          <h3>ID: <a href="/sites/${siteName}" target="_blank">${siteName}</a></h3>
          <p><strong>入力されたHTML:</strong></p>
          <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto;">${escapeHtml(content)}</pre>
        </div>
      `;
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>管理者画面</title>
        <style>body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }</style>
      </head>
      <body>
        <h1>🔒 管理者用ページ（投稿一覧）</h1>
        <p>これまでに送信されたHTMLの一覧です。</p>
        <hr>
        ${listItems || '<p>まだ投稿はありません。</p>'}
      </body>
      </html>
    `);
  });
});

// HTMLエスケープ用関数（表示崩れ防止）
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 4. 作成されたページの表示
app.get('/sites/:siteName', (req, res) => {
  const siteName = req.params.siteName.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(DATA_DIR, `${siteName}.html`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('<h1>404 Not Found</h1><p>ページが存在しません。</p>');
  }
  res.sendFile(filePath);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
