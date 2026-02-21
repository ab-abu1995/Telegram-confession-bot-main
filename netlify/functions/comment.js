const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const { messageId, comment } = JSON.parse(event.body);

    if (!messageId || !comment) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Get original message from Supabase
    const { data, error } = await supabase
      .from('messages')
      .select('user_id')
      .eq('message_id', messageId)
      .single();

    if (error || !data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Message not found' }) };
    }

    await bot.sendMessage(
      data.user_id,
      `💬 New anonymous comment:\n\n${comment}\n\n(Replies to your message)`
    );

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true }) 
    };
  } catch (error) {
    console.error('Comment error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};