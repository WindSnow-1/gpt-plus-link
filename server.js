const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const CHECKOUT_ENDPOINT = 'https://chatgpt.com/backend-api/payments/checkout';

const CHECKOUT_PAYLOAD = {
  plan_name: 'chatgptplusplan',
  billing_details: {
    country: 'ID',
    currency: 'IDR',
  },
  cancel_url: 'https://chatgpt.com/#pricing',
  promo_campaign: {
    promo_campaign_id: 'plus-1-month-free',
    is_coupon_from_query_param: false,
  },
  checkout_ui_mode: 'hosted',
};

function extractAccessToken(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Try parsing as JSON first
  try {
    const json = JSON.parse(trimmed);
    if (json.accessToken) {
      return json.accessToken;
    }
  } catch (e) {
    // Not JSON, treat as raw token
  }

  // If it looks like a JWT (eyXXX...), use directly
  if (trimmed.startsWith('ey')) {
    return trimmed;
  }

  return null;
}

app.post('/api/generate', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: '请粘贴 session JSON 或 accessToken' });
    }

    const accessToken = extractAccessToken(input);

    if (!accessToken) {
      return res.status(400).json({ error: '无法识别 accessToken，请检查粘贴的内容' });
    }

    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(CHECKOUT_PAYLOAD),
    });

    const data = await response.json();

    if (data.url) {
      return res.json({ success: true, url: data.url });
    }

    const errorMessage = data.detail || JSON.stringify(data);
    return res.status(400).json({ error: `ChatGPT 返回错误: ${errorMessage}` });
  } catch (err) {
    console.error('Server error:', err.cause || err);
    return res.status(500).json({ error: `服务器错误: ${err.message}`, detail: String(err.cause || '') });
  }
});

app.listen(PORT, () => {
  console.log(`✅ 服务已启动: http://localhost:${PORT}`);
});
