const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Add validation
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'BOT_TOKEN', 'CHANNEL_ID', 'URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

exports.handler = async (event) => {
  // Add CORS headers for web access
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const { message, type, userId } = JSON.parse(event.body);
    
    if (!message || !type || !userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const messageId = Date.now().toString(36);
    const commentUrl = `${process.env.URL}/comment.html?msg=${messageId}`;

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('messages')
      .insert([{
        message_id: messageId,
        user_id: userId,
        content: message,
        message_type: type
      }]);

    if (dbError) throw dbError;

    const formattedMessage = `${getTypeEmoji(type)} Anonymous ${type}:\n\n${message}\n\n💬 [Comment anonymously](${commentUrl})`;

    await bot.sendMessage(process.env.CHANNEL_ID, formattedMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true }) 
    };
  } catch (error) {
    console.error('Forward error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};

function getTypeEmoji(type) {
  const emojis = { text: '✉️', feedback: '📝', question: '❓', suggestion: '💡' };
  return emojis[type] || '✉️';
}