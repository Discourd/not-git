const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// public フォルダ内の静的ファイル（index.html など）を自動で配信する設定
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. ページ保存用 API
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

// 2. 作成されたサイトの表示
app.get('/sites/:siteName', (req, res) => {
  const siteName = req.params.siteName.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(DATA_DIR, `${siteName}.html`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('<h1>404 Not Found</h1>');
  }
  res.sendFile(filePath);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
